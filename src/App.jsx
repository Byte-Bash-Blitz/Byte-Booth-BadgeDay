import React, { useState, useEffect, useRef } from 'react';
import { Image as ImageIcon, Upload, Wand2, Star, Users } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginForm from './components/LoginForm';
import PhotoUpload from './components/PhotoUpload';
import CameraCapture from './components/CameraCapture';
import PhotoGallery from './components/PhotoGallery';
import { uploadPhotoToR2 } from './lib/cloudflare';
import { savePhotoToFirestore, getPhotosFromFirestore, subscribeToPhotoFeed } from './lib/photoService';

const LOCAL_PHOTOS_KEY = 'bb_local_photos';
const FIRESTORE_SAVE_TIMEOUT_MS = 2500;

const readLocalPhotos = () => {
  try {
    const raw = localStorage.getItem(LOCAL_PHOTOS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((photo) => ({
      ...photo,
      uploadedAt: photo.uploadedAt ? new Date(photo.uploadedAt) : new Date(),
    }));
  } catch {
    return [];
  }
};

const writeLocalPhotos = (photos) => {
  localStorage.setItem(LOCAL_PHOTOS_KEY, JSON.stringify(photos));
};

const upsertLocalPhoto = (photo) => {
  const photos = readLocalPhotos();
  const idx = photos.findIndex((p) => p.id === photo.id);
  if (idx >= 0) {
    photos[idx] = photo;
  } else {
    photos.unshift(photo);
  }
  writeLocalPhotos(photos);
};

const removeLocalPhoto = (photoId) => {
  const photos = readLocalPhotos().filter((photo) => photo.id !== photoId);
  writeLocalPhotos(photos);
};

const withTimeout = (promise, timeoutMs, label) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });

