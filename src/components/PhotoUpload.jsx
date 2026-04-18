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
    <div className="w-full max-w-2xl lg:max-w-3xl mx-auto">
      {/* Event Header */}
      <div className="text-center mb-6 sm:mb-8">
        <div className="inline-flex items-center gap-2 mb-3 sm:mb-4">
          <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-amber-400 animate-pulse-celebration" />
          <h1 className="text-3xl sm:text-4xl md:text-5xl gradient-text">
            Byte Bash Blitz
          </h1>
          <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-300 animate-pulse-celebration" />
        </div>
        <p className="text-lg sm:text-xl font-medium text-amber-300">
          4th Badge Day Celebration ⚡
        </p>
        <p className="text-sm sm:text-lg mt-2" style={{ color: 'rgba(212, 175, 55, 0.6)' }}>
          Capture your magic — share your journey!
        </p>
      </div>

      {/* Upload Area */}
      <div className="card-celebration">
        {previewUrl ? (
          // Preview and Caption Form — two-panel on desktop
          <div className="flex flex-col lg:flex-row lg:gap-6">
            {/* Image Preview */}
            <div className="relative lg:w-1/2 lg:flex-shrink-0">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full lg:h-full max-h-80 lg:max-h-[420px] object-cover rounded-lg"
                style={{ border: '1px solid rgba(212, 175, 55, 0.3)' }}
              />
              <button
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewUrl(null);
                  setCaption('');
                }}
                className="absolute top-2 right-2 bg-black/60 text-amber-300 rounded-full p-2 hover:bg-black/80 transition-colors text-lg leading-none"
              >
                ×
              </button>
            </div>

            {/* Caption + Submit */}
            <div className="lg:w-1/2 flex flex-col justify-between mt-4 lg:mt-0 space-y-4">
            {/* Caption Input */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 font-medium text-amber-300">
                <Type className="w-4 h-4 text-amber-400" />
                Add a caption
              </label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="What spell did you cast today? Share your moment..."
                className="w-full p-4 rounded-lg focus:outline-none resize-none text-amber-100 placeholder-amber-900/60"
                style={{
                  backgroundColor: '#12101C',
                  border: '2px solid rgba(212, 175, 55, 0.2)',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = 'rgba(212, 175, 55, 0.6)'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(212, 175, 55, 0.2)'}
                rows={4}
                maxLength={500}
              />
              <div className="text-right text-sm" style={{ color: 'rgba(212,175,55,0.4)' }}>
                {caption.length}/500
              </div>
            </div>

            {/* Upload Button */}
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="w-full btn-celebration py-3 sm:py-4 text-base sm:text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-stone-900 border-t-transparent"></div>
                  Casting to the Pensieve...
                </div>
              ) : (
                'Add to the Pensieve ⚡'
              )}
            </button>
            </div>
          </div>
        ) : (
          // File Selection Area
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-xl p-6 sm:p-8 text-center cursor-pointer
              transition-all duration-300 min-h-[220px] sm:min-h-[300px] flex flex-col items-center justify-center
              ${isDragActive ? 'bg-amber-400/10' : 'hover:bg-amber-400/5'}
              ${isUploading ? 'pointer-events-none opacity-50' : ''}
            `}
            style={{
              borderColor: isDragActive ? 'rgba(212, 175, 55, 0.8)' : 'rgba(212, 175, 55, 0.3)',
            }}
          >
            <input {...getInputProps()} />

            <div className="mb-4 sm:mb-6">
              <div className="relative">
                <Image className="w-14 h-14 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4" style={{ color: 'rgba(212,175,55,0.4)' }} />
                <Star className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 absolute -top-2 -right-2 animate-bounce-slow" />
              </div>
            </div>

            <h3 className="text-lg sm:text-2xl font-bold font-display text-amber-300 mb-2">
              Share Your Badge Day Moment
            </h3>

            {isDragActive ? (
              <p className="text-base sm:text-lg font-medium text-amber-400">
                Release the enchantment! 📸
              </p>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                <p className="text-sm sm:text-lg text-amber-200/70">
                  Drag & drop your photo, or click to browse
                </p>
                <p className="text-xs sm:text-sm" style={{ color: 'rgba(212,175,55,0.4)' }}>
                  Supports JPEG, PNG, GIF, WebP (max 10MB)
                </p>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons - Only show when no file selected */}
        {!previewUrl && (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-4 sm:mt-6">
            <button
              onClick={onCameraOpen}
              disabled={isUploading}
              className="btn-celebration flex items-center justify-center gap-2 sm:gap-3 py-3 sm:py-4 text-sm sm:text-base"
            >
              <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Take Photo</span>
            </button>

            <label className="btn-celebration flex items-center justify-center gap-2 sm:gap-3 py-3 sm:py-4 cursor-pointer text-sm sm:text-base">
              <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Choose File</span>
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
        <div className="mt-8 p-4 rounded-lg"
             style={{ background: 'linear-gradient(to right, rgba(26,22,40,0.9), rgba(34,24,48,0.9))', border: '1px solid rgba(212,175,55,0.2)' }}>
          <h4 className="font-semibold text-amber-300 mb-2">
            ⚡ What we're celebrating:
          </h4>
          <ul className="text-sm space-y-1" style={{ color: 'rgba(212,175,55,0.7)' }}>
            <li>• New Bashers joining our wizarding community</li>
            <li>• Recognising top performers & challenge winners</li>
            <li>• Community app launch reveal</li>
            <li>• Achievement milestones & leaderboard updates</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PhotoUpload;
