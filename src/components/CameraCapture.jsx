import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X, Type, RotateCcw, SwitchCamera } from 'lucide-react';

const CameraCapture = ({ onPhotoCapture, onClose }) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [caption, setCaption] = useState('');
  const [showCaptionForm, setShowCaptionForm] = useState(false);
  const [facingMode, setFacingMode] = useState('user');
  const [isLoading, setIsLoading] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async (targetFacingMode = facingMode) => {
    try {
      setIsLoading(true);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: targetFacingMode },
        audio: false
      });
      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Could not access camera. Please check permissions.');
    } finally {
      setIsLoading(false);
    }
  };

  const switchCamera = async () => {
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);
    await startCamera(newFacingMode);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsCapturing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob) {
        setCapturedImage({ blob, url: URL.createObjectURL(blob) });
        setShowCaptionForm(true);
      }
      setIsCapturing(false);
    }, 'image/jpeg', 0.9);
  };

  const handleRetake = () => {
    if (capturedImage?.url) URL.revokeObjectURL(capturedImage.url);
    setCapturedImage(null);
    setShowCaptionForm(false);
    setCaption('');
  };

  const handleShare = () => {
    if (capturedImage?.blob) {
      const file = new File([capturedImage.blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
      onPhotoCapture(file, caption);
    }
  };

  const handleClose = () => {
    if (capturedImage?.url) URL.revokeObjectURL(capturedImage.url);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
         style={{ backgroundColor: 'rgba(0,0,0,0.92)' }}>

      {/* Close button — always top-right of screen */}
      <button
        onClick={handleClose}
        className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 rounded-full p-2 transition-colors"
        style={{ backgroundColor: 'rgba(212,175,55,0.2)', color: '#fcd34d' }}
      >
        <X className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      {/* Modal card — fullscreen on mobile, max-w card on desktop */}
      <div className="w-full sm:w-auto sm:min-w-[480px] sm:max-w-2xl sm:mx-4 sm:rounded-2xl overflow-hidden"
           style={{
             backgroundColor: '#1A1628',
             border: '1px solid rgba(212,175,55,0.3)',
             boxShadow: '0 0 40px rgba(212,175,55,0.1)',
             maxHeight: '100dvh',
             display: 'flex',
             flexDirection: 'column',
           }}>

        {showCaptionForm ? (
          /* ── Caption screen ── */
          <div className="flex flex-col flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="text-center mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-2xl font-bold font-display text-amber-300 mb-1">
                Caption Your Memory
              </h3>
              <p className="text-xs sm:text-sm" style={{ color: 'rgba(212,175,55,0.6)' }}>
                Share what's happening at Badge Day! ⚡
              </p>
            </div>

            {/* Preview image */}
            <div className="relative mb-4 sm:mb-6 flex-shrink-0">
              <img
                src={capturedImage?.url}
                alt="Captured photo"
                className="w-full max-h-48 sm:max-h-64 object-cover rounded-lg"
                style={{ border: '2px solid rgba(212,175,55,0.3)' }}
              />
            </div>

            {/* Caption textarea */}
            <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6 flex-shrink-0">
              <label className="flex items-center gap-2 font-medium text-amber-300 text-sm sm:text-base">
                <Type className="w-4 h-4 text-amber-400" />
                Caption (optional)
              </label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="What spell did you cast today?"
                className="w-full p-3 sm:p-4 rounded-lg focus:outline-none resize-none text-amber-100 placeholder-amber-900/60 text-sm sm:text-base"
                style={{
                  backgroundColor: '#12101C',
                  border: '2px solid rgba(212,175,55,0.2)',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = 'rgba(212,175,55,0.6)'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(212,175,55,0.2)'}
                rows={2}
                maxLength={500}
              />
              <div className="text-right text-xs" style={{ color: 'rgba(212,175,55,0.4)' }}>
                {caption.length}/500
              </div>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 flex-shrink-0">
              <button
                onClick={handleRetake}
                className="flex items-center justify-center gap-1 sm:gap-2 font-semibold py-3 rounded-lg transition-colors text-sm sm:text-base"
                style={{ backgroundColor: 'rgba(42,36,64,0.9)', color: '#fcd34d', border: '1px solid rgba(212,175,55,0.3)' }}
              >
                <RotateCcw className="w-4 h-4 flex-shrink-0" />
                <span className="hidden xs:inline">Retake</span>
              </button>
              <button
                onClick={handleClose}
                className="flex items-center justify-center font-semibold py-3 rounded-lg transition-colors text-sm sm:text-base"
                style={{ backgroundColor: 'rgba(116,0,1,0.7)', color: '#fde68a', border: '1px solid rgba(116,0,1,0.5)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleShare}
                className="btn-celebration flex items-center justify-center gap-1 sm:gap-2 py-3 text-sm sm:text-base"
              >
                <Upload className="w-4 h-4 flex-shrink-0" />
                Share
              </button>
            </div>
          </div>

        ) : (
          /* ── Camera viewfinder screen ── */
          <>
            {/* Video — fills available space */}
            <div className="relative bg-black flex-1 min-h-0">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ maxHeight: 'calc(100dvh - 100px)', minHeight: '240px' }}
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Switch camera */}
              <button
                onClick={switchCamera}
                disabled={isLoading || isCapturing}
                className="absolute top-3 left-3 sm:top-4 sm:left-4 rounded-full p-2 sm:p-3 transition-colors disabled:opacity-50"
                style={{ backgroundColor: 'rgba(0,0,0,0.55)', color: '#fcd34d' }}
                title={`Switch to ${facingMode === 'user' ? 'back' : 'front'} camera`}
              >
                <SwitchCamera className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              {/* Facing mode badge */}
              <div className="absolute top-3 right-12 sm:top-4 sm:right-14 rounded-full px-2 sm:px-3 py-1"
                   style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
                <span className="text-amber-300 text-xs font-medium">
                  {facingMode === 'user' ? '🤳 Front' : '📷 Back'}
                </span>
              </div>

              {/* Loading overlay */}
              {isLoading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-400 border-t-transparent mx-auto mb-2"></div>
                    <p className="text-amber-300 text-sm">Switching camera...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Capture bar */}
            <div className="flex-shrink-0 flex items-center justify-center py-4 sm:py-6 px-4"
                 style={{ backgroundColor: '#1A1628' }}>
              <button
                onClick={capturePhoto}
                disabled={isCapturing || isLoading}
                className="btn-celebration inline-flex items-center gap-2 sm:gap-3 px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg disabled:opacity-50"
              >
                <Camera className="w-5 h-5 sm:w-6 sm:h-6" />
                {isCapturing ? 'Capturing...' : isLoading ? 'Loading...' : 'Take Photo'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CameraCapture;
