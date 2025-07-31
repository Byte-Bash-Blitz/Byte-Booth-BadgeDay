import React, { useState, useEffect } from 'react';
import { Camera, Image as ImageIcon, Upload, Trophy, Star, Users } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginForm from './components/LoginForm';
import PhotoUpload from './components/PhotoUpload';
import CameraCapture from './components/CameraCapture';
import PhotoGallery from './components/PhotoGallery';
import { uploadPhotoToR2 } from './lib/cloudflare';
import { savePhotoToFirestore, getPhotosFromFirestore } from './lib/photoService';

function AppContent() {
  const { user, login, isLoading: authLoading } = useAuth();
  const [currentView, setCurrentView] = useState('upload'); // 'upload' or 'gallery'
  const [showCamera, setShowCamera] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load photos on component mount
  useEffect(() => {
    loadPhotos();
  }, []);

  const loadPhotos = async () => {
    try {
      setIsLoading(true);
      // Load photos from Firestore only
      const firestorePhotos = await getPhotosFromFirestore();
      setPhotos(firestorePhotos);
    } catch (error) {
      console.error('Failed to load photos:', error);
      setPhotos([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Show login if not authenticated
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-green-400 border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm onLogin={login} />;
  }

  const handlePhotoUpload = async (file, caption = '') => {
    setIsUploading(true);
    setUploadSuccess(false);

    try {
      console.log('Uploading photo:', file.name, 'with caption:', caption);
      
      // Upload to R2
      const uploadResult = await uploadPhotoToR2(file);
      
      // Save metadata to Firestore with caption
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

      let savedPhoto;
      try {
        savedPhoto = await savePhotoToFirestore(photoData);
      } catch (firestoreError) {
        console.warn('Firestore save failed, using local data:', firestoreError);
        // Fallback to local state if Firestore fails
        savedPhoto = {
          id: Date.now().toString(),
          ...photoData,
          uploadedAt: new Date(),
          likes: 0
        };
      }
      
      // Add to local state for immediate display
      setPhotos(prev => [savedPhoto, ...prev]);
      setUploadSuccess(true);
      
      // Auto-switch to gallery after successful upload
      setTimeout(() => {
        setCurrentView('gallery');
        setUploadSuccess(false);
      }, 2000);
      
    } catch (error) {
      console.error('Upload failed:', error);
      alert(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCameraCapture = (file, caption = '') => {
    setShowCamera(false);
    handlePhotoUpload(file, caption); // Camera photos now include caption
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Navigation */}
      <nav className="bg-gray-900/80 backdrop-blur-sm shadow-lg border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-green-500 to-blue-500 p-2 rounded-lg">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">
                  Byte Booth
                </h1>
                <p className="hidden sm:block text-xs text-gray-400">Photo Booth</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentView('upload')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentView === 'upload'
                    ? 'bg-green-500 text-white shadow-md'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <Upload className="w-4 h-4 inline mr-2" />
                Share
              </button>
              <button
                onClick={() => setCurrentView('gallery')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentView === 'gallery'
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <ImageIcon className="w-4 h-4 inline mr-2" />
                Feed ({photos.length})
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Success Message */}
      {uploadSuccess && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-40">
          <div className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg 
                          flex items-center gap-2 animate-bounce">
            <Star className="w-5 h-5" />
            Photo shared successfully! 🎉
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'upload' ? (
          <PhotoUpload
            onPhotoSelect={handlePhotoUpload}
            onCameraOpen={() => setShowCamera(true)}
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

      {/* Camera Modal */}
      {showCamera && (
        <CameraCapture
          onPhotoCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}

      {/* Footer */}
      <footer className="mt-16 bg-gray-900/50 backdrop-blur-sm border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-white mb-2">
              Byte Bash Blitz - 3rd Badge Day Celebration
            </h3>
            <p className="text-gray-400 mb-4">
              Celebrating our journey from Rookie to Basher 🚀
            </p>
            <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                Community Platform
              </span>
              <span>•</span>
              <span>terminal.bytebashblitz.org</span>
              <span>•</span>
              <span>2025 Badge Day</span>
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