const makeLocalId = () => {
  const randomPart = globalThis.crypto?.randomUUID?.()
    || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `local-${randomPart}`;
};

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, login, isLoading: authLoading } = useAuth();
  const [isMobileViewport, setIsMobileViewport] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 640 : false);
  const [currentView, setCurrentView] = useState('gallery'); // 'upload' or 'gallery'
  const [isUploading, setIsUploading] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [liveNotification, setLiveNotification] = useState(null);
  const [showFeedPrompt, setShowFeedPrompt] = useState(false);
  const notificationTimerRef = useRef(null);
  const feedPromptTimerRef = useRef(null);
  const initialSnapshotSeenRef = useRef(false);

  const goHome = () => {
    setCurrentView('gallery');
    if (location.pathname !== '/') {
      navigate('/');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const view = new URLSearchParams(location.search).get('view');
    if (view === 'upload' || view === 'gallery') {
      setCurrentView(view);
    }
  }, [location.search]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileViewport(window.innerWidth < 640);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const showUploadNotification = (photo) => {
    if (!photo || photo.authorId === user?.id) return;

    const authorName = photo.author || 'Someone';
    const caption = photo.caption?.trim();
    const message = caption
      ? `${authorName} shared a new memory: ${caption.slice(0, 80)}${caption.length > 80 ? '…' : ''}`
      : `${authorName} shared a new Badge Day moment`;

    setLiveNotification({
      id: `${photo.id}-${Date.now()}`,
      title: 'Someone just uploaded',
      message,
    });

    if (notificationTimerRef.current) {
      clearTimeout(notificationTimerRef.current);
    }

    notificationTimerRef.current = setTimeout(() => {
      setLiveNotification(null);
    }, 4500);
  };

  const syncPhotos = (firestorePhotos) => {
    const localPhotos = readLocalPhotos();
    const merged = [...localPhotos, ...firestorePhotos].sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
    setPhotos(merged);
  };

  // Load photos on component mount
  useEffect(() => {
    console.log('[Byte Booth] App initialized. Starting realtime photo feed...');
    setIsLoading(true);

    const unsubscribe = subscribeToPhotoFeed(
      (firestorePhotos) => {
        syncPhotos(firestorePhotos);
        setIsLoading(false);
        console.log(`[Byte Booth] Realtime photo feed synced. Loaded ${firestorePhotos.length} item(s).`);
      },
      (photo) => {
        if (!initialSnapshotSeenRef.current) return;
        showUploadNotification(photo);
      },
      (error) => {
        console.error('[Byte Booth] Realtime feed failed:', error);
        setPhotos(readLocalPhotos());
        setIsLoading(false);
      }
    );

    initialSnapshotSeenRef.current = true;

    return () => {
      unsubscribe();
      if (notificationTimerRef.current) {
        clearTimeout(notificationTimerRef.current);
      }
      if (feedPromptTimerRef.current) {
        clearTimeout(feedPromptTimerRef.current);
      }
    };
  }, [user?.id]);

  const loadPhotos = async () => {
    try {
      setIsLoading(true);
      console.log('[Byte Booth] Fetching photos from Firestore...');
      const firestorePhotos = await getPhotosFromFirestore();
      syncPhotos(firestorePhotos);
      console.log(`[Byte Booth] Photo load completed. Loaded ${firestorePhotos.length} item(s).`);
    } catch (error) {
      console.error('[Byte Booth] Failed to load photos:', error);
      setPhotos(readLocalPhotos());
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0D0B14' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-amber-400 border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm onLogin={login} />;
  }

  const handlePhotoUpload = async (file, caption = '') => {
    setIsUploading(true);
    setUploadSuccess(false);
    setShowFeedPrompt(false);

    try {
      console.log('[Byte Booth] Upload started:', {
        fileName: file.name,
        size: file.size,
        type: file.type,
        hasCaption: !!caption.trim()
      });

      const uploadResult = await uploadPhotoToR2(file);
      console.log('[Byte Booth] R2 upload succeeded:', uploadResult);

      const photoData = {
        url: uploadResult.url,
        s3Key: uploadResult.s3Key,
        fileName: uploadResult.fileName,
        size: uploadResult.size,
        type: file.type,
        caption: caption.trim(),
        author: user?.username || 'Anonymous',
        authorId: user?.id || 'anonymous'
      };

      const localPhoto = {
        id: makeLocalId(),
        ...photoData,
        uploadedAt: new Date(),
        likes: 0,
        likedBy: [],
        syncStatus: 'pending'
      };

      setPhotos(prev => [localPhoto, ...prev]);
      upsertLocalPhoto(localPhoto);
      setUploadSuccess(true);
      setShowFeedPrompt(true);
      console.log('[Byte Booth] Local photo inserted immediately. Firestore sync started...');

      if (feedPromptTimerRef.current) {
        clearTimeout(feedPromptTimerRef.current);
      }

      feedPromptTimerRef.current = setTimeout(() => {
        setShowFeedPrompt(false);
      }, 6000);

      try {
        console.log('[Byte Booth] Saving photo metadata to Firestore...');
        const savedPhoto = await withTimeout(
          savePhotoToFirestore(photoData),
          FIRESTORE_SAVE_TIMEOUT_MS,
          'Firestore save'
        );

        setPhotos(prev => prev.map((photo) => (
          photo.id === localPhoto.id
            ? { ...savedPhoto, syncStatus: 'synced' }
            : photo
        )));
        removeLocalPhoto(localPhoto.id);
        console.log('[Byte Booth] Firestore save succeeded:', { id: savedPhoto.id });
      } catch (firestoreError) {
        console.warn('[Byte Booth] Firestore save failed, using local data:', firestoreError);
        const failedLocalPhoto = { ...localPhoto, syncStatus: 'local-only' };
        setPhotos(prev => prev.map((photo) => (
          photo.id === localPhoto.id ? failedLocalPhoto : photo
        )));
        upsertLocalPhoto(failedLocalPhoto);
      }

      console.log('[Byte Booth] Upload flow completed. Photo added to feed.');

      setCurrentView('gallery');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setShowFeedPrompt(false);

      setTimeout(() => {
        setUploadSuccess(false);
      }, 2000);

    } catch (error) {
      console.error('[Byte Booth] Upload failed:', error);
      alert(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCameraCapture = (file, caption = '') => {
    handlePhotoUpload(file, caption);
    navigate('/?view=gallery');
  };

  const handleCameraClose = () => {
    navigate('/?view=upload');
  };

  if (location.pathname === '/camera') {
    return (
      <CameraCapture
        onPhotoCapture={handleCameraCapture}
        onClose={handleCameraClose}
        isStandalonePage
      />
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0D0B14' }}>
      {/* Navigation */}
      <nav style={{ backgroundColor: 'rgba(20, 16, 32, 0.92)', borderBottom: '1px solid rgba(212, 175, 55, 0.3)' }}
           className="backdrop-blur-sm shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              type="button"
              onClick={goHome}
              className="flex items-center gap-3 text-left transition-opacity hover:opacity-90"
              aria-label="Go to feed landing page"
            >
              <div className="bg-gradient-to-r from-amber-500 to-yellow-400 p-2 rounded-lg"
                   style={{ boxShadow: '0 0 12px rgba(212, 175, 55, 0.4)' }}>
                <Wand2 className="w-6 h-6 text-stone-900" />
              </div>
              <div>
                <h1 className="text-xl font-bold font-display text-amber-300">
                  Byte Booth
                </h1>
                <p className="hidden sm:block text-xs" style={{ color: 'rgba(212, 175, 55, 0.6)' }}>
                  Wizarding Photo Booth
                </p>
              </div>
            </button>

            <div className="hidden sm:flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => setCurrentView('upload')}
                className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  currentView === 'upload' ? 'text-stone-900 shadow-md' : 'hover:bg-amber-900/20'
                }`}
                style={currentView === 'upload'
                  ? { background: 'linear-gradient(to right, #f59e0b, #fbbf24)', boxShadow: '0 0 10px rgba(212,175,55,0.3)' }
                  : { color: 'rgba(253, 230, 138, 0.7)' }
                }
              >
                <Upload className="w-4 h-4 flex-shrink-0" />
                <span className="hidden xs:inline sm:inline">Share</span>
              </button>
              <button
                onClick={() => setCurrentView('gallery')}
                className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  currentView === 'gallery' ? 'shadow-md' : 'hover:bg-amber-900/20'
                }`}
                style={currentView === 'gallery'
                  ? { backgroundColor: '#740001', color: '#fde68a', boxShadow: '0 0 10px rgba(116,0,1,0.4)' }
                  : { color: 'rgba(253, 230, 138, 0.7)' }
                }
              >
                <ImageIcon className="w-4 h-4 flex-shrink-0" />
                <span className="hidden xs:inline sm:inline">Feed</span>
                <span className="text-xs sm:text-sm">({photos.length})</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {isMobileViewport && (
        <button
          type="button"
          onClick={() => {
            if (currentView === 'gallery' || showFeedPrompt) {
              setCurrentView('upload');
              setShowFeedPrompt(false);
            } else {
              setCurrentView('gallery');
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full px-4 py-3 shadow-2xl transition-transform active:scale-95 sm:hidden"
          style={{ background: 'linear-gradient(to right, #f59e0b, #fbbf24)', color: '#1c1917' }}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-900/10">
            {currentView === 'gallery' || showFeedPrompt ? (
              <Upload className="h-4 w-4" />
            ) : (
              <ImageIcon className="h-4 w-4" />
            )}
          </div>
          <span className="text-sm font-bold">
            {currentView === 'gallery'
              ? 'Upload'
              : showFeedPrompt || uploadSuccess
                ? 'View Feed'
                : 'Feed'}
          </span>
        </button>
      )}

      {liveNotification && (
        <div className="fixed top-20 right-4 left-4 sm:left-auto sm:right-6 z-50 flex justify-end pointer-events-none">
          <div className="pointer-events-auto max-w-sm w-full rounded-2xl px-4 py-3 shadow-2xl backdrop-blur-md border"
               style={{ backgroundColor: 'rgba(26, 22, 40, 0.95)', borderColor: 'rgba(212, 175, 55, 0.3)' }}>
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-stone-900">
                <Star className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-amber-300">{liveNotification.title}</p>
                <p className="text-sm" style={{ color: 'rgba(212, 175, 55, 0.72)' }}>
                  {liveNotification.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLiveNotification(null)}
                className="text-xs font-semibold uppercase tracking-wide text-amber-300/70 hover:text-amber-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {uploadSuccess && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-40">
          <div className="text-stone-900 px-6 py-3 rounded-lg shadow-lg
                          flex items-center gap-2 animate-bounce font-semibold"
               style={{ background: 'linear-gradient(to right, #f59e0b, #fbbf24)', boxShadow: '0 0 20px rgba(212,175,55,0.5)' }}>
            <Star className="w-5 h-5" />
            Photo added to the Pensieve! ⚡
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {currentView === 'upload' ? (
          <PhotoUpload
            onPhotoSelect={handlePhotoUpload}
            onCameraOpen={() => navigate('/camera')}
            isUploading={isUploading}
          />
        ) : (
          <PhotoGallery
            photos={photos}
            isLoading={isLoading}
            onRefresh={loadPhotos}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 backdrop-blur-sm"
              style={{ backgroundColor: 'rgba(26, 22, 40, 0.5)', borderTop: '1px solid rgba(212, 175, 55, 0.2)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h3 className="text-lg font-semibold font-display text-amber-300 mb-2">
              Byte Bash Blitz — 4th Badge Day Celebration
            </h3>
            <p className="mb-4" style={{ color: 'rgba(212, 175, 55, 0.6)' }}>
              Celebrating our journey from Muggle to Wizard ⚡
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 text-sm"
                 style={{ color: 'rgba(212, 175, 55, 0.4)' }}>
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                Community Platform
              </span>
              <span className="hidden sm:inline">•</span>
              <span>terminal.bytebashblitz.org</span>
              <span className="hidden sm:inline">•</span>
              <span>2026 Badge Day</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
