import React, { useState, useEffect, useCallback } from 'react';
import { Heart, Download, Clock, RefreshCw, MessageCircle, Share, Bookmark, MoreHorizontal, User, SortDesc, TrendingUp, Calendar, LogOut, Shuffle } from 'lucide-react';
import { generateDownloadUrl } from '../lib/cloudflare';
import { togglePhotoLike } from '../lib/photoService';
import { useAuth } from '../contexts/AuthContext';

const PhotoGallery = ({ photos = [], isLoading = false, onRefresh }) => {
  const [imageUrls, setImageUrls] = useState({}); // Cache for presigned view URLs
  const [userLikes, setUserLikes] = useState({}); // Track user's likes
  const [localPhotos, setLocalPhotos] = useState([]); // Local copy for optimistic updates
  const [likingPhotos, setLikingPhotos] = useState(new Set()); // Track photos being liked
  const [sortBy, setSortBy] = useState('random'); // 'random', 'recent', 'likes', 'trending'
  const [shuffleSeed, setShuffleSeed] = useState(Math.random()); // For consistent random order
  const [sharePhotoItem, setSharePhotoItem] = useState(null);
  const [shareBusy, setShareBusy] = useState(false);
  const { user, logout } = useAuth();
  const userId = user?.id || 'anonymous';

  // Mock data for development when no photos are available
  const mockPhotos = [
    {
      id: 'mock-1',
      url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600',
      fileName: 'team-celebration.jpg',
      caption: '🎉 Amazing team celebration at Badge Day! From rookie to basher - what a journey! #ByteBashBlitz #BadgeDay2026',
      uploadedAt: new Date(Date.now() - 1000 * 60 * 30),
      likes: 12,
      likedBy: ['user1', 'user2'],
      size: 245760,
      author: 'CodeMaster',
      authorId: 'codemaster'
    },
    {
      id: 'mock-2', 
      url: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=600',
      fileName: 'badge-ceremony.jpg',
      caption: 'Proud moment receiving my basher badge! 🏆 The hard work paid off!',
      uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
      likes: 8,
      likedBy: ['user3'],
      size: 189440,
      author: 'DevNinja',
      authorId: 'devninja'
    },
    {
      id: 'mock-3',
      url: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=600',
      fileName: 'community-group.jpg',
      caption: 'Best community ever! Love being part of Byte Bash Blitz 💚',
      uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 4),
      likes: 15,
      likedBy: ['user1', 'user4', 'user5'],
      size: 298752,
      author: 'TechGuru',
      authorId: 'techguru'
    }
  ];

  // Keep the gallery aligned with the latest App photo list, while preserving
  // mock data only when there are no real photos yet.
  useEffect(() => {
    if (photos.length > 0) {
      setLocalPhotos(photos);
    } else if (photos.length === 0 && localPhotos.length === 0) {
      setLocalPhotos(mockPhotos);
    }
  }, [photos, localPhotos.length]);

  // Use either local photos or mock photos, but don't constantly switch
  const displayPhotos = localPhotos.length > 0 ? localPhotos : mockPhotos;

  // Sort photos based on selected criteria
  const sortedPhotos = (() => {
    const photosCopy = [...displayPhotos];
    
    switch (sortBy) {
      case 'likes':
        return photosCopy.sort((a, b) => (b.likes || 0) - (a.likes || 0));
      case 'trending':
        // Combine likes and recency for trending (photos with likes in last 24h)
        return photosCopy.sort((a, b) => {
          const aScore = (a.likes || 0) * (Date.now() - new Date(a.uploadedAt).getTime() < 86400000 ? 2 : 1);
          const bScore = (b.likes || 0) * (Date.now() - new Date(b.uploadedAt).getTime() < 86400000 ? 2 : 1);
          return bScore - aScore;
        });
      case 'recent':
        return photosCopy.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
      case 'random':
      default:
        // Fisher-Yates shuffle algorithm for better randomization
        for (let i = photosCopy.length - 1; i > 0; i--) {
          const j = Math.floor((Math.sin(shuffleSeed * (i + 1)) + 1) * 0.5 * (i + 1));
          [photosCopy[i], photosCopy[j]] = [photosCopy[j], photosCopy[i]];
        }
        return photosCopy;
    }
  })();

  // Check if user has liked a photo (memoized to prevent flickering)
  const isLiked = useCallback((photo) => {
    // Check userLikes first (most up-to-date optimistic state)
    if (userLikes.hasOwnProperty(photo.id)) {
      return userLikes[photo.id];
    }
    // Fallback to photo's likedBy array
    return photo.likedBy?.includes(userId) || false;
  }, [userLikes, userId]);

  // Handle like functionality with optimistic updates (prevent double flickering with batched updates)
  const handleLike = useCallback(async (photo) => {
    // Prevent double-clicking
    if (likingPhotos.has(photo.id)) return;
    
    const wasLiked = isLiked(photo);
    const newLiked = !wasLiked;
    const newLikeCount = Math.max(0, (photo.likes || 0) + (newLiked ? 1 : -1));
    
    // Batch all state updates together using React.unstable_batchedUpdates equivalent (React 18+ auto-batches)
    // Add to liking set for visual feedback
    setLikingPhotos(prev => new Set([...prev, photo.id]));
    
    // Update user likes state
    setUserLikes(prev => ({
      ...prev,
      [photo.id]: newLiked
    }));

    // Update local photos state in the same render cycle
    setLocalPhotos(prevPhotos => 
      prevPhotos.map(p => {
        if (p.id === photo.id) {
          const updatedLikedBy = newLiked 
            ? [...(p.likedBy || []).filter(id => id !== userId), userId] // Ensure no duplicates
            : (p.likedBy || []).filter(id => id !== userId);
          
          return {
            ...p,
            likes: newLikeCount,
            likedBy: updatedLikedBy
          };
        }
        return p;
      })
    );
    
    // Background sync - but don't update state on success to avoid flickering
    try {
      await togglePhotoLike(photo.id, userId);
      // Success: Don't update state again - optimistic update was correct
    } catch (error) {
      console.error('Failed to sync like to server:', error);
      
      // Only revert on error - batch the reverts too
      setUserLikes(prev => ({
        ...prev,
        [photo.id]: wasLiked
      }));
      
      setLocalPhotos(prevPhotos => 
        prevPhotos.map(p => {
          if (p.id === photo.id) {
            return {
              ...p,
              likes: photo.likes || 0,
              likedBy: photo.likedBy || []
            };
          }
          return p;
        })
      );
      
      // Show subtle error feedback
      console.warn('Like sync failed, reverted to previous state');
    } finally {
      // Remove from liking set after a short delay for better UX
      setTimeout(() => {
        setLikingPhotos(prev => {
          const newSet = new Set(prev);
          newSet.delete(photo.id);
          return newSet;
        });
      }, 300);
    }
  }, [likingPhotos, userId, isLiked]);

  // Generate avatar for any user — uses HP house colours
  const getAuthorAvatar = (authorName) => {
    const colors = [
      'from-red-700 to-yellow-500',    // Gryffindor
      'from-green-800 to-slate-400',   // Slytherin
      'from-blue-900 to-blue-400',     // Ravenclaw
      'from-yellow-500 to-amber-800',  // Hufflepuff
      'from-purple-700 to-indigo-500', // Magic
      'from-rose-700 to-orange-500',   // Sunset
      'from-amber-500 to-yellow-300',  // Gold
      'from-violet-700 to-purple-500', // Violet
    ];

    const colorIndex = authorName.length % colors.length;
    return colors[colorIndex];
  };

  // Generate presigned URL for viewing if needed
  const getViewableImageUrl = async (photo) => {
    // If already cached, return it
    if (imageUrls[photo.id]) {
      return imageUrls[photo.id];
    }

    // For mock photos (unsplash), use direct URLs
    if (photo.id.startsWith('mock-')) {
      return photo.url;
    }

    // For R2 photos, generate presigned URL if we have s3Key
    if (photo.s3Key) {
      try {
        console.log('🖼️ Generating view URL for:', photo.s3Key);
        const presignedUrl = await generateDownloadUrl(photo.s3Key);
        
        // Cache the URL
        setImageUrls(prev => ({
          ...prev,
          [photo.id]: presignedUrl
        }));
        
        return presignedUrl;
      } catch (error) {
        console.error('Failed to generate view URL for:', photo.s3Key, error);
        return photo.url; // Fallback to original (might fail with CORS)
      }
    }

    // Fallback to original URL
    return photo.url;
  };

  const formatTimeAgo = (photo) => {
    // Handle different timestamp formats
    const date = photo.timestamp || photo.uploadedAt || new Date();
    const photoDate = date instanceof Date ? date : new Date(date);
    
    const now = new Date();
    const diff = now - photoDate;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days > 0) {
      return `${days}d`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return 'now';
    }
  };

  // Smart Image component that handles R2 URLs
  const SmartImage = ({ photo, className, onClick, onError }) => {
    const [imageSrc, setImageSrc] = useState(photo.id.startsWith('mock-') ? photo.url : (imageUrls[photo.id] || ''));
    const [isLoadingPresigned, setIsLoadingPresigned] = useState(false);
    const [hasError, setHasError] = useState(false);

    const loadPresignedUrl = useCallback(async () => {
      if (hasError || isLoadingPresigned) return;

      if (!photo.s3Key) {
        if (photo.url) {
          setImageSrc(photo.url);
          return;
        }

        setHasError(true);
        if (onError) onError();
        return;
      }

      try {
        setIsLoadingPresigned(true);
        console.log('🖼️ Loading presigned view URL for:', photo.s3Key);
        const presignedUrl = imageUrls[photo.id] || await generateDownloadUrl(photo.s3Key);

        setImageUrls(prev => ({
          ...prev,
          [photo.id]: presignedUrl
        }));

        setImageSrc(presignedUrl);
      } catch (error) {
        console.error('Failed to load presigned URL for viewing:', error);
        setHasError(true);
        if (onError) onError();
      } finally {
        setIsLoadingPresigned(false);
      }
    }, [hasError, isLoadingPresigned, imageUrls, photo, onError]);

    const handleImageError = () => {
      if (photo.s3Key) {
        loadPresignedUrl();
        return;
      }

      setHasError(true);
      if (onError) onError();
    };

    // Use cached presigned URL if available
    useEffect(() => {
      if (photo.id.startsWith('mock-')) {
        setImageSrc(photo.url);
        return;
      }

      if (imageUrls[photo.id] && imageSrc !== imageUrls[photo.id]) {
        setImageSrc(imageUrls[photo.id]);
        return;
      }

      if (!imageSrc && photo.s3Key) {
        loadPresignedUrl();
      }
    }, [imageUrls, imageSrc, loadPresignedUrl, photo.id, photo.s3Key, photo.url]);

    if (hasError) {
      return (
        <div className={`${className} flex items-center justify-center`}
             style={{ backgroundColor: '#12101C', color: 'rgba(212,175,55,0.5)' }}>
          <div className="text-center">
            <div className="text-4xl mb-2">📷</div>
            <p className="text-sm">Image unavailable</p>
          </div>
        </div>
      );
    }

    return (
      <div className="relative">
        <img
          src={imageSrc}
          alt={photo.fileName}
          className={className}
          onClick={onClick}
          onError={handleImageError}
          loading="lazy"
          decoding="async"
        />
        {isLoadingPresigned && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-amber-400 border-t-transparent"></div>
          </div>
        )}
      </div>
    );
  };

  const downloadPhoto = async (photo) => {
    try {
      let downloadUrl;
      
      // If photo has s3Key, generate a presigned download URL
      if (photo.s3Key) {
        console.log('📥 Generating download URL for s3Key:', photo.s3Key);
        downloadUrl = await generateDownloadUrl(photo.s3Key);
      } else if (photo.fileName) {
        // Fallback: try to generate from fileName
        console.log('📥 Generating download URL from fileName:', photo.fileName);
        downloadUrl = await generateDownloadUrl(photo.fileName);
      } else {
        // Last resort: try direct URL (will likely fail with CORS)
        console.log('⚠️ No s3Key or fileName, trying direct URL');
        downloadUrl = photo.url;
      }
      
      console.log('🔗 Using download URL:', downloadUrl);
      
      const response = await fetch(downloadUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = photo.fileName || 'photo.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('✅ Download completed successfully');
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback: try to open in new tab with presigned URL
      try {
        if (photo.s3Key) {
          const fallbackUrl = await generateDownloadUrl(photo.s3Key);
          window.open(fallbackUrl, '_blank');
        } else {
          window.open(photo.url, '_blank');
        }
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        alert('Download failed. Please try again later.');
      }
    }
  };

  const buildShareMessage = (photo, shareUrl) => {
    const caption = photo.caption?.trim();
    const title = photo.author
      ? `${photo.author} shared a Badge Day memory`
      : 'Byte Booth Badge Day memory';

    return caption
      ? `${title}\n${caption}\n\nOpen here: ${shareUrl}`
      : `${title}\n\nOpen here: ${shareUrl}`;
  };

  const copyToClipboard = async (text) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    return false;
  };

  const getShareUrl = async (photo) => {
    if (photo.s3Key) {
      return generateDownloadUrl(photo.s3Key);
    }
    return photo.url;
  };

  const shareToWhatsApp = async (photo) => {
    try {
      setShareBusy(true);
      const shareUrl = await getShareUrl(photo);
      const message = buildShareMessage(photo, shareUrl);
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('WhatsApp share failed:', error);
      alert('Could not open WhatsApp share.');
    } finally {
      setShareBusy(false);
    }
  };

  const shareToInstagram = async (photo) => {
    try {
      setShareBusy(true);
      const shareUrl = await getShareUrl(photo);
      const caption = photo.caption?.trim()
        ? `${photo.caption.trim()}\n\n${shareUrl}`
        : `${photo.author || 'Byte Booth'} on Badge Day\n\n${shareUrl}`;

      await copyToClipboard(caption);
      window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
      alert('Instagram caption and link copied. Paste it into Instagram.');
    } catch (error) {
      console.error('Instagram share failed:', error);
      alert('Could not prepare Instagram share.');
    } finally {
      setShareBusy(false);
    }
  };

  const shareViaNativeSheet = async (photo) => {
    try {
      setShareBusy(true);
      const shareUrl = await getShareUrl(photo);
      const shareText = buildShareMessage(photo, shareUrl);

      if (navigator.share) {
        await navigator.share({
          title: photo.author ? `${photo.author} on Byte Booth` : 'Byte Booth Badge Day',
          text: shareText,
          url: shareUrl,
        });
        return;
      }

      const copied = await copyToClipboard(shareText);
      if (copied) {
        alert('Share text copied to clipboard.');
      } else {
        window.prompt('Copy this share text:', shareText);
      }
    } catch (error) {
      console.error('Native share failed:', error);
      alert('Could not share from this device.');
    } finally {
      setShareBusy(false);
    }
  };

  const copyShareLink = async (photo) => {
    try {
      setShareBusy(true);
      const shareUrl = await getShareUrl(photo);
      const copied = await copyToClipboard(shareUrl);
      if (copied) {
        alert('Link copied to clipboard.');
      } else {
        window.prompt('Copy this link:', shareUrl);
      }
    } catch (error) {
      console.error('Copy link failed:', error);
      alert('Could not copy the link.');
    } finally {
      setShareBusy(false);
    }
  };

  // Instagram-style Feed Post Component (memoized to prevent unnecessary re-renders)
  const FeedPost = React.memo(({ photo }) => {
    const liked = isLiked(photo);
    const isOwnPost = photo.authorId === userId;
    const isLiking = likingPhotos.has(photo.id);
    
    return (
      <div className="rounded-lg overflow-hidden mb-4 lg:mb-0" style={{ backgroundColor: '#1A1628', border: '1px solid rgba(212,175,55,0.2)' }}>
        {/* Post Header */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 bg-gradient-to-r ${getAuthorAvatar(photo.author || 'Anonymous')} rounded-full flex items-center justify-center`}>
              <span className="text-white text-xs font-bold">
                {(photo.author || 'Anonymous').slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm text-amber-100">{photo.author || 'Anonymous User'}</p>
                {isOwnPost && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold text-stone-900"
                        style={{ background: 'linear-gradient(to right, #f59e0b, #fbbf24)' }}>
                    You
                  </span>
                )}
              </div>
              <p className="text-xs" style={{ color: 'rgba(212,175,55,0.5)' }}>{formatTimeAgo(photo)}</p>
            </div>
          </div>
          <button className="transition-colors" style={{ color: 'rgba(212,175,55,0.4)' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#fcd34d'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(212,175,55,0.4)'}>
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>

        {/* Photo */}
        <div className="relative bg-black">
          <SmartImage
            photo={photo}
            className="w-full h-auto max-h-[500px] lg:max-h-[380px] object-cover"
          />
        </div>

        {/* Action Buttons */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => handleLike(photo)}
                disabled={isLiking}
                className={`transition-all duration-200 relative ${
                  liked ? 'text-red-500' : 'text-gray-400 hover:text-red-400'
                } ${isLiking ? 'scale-110' : 'hover:scale-105'}`}
              >
                <Heart className={`w-6 h-6 ${liked ? 'fill-current' : ''}`} />
                {isLiking && (
                  <div className="absolute inset-0 rounded-full animate-ping bg-red-400 opacity-20"></div>
                )}
              </button>
              <button className="transition-colors" style={{ color: 'rgba(212,175,55,0.45)' }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#fcd34d'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(212,175,55,0.45)'}>
                <MessageCircle className="w-6 h-6" />
              </button>
                    <button className="transition-colors" style={{ color: 'rgba(212,175,55,0.45)' }}
                      onClick={() => setSharePhotoItem(photo)}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#fcd34d'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(212,175,55,0.45)'}>
                <Share className="w-6 h-6" />
              </button>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => downloadPhoto(photo)}
                className="transition-colors"
                style={{ color: 'rgba(212,175,55,0.45)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#fbbf24'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(212,175,55,0.45)'}
                title="Download"
              >
                <Download className="w-5 h-5" />
              </button>
              <button className="transition-colors" style={{ color: 'rgba(212,175,55,0.45)' }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#fcd34d'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(212,175,55,0.45)'}>
                <Bookmark className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Likes */}
          <p className="font-semibold text-sm mb-2 text-amber-200">
            {photo.likes > 0 && `${photo.likes} ${photo.likes === 1 ? 'like' : 'likes'}`}
          </p>

          {/* Caption */}
          {photo.caption && (
            <div className="text-sm mb-2 text-amber-100">
              <span className="font-semibold mr-2 text-amber-300">{photo.author || 'Anonymous User'}</span>
              <span>{photo.caption}</span>
            </div>
          )}

          {/* File info */}
          <p className="text-xs" style={{ color: 'rgba(212,175,55,0.35)' }}>
            {photo.fileName}
          </p>
        </div>
      </div>
    );
  });

  if (isLoading) {
    return (
      <div className="w-full max-w-lg lg:max-w-5xl mx-auto">
        <div className="rounded-lg p-8 text-center" style={{ backgroundColor: '#1A1628', border: '1px solid rgba(212,175,55,0.2)' }}>
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-amber-400 border-t-transparent mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold font-display text-amber-300 mb-2">
            Summoning memories...
          </h3>
          <p className="text-sm" style={{ color: 'rgba(212,175,55,0.55)' }}>
            Fetching the latest Badge Day moments
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg lg:max-w-5xl mx-auto">
      {/* Header with User Info and Sorting */}
      <div className="flex items-center justify-between mb-4 sm:mb-6 px-2 sm:px-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 bg-gradient-to-r ${user?.avatar?.gradient || 'from-green-400 to-blue-500'} rounded-full flex items-center justify-center`}>
            {user?.avatar?.initials ? (
              <span className="text-white text-sm font-bold">{user.avatar.initials}</span>
            ) : (
              <User className="w-5 h-5 text-white" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold font-display text-amber-300">
              {user?.username || 'Anonymous'}
            </h2>
            <p className="text-sm" style={{ color: 'rgba(212,175,55,0.55)' }}>Badge Day Feed</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={() => {
                setInitializedWithPhotos(false);
                onRefresh();
              }}
              className="p-2 rounded-lg transition-colors"
              style={{ backgroundColor: 'rgba(212,175,55,0.1)', color: 'rgba(212,175,55,0.7)' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(212,175,55,0.2)'; e.currentTarget.style.color = '#fcd34d'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(212,175,55,0.1)'; e.currentTarget.style.color = 'rgba(212,175,55,0.7)'; }}
              title="Refresh feed (get latest posts)"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={logout}
            className="p-2 rounded-lg transition-colors"
            style={{ backgroundColor: 'rgba(212,175,55,0.1)', color: 'rgba(212,175,55,0.7)' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(116,0,1,0.3)'; e.currentTarget.style.color = '#fca5a5'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(212,175,55,0.1)'; e.currentTarget.style.color = 'rgba(212,175,55,0.7)'; }}
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Sorting Options */}
      <div className="mb-4 sm:mb-6 px-2 sm:px-4">
        <div className="flex items-center gap-1 sm:gap-2 rounded-lg p-1 overflow-x-auto"
             style={{ backgroundColor: '#1A1628', border: '1px solid rgba(212,175,55,0.2)' }}>
          {[
            { key: 'random', label: 'Random', icon: <Shuffle className="w-4 h-4" />, activeStyle: { backgroundColor: '#6B21A8', color: '#fde68a' } },
            { key: 'recent', label: 'Recent', icon: <Calendar className="w-4 h-4" />, activeStyle: { background: 'linear-gradient(to right, #f59e0b, #fbbf24)', color: '#1c1917' } },
            { key: 'likes', label: 'Most Liked', icon: <Heart className="w-4 h-4" />, activeStyle: { backgroundColor: '#740001', color: '#fde68a' } },
            { key: 'trending', label: 'Trending', icon: <TrendingUp className="w-4 h-4" />, activeStyle: { backgroundColor: '#0E1A40', color: '#93c5fd' } },
          ].map(({ key, label, icon, activeStyle }) => (
            <button
              key={key}
              onClick={() => {
                setSortBy(key);
                if (key === 'random') setShuffleSeed(Math.random());
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap"
              style={sortBy === key
                ? activeStyle
                : { color: 'rgba(212,175,55,0.5)' }
              }
              onMouseEnter={(e) => { if (sortBy !== key) e.currentTarget.style.color = '#fcd34d'; }}
              onMouseLeave={(e) => { if (sortBy !== key) e.currentTarget.style.color = 'rgba(212,175,55,0.5)'; }}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        <p className="text-xs mt-2 text-center" style={{ color: 'rgba(212,175,55,0.4)' }}>
          {sortBy === 'random' && 'Discover memories in random order • Click Random again to re-shuffle'}
          {sortBy === 'recent' && 'Latest memories first'}
          {sortBy === 'likes' && 'Photos with most likes'}
          {sortBy === 'trending' && 'Popular photos from last 24h'}
        </p>
      </div>

      {/* Feed */}
      {displayPhotos.length === 0 ? (
        <div className="rounded-lg p-8 text-center" style={{ backgroundColor: '#1A1628', border: '1px solid rgba(212,175,55,0.2)' }}>
          <User className="w-16 h-16 mx-auto mb-4" style={{ color: 'rgba(212,175,55,0.3)' }} />
          <h3 className="text-lg font-semibold font-display text-amber-300 mb-2">
            The Pensieve is empty
          </h3>
          <p className="text-sm" style={{ color: 'rgba(212,175,55,0.5)' }}>
            Be the first to share a memory from Badge Day!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-4">
          {sortedPhotos.map((photo) => (
            <FeedPost key={photo.id} photo={photo} />
          ))}
        </div>
      )}

      {sharePhotoItem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-3 pb-3 sm:items-center sm:px-4 sm:pb-4">
          <div className="w-full max-w-md rounded-3xl border backdrop-blur-xl shadow-2xl"
               style={{ backgroundColor: 'rgba(26, 22, 40, 0.98)', borderColor: 'rgba(212,175,55,0.25)' }}>
            <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'rgba(212,175,55,0.15)' }}>
              <div>
                <p className="text-sm font-semibold text-amber-300">Share this photo</p>
                <p className="text-xs" style={{ color: 'rgba(212,175,55,0.55)' }}>
                  Viral sharing for phone users
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSharePhotoItem(null)}
                className="rounded-full px-3 py-1 text-sm font-semibold text-amber-300/70 hover:text-amber-200"
              >
                Close
              </button>
            </div>

            <div className="px-4 pt-4">
              <div className="mb-4 overflow-hidden rounded-2xl border" style={{ borderColor: 'rgba(212,175,55,0.15)' }}>
                <SmartImage
                  photo={sharePhotoItem}
                  className="h-48 w-full object-cover"
                />
              </div>
              <p className="mb-4 text-sm" style={{ color: 'rgba(212,175,55,0.72)' }}>
                Send Badge Day memories through WhatsApp, Instagram, or copy a link.
              </p>
            </div>

            <div className="grid gap-2 px-4 pb-4 sm:grid-cols-2">
              <button
                type="button"
                disabled={shareBusy}
                onClick={() => shareToWhatsApp(sharePhotoItem)}
                className="btn-celebration flex items-center justify-center gap-2 py-3 text-sm disabled:opacity-60"
              >
                Share to WhatsApp
              </button>
              <button
                type="button"
                disabled={shareBusy}
                onClick={() => shareToInstagram(sharePhotoItem)}
                className="flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors disabled:opacity-60"
                style={{ borderColor: 'rgba(212,175,55,0.3)', color: '#fde68a', backgroundColor: 'rgba(42,36,64,0.85)' }}
              >
                Share to Instagram
              </button>
              <button
                type="button"
                disabled={shareBusy}
                onClick={() => copyShareLink(sharePhotoItem)}
                className="flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors disabled:opacity-60 sm:col-span-2"
                style={{ borderColor: 'rgba(212,175,55,0.3)', color: '#fde68a', backgroundColor: 'rgba(42,36,64,0.85)' }}
              >
                Copy Link
              </button>
              <button
                type="button"
                disabled={shareBusy}
                onClick={() => shareViaNativeSheet(sharePhotoItem)}
                className="flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors disabled:opacity-60 sm:col-span-2"
                style={{ borderColor: 'rgba(212,175,55,0.3)', color: '#fde68a', backgroundColor: 'rgba(42,36,64,0.85)' }}
              >
                Native Share
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoGallery;
