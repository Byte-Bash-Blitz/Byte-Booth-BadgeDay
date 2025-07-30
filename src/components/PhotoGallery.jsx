import React, { useState, useEffect } from 'react';
import { Heart, Download, Clock, RefreshCw, MessageCircle, Share, Bookmark, MoreHorizontal, User, SortDesc, TrendingUp, Calendar, LogOut, Shuffle } from 'lucide-react';
import { generateDownloadUrl } from '../lib/cloudflare';
import { togglePhotoLike } from '../lib/photoService';
import { useAuth } from '../contexts/AuthContext';

const PhotoGallery = ({ photos = [], isLoading = false, onRefresh }) => {
  const [imageUrls, setImageUrls] = useState({}); // Cache for presigned view URLs
  const [userLikes, setUserLikes] = useState({}); // Track user's likes
  const [sortBy, setSortBy] = useState('random'); // 'random', 'recent', 'likes', 'trending'
  const [shuffleSeed, setShuffleSeed] = useState(Math.random()); // For consistent random order
  const { user, logout } = useAuth();
  const userId = user?.id || 'anonymous';

  // Mock data for development when no photos are available
  const mockPhotos = [
    {
      id: 'mock-1',
      url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600',
      fileName: 'team-celebration.jpg',
      caption: '🎉 Amazing team celebration at Badge Day! From rookie to basher - what a journey! #ByteBashBlitz #BadgeDay2025',
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

  const displayPhotos = photos.length > 0 ? photos : mockPhotos;

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

  // Handle like functionality
  const handleLike = async (photo) => {
    try {
      const result = await togglePhotoLike(photo.id, userId);
      
      // Update local state immediately for responsive UI
      setUserLikes(prev => ({
        ...prev,
        [photo.id]: result.liked
      }));
      
      // Update photos array if onRefresh is available
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  // Check if user has liked a photo
  const isLiked = (photo) => {
    return userLikes[photo.id] || photo.likedBy?.includes(userId);
  };

  // Generate avatar for any user
  const getAuthorAvatar = (authorName) => {
    const colors = [
      'from-red-400 to-red-600',
      'from-blue-400 to-blue-600', 
      'from-green-400 to-green-600',
      'from-purple-400 to-purple-600',
      'from-pink-400 to-pink-600',
      'from-indigo-400 to-indigo-600',
      'from-yellow-400 to-yellow-600',
      'from-teal-400 to-teal-600'
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
    const [imageSrc, setImageSrc] = useState(photo.url);
    const [isLoadingPresigned, setIsLoadingPresigned] = useState(false);
    const [hasError, setHasError] = useState(false);

    const handleImageError = async () => {
      if (hasError || isLoadingPresigned) return; // Prevent infinite loops
      
      // If this is an R2 photo and we haven't tried presigned URL yet
      if (photo.s3Key && !imageUrls[photo.id]) {
        try {
          setIsLoadingPresigned(true);
          console.log('🖼️ Image failed to load, generating presigned URL for:', photo.s3Key);
          const presignedUrl = await generateDownloadUrl(photo.s3Key);
          
          setImageUrls(prev => ({
            ...prev,
            [photo.id]: presignedUrl
          }));
          
          setImageSrc(presignedUrl);
        } catch (error) {
          console.error('Failed to generate presigned URL for viewing:', error);
          setHasError(true);
          if (onError) onError();
        } finally {
          setIsLoadingPresigned(false);
        }
      } else {
        setHasError(true);
        if (onError) onError();
      }
    };

    // Use cached presigned URL if available
    useEffect(() => {
      if (imageUrls[photo.id] && imageSrc !== imageUrls[photo.id]) {
        setImageSrc(imageUrls[photo.id]);
      }
    }, [imageUrls, photo.id]);

    if (hasError) {
      return (
        <div className={`${className} bg-gray-800 flex items-center justify-center text-gray-400`}>
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
        />
        {isLoadingPresigned && (
          <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-green-400 border-t-transparent"></div>
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

  // Instagram-style Feed Post Component
  const FeedPost = ({ photo }) => {
    const liked = isLiked(photo);
    const isOwnPost = photo.authorId === userId;
    
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden mb-6">
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
                <p className="text-white font-semibold text-sm">{photo.author || 'Anonymous User'}</p>
                {isOwnPost && (
                  <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
                    You
                  </span>
                )}
              </div>
              <p className="text-gray-400 text-xs">{formatTimeAgo(photo)}</p>
            </div>
          </div>
          <button className="text-gray-400 hover:text-white transition-colors">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>

        {/* Photo */}
        <div className="relative bg-black">
          <SmartImage
            photo={photo}
            className="w-full h-auto max-h-[600px] object-cover"
          />
        </div>

        {/* Action Buttons */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => handleLike(photo)}
                className={`transition-colors ${
                  liked ? 'text-red-500' : 'text-gray-400 hover:text-red-400'
                }`}
              >
                <Heart className={`w-6 h-6 ${liked ? 'fill-current' : ''}`} />
              </button>
              <button className="text-gray-400 hover:text-white transition-colors">
                <MessageCircle className="w-6 h-6" />
              </button>
              <button className="text-gray-400 hover:text-white transition-colors">
                <Share className="w-6 h-6" />
              </button>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => downloadPhoto(photo)}
                className="text-gray-400 hover:text-green-400 transition-colors"
                title="Download"
              >
                <Download className="w-5 h-5" />
              </button>
              <button className="text-gray-400 hover:text-white transition-colors">
                <Bookmark className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Likes */}
          <p className="text-white font-semibold text-sm mb-2">
            {photo.likes > 0 && `${photo.likes} ${photo.likes === 1 ? 'like' : 'likes'}`}
          </p>

          {/* Caption */}
          {photo.caption && (
            <div className="text-white text-sm mb-2">
              <span className="font-semibold mr-2">{photo.author || 'Anonymous User'}</span>
              <span>{photo.caption}</span>
            </div>
          )}

          {/* File info */}
          <p className="text-gray-400 text-xs">
            {photo.fileName}
          </p>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-lg mx-auto">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-green-400 border-t-transparent mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-white mb-2">
            Loading photos...
          </h3>
          <p className="text-gray-400 text-sm">
            Fetching the latest Badge Day moments
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Header with User Info and Sorting */}
      <div className="flex items-center justify-between mb-6 px-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 bg-gradient-to-r ${user?.avatar?.gradient || 'from-green-400 to-blue-500'} rounded-full flex items-center justify-center`}>
            {user?.avatar?.initials ? (
              <span className="text-white text-sm font-bold">{user.avatar.initials}</span>
            ) : (
              <User className="w-5 h-5 text-white" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              {user?.username || 'Anonymous'}
            </h2>
            <p className="text-gray-400 text-sm">Badge Day Feed</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-gray-300 hover:text-white"
              title="Refresh feed"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          )}
          
          <button
            onClick={logout}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-gray-300 hover:text-red-400"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Sorting Options */}
      <div className="mb-6 px-4">
        <div className="flex items-center gap-2 bg-gray-900 rounded-lg p-1 border border-gray-800 overflow-x-auto">
          <button
            onClick={() => {
              setSortBy('random');
              setShuffleSeed(Math.random()); // Generate new shuffle
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              sortBy === 'random'
                ? 'bg-purple-500 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <Shuffle className="w-4 h-4" />
            Random
          </button>
          
          <button
            onClick={() => setSortBy('recent')}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              sortBy === 'recent'
                ? 'bg-green-500 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Recent
          </button>
          
          <button
            onClick={() => setSortBy('likes')}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              sortBy === 'likes'
                ? 'bg-red-500 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <Heart className="w-4 h-4" />
            Most Liked
          </button>
          
          <button
            onClick={() => setSortBy('trending')}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              sortBy === 'trending'
                ? 'bg-blue-500 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Trending
          </button>
        </div>
        
        <p className="text-gray-500 text-xs mt-2 text-center">
          {sortBy === 'random' && 'Discover photos in random order • Click Random again to re-shuffle'}
          {sortBy === 'recent' && 'Latest photos first'}
          {sortBy === 'likes' && 'Photos with most likes'}
          {sortBy === 'trending' && 'Popular photos from last 24h'}
        </p>
      </div>

      {/* Feed */}
      {displayPhotos.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
          <User className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            No posts yet
          </h3>
          <p className="text-gray-400 text-sm">
            Be the first to share a moment from Badge Day!
          </p>
        </div>
      ) : (
        <div className="space-y-0">
          {sortedPhotos.map((photo) => (
            <FeedPost key={photo.id} photo={photo} />
          ))}
        </div>
      )}
    </div>
  );
};

export default PhotoGallery;
