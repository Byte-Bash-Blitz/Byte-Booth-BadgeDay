import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Image, Camera, Star, Sparkles, Type } from 'lucide-react';

const PhotoUpload = ({ onPhotoSelect, onCameraOpen, isUploading }) => {
  const [caption, setCaption] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const handleFileSelect = (file) => {
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleUpload = () => {
    if (selectedFile) {
      onPhotoSelect(selectedFile, caption);
      // Reset form
      setSelectedFile(null);
      setPreviewUrl(null);
      setCaption('');
    }
  };

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      handleFileSelect(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    multiple: false,
    disabled: isUploading
  });

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Event Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-4">
          <Sparkles className="w-8 h-8 text-green-400 animate-pulse-celebration" />
          <h1 className="text-4xl md:text-5xl gradient-text">
            Byte Bash Blitz
          </h1>
          <Sparkles className="w-8 h-8 text-blue-400 animate-pulse-celebration" />
        </div>
        <p className="text-xl text-gray-300 font-medium">
          3rd Badge Day Celebration 🏆
        </p>
        <p className="text-lg text-gray-400 mt-2">
          From Rookie to Basher - Capture Your Journey!
        </p>
      </div>

      {/* Upload Area */}
      <div className="card-celebration">
        {previewUrl ? (
          // Preview and Caption Form
          <div className="space-y-6">
            <div className="relative">
              <img 
                src={previewUrl} 
                alt="Preview" 
                className="w-full max-h-96 object-cover rounded-lg"
              />
              <button
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewUrl(null);
                  setCaption('');
                }}
                className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
              >
                ×
              </button>
            </div>

            {/* Caption Input */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-gray-300 font-medium">
                <Type className="w-4 h-4" />
                Add a caption
              </label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="What's happening at Badge Day? Share your moment..."
                className="w-full p-4 bg-gray-800 border-2 border-gray-700 rounded-lg focus:border-green-400 focus:outline-none resize-none text-white placeholder-gray-400"
                rows={3}
                maxLength={500}
              />
              <div className="text-right text-sm text-gray-500">
                {caption.length}/500
              </div>
            </div>

            {/* Upload Button */}
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="w-full btn-celebration py-4 text-lg font-semibold"
            >
              {isUploading ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  Sharing your moment...
                </div>
              ) : (
                'Share to Feed'
              )}
            </button>
          </div>
        ) : (
          // File Selection Area
          <div
            {...getRootProps()}
            className={`
              border-3 border-dashed rounded-xl p-8 text-center cursor-pointer
              transition-all duration-300 min-h-[300px] flex flex-col items-center justify-center
              ${isDragActive 
                ? 'border-green-400 bg-green-400/10' 
                : 'border-gray-600 hover:border-green-400 hover:bg-green-400/5'
              }
              ${isUploading ? 'pointer-events-none opacity-50' : ''}
            `}
          >
            <input {...getInputProps()} />
            
            <div className="mb-6">
              <div className="relative">
                <Image className="w-20 h-20 text-gray-500 mx-auto mb-4" />
                <Star className="w-6 h-6 text-green-400 absolute -top-2 -right-2 animate-bounce-slow" />
              </div>
            </div>
            
            <h3 className="text-2xl font-bold text-white mb-2">
              Share Your Badge Day Moment
            </h3>
            
            {isDragActive ? (
              <p className="text-lg text-green-400 font-medium">
                Drop your photo here! 📸
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-lg text-gray-300">
                  Drag & drop your photo, or click to browse
                </p>
                <p className="text-sm text-gray-500">
                  Supports JPEG, PNG, GIF, WebP (max 10MB)
                </p>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons - Only show when no file selected */}
        {!previewUrl && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <button
              onClick={onCameraOpen}
              disabled={isUploading}
              className="btn-celebration flex items-center justify-center gap-3 py-4"
            >
              <Camera className="w-5 h-5" />
              Take Photo
            </button>
            
            <label className="btn-celebration flex items-center justify-center gap-3 py-4 cursor-pointer">
              <Upload className="w-5 h-5" />
              Choose File
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
                className="hidden"
                disabled={isUploading}
              />
            </label>
          </div>
        )}

        {/* Event Info */}
        <div className="mt-8 p-4 bg-gradient-to-r from-gray-800 to-gray-700 rounded-lg border border-gray-600">
          <h4 className="font-semibold text-white mb-2">
            🎉 What we're celebrating:
          </h4>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>• New Bashers joining our community</li>
            <li>• Recognizing top performers & challenge winners</li>
            <li>• Community app launch reveal</li>
            <li>• Achievement milestones & leaderboard updates</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PhotoUpload;
