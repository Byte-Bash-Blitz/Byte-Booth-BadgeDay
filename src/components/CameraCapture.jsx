import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X, AlertCircle, Type, RotateCcw } from 'lucide-react';

const CameraCapture = ({ onPhotoCapture, onClose }) => {
  const [stream, setStream] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [caption, setCaption] = useState('');
  const [showCaptionForm, setShowCaptionForm] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null); // Use ref to track stream for cleanup

  useEffect(() => {
    startCamera();
    return () => {
      // Cleanup on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []); // Empty dependency array - only run once on mount

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false
      });
      
      streamRef.current = mediaStream; // Store in ref for cleanup
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Could not access camera. Please check permissions.');
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setIsCapturing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw the current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert canvas to blob and create image URL for preview
    canvas.toBlob((blob) => {
      if (blob) {
        const imageUrl = URL.createObjectURL(blob);
        setCapturedImage({ blob, url: imageUrl });
        setShowCaptionForm(true);
      }
      setIsCapturing(false);
    }, 'image/jpeg', 0.9);
  };

  const handleRetakePhoto = () => {
    if (capturedImage?.url) {
      URL.revokeObjectURL(capturedImage.url);
    }
    setCapturedImage(null);
    setShowCaptionForm(false);
    setCaption('');
  };

  const handleUploadPhoto = () => {
    if (capturedImage?.blob) {
      // Create a file object
      const file = new File([capturedImage.blob], `photo-${Date.now()}.jpg`, {
        type: 'image/jpeg'
      });
      onPhotoCapture(file, caption);
    }
  };

  const handleCancelUpload = () => {
    // Clean up captured image URL if exists
    if (capturedImage?.url) {
      URL.revokeObjectURL(capturedImage.url);
    }
    // Stop camera and close all dialogs
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    onClose();
  };

  const handleClose = () => {
    // Clean up captured image URL if exists
    if (capturedImage?.url) {
      URL.revokeObjectURL(capturedImage.url);
    }
    // Stop camera before closing
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
      <div className="relative w-full max-w-2xl mx-4">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 bg-white/20 hover:bg-white/30 
                     rounded-full p-2 transition-colors"
        >
          <X className="w-6 h-6 text-white" />
        </button>
        
        <div className="bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-gray-800">
          {showCaptionForm ? (
            // Caption Form View
            <div className="p-6">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">
                  Add Caption to Your Photo
                </h3>
                <p className="text-gray-400">
                  Share what's happening at Badge Day! 🎉
                </p>
              </div>

              {/* Photo Preview */}
              <div className="relative mb-6">
                <img 
                  src={capturedImage?.url} 
                  alt="Captured photo" 
                  className="w-full max-h-64 object-cover rounded-lg border-2 border-gray-700"
                />
              </div>

              {/* Caption Input */}
              <div className="space-y-4 mb-6">
                <label className="flex items-center gap-2 text-gray-300 font-medium">
                  <Type className="w-4 h-4 text-green-400" />
                  Caption (optional)
                </label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="What's happening at Badge Day? Share your moment..."
                  className="w-full p-4 bg-gray-800 border-2 border-gray-700 rounded-lg focus:border-green-400 focus:outline-none resize-none text-white placeholder-gray-500"
                  rows={3}
                  maxLength={500}
                />
                <div className="text-right text-sm text-gray-500">
                  {caption.length}/500
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleRetakePhoto}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 border border-gray-600"
                >
                  <RotateCcw className="w-5 h-5" />
                  Retake
                </button>
                <button
                  onClick={handleCancelUpload}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors border border-red-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUploadPhoto}
                  className="flex-1 btn-celebration flex items-center justify-center gap-2"
                >
                  <Upload className="w-5 h-5" />
                  Share
                </button>
              </div>
            </div>
          ) : (
            // Camera View
            <>
              <div className="relative bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-auto max-h-[60vh] object-cover"
                />
                <canvas
                  ref={canvasRef}
                  className="hidden"
                />
              </div>
              
              <div className="p-6 text-center bg-gray-900">
                <button
                  onClick={capturePhoto}
                  disabled={isCapturing}
                  className="btn-celebration inline-flex items-center gap-3 text-lg"
                >
                  <Camera className="w-6 h-6" />
                  {isCapturing ? 'Capturing...' : 'Take Photo'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CameraCapture;
