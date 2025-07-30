import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X, AlertCircle } from 'lucide-react';

const CameraCapture = ({ onPhotoCapture, onClose }) => {
  const [stream, setStream] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
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
    
    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (blob) {
        // Create a file object
        const file = new File([blob], `photo-${Date.now()}.jpg`, {
          type: 'image/jpeg'
        });
        onPhotoCapture(file);
      }
      setIsCapturing(false);
    }, 'image/jpeg', 0.9);
  };

  const handleClose = () => {
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
        
        <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
          <div className="relative">
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
          
          <div className="p-6 text-center">
            <button
              onClick={capturePhoto}
              disabled={isCapturing}
              className="btn-celebration inline-flex items-center gap-3 text-lg"
            >
              <Camera className="w-6 h-6" />
              {isCapturing ? 'Capturing...' : 'Take Photo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CameraCapture;
