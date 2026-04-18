import React, { useEffect, useRef, useState } from 'react';
import { Camera, Upload, X, Type, RotateCcw, SwitchCamera, Zap, ZapOff } from 'lucide-react';

const FILTERS = [
  { id: 'natural', label: 'Natural' },
  { id: 'smooth-skin', label: 'Smooth Skin' },
  { id: 'bright-eyes', label: 'Bright Eyes' },
  { id: 'slim-face', label: 'Slim Face' },
  { id: 'subtle-makeup', label: 'Subtle Makeup' },
  { id: 'dog-face', label: 'Dog Lens' },
  { id: 'anime-eyes', label: 'Anime Eyes' },
  { id: 'helmet-mask', label: 'Helmet' },
  { id: 'funny-distort', label: 'Funny' },
  { id: 'vintage', label: 'Vintage' },
  { id: 'bw', label: 'B&W' },
  { id: 'cinematic', label: 'Cinematic' },
  { id: 'vibrant', label: 'Vibrant' },
  { id: 'event-frame', label: 'Badge Day' },
  { id: 'logo-overlay', label: 'Logo' },
  { id: 'wizard-frame', label: 'Wizard Frame' },
];

const LANDMARK_ALIASES = {
  leftEye: ['leftEye', 'eyeLeft', 'left_eye', 'eye'],
  rightEye: ['rightEye', 'eyeRight', 'right_eye'],
  nose: ['nose', 'noseTip'],
  mouth: ['mouth', 'mouthCenter'],
};

const getFilterCss = (filterId) => {
  switch (filterId) {
    case 'smooth-skin':
      return 'blur(0.7px) brightness(1.05) saturate(1.06)';
    case 'bright-eyes':
      return 'brightness(1.04) contrast(1.04)';
    case 'slim-face':
      return 'contrast(1.05) saturate(1.02)';
    case 'subtle-makeup':
      return 'saturate(1.08) brightness(1.03)';
    case 'vintage':
      return 'sepia(0.42) contrast(1.08) saturate(0.95)';
    case 'bw':
      return 'grayscale(1) contrast(1.1)';
    case 'cinematic':
      return 'contrast(1.16) saturate(0.84) brightness(0.96)';
    case 'vibrant':
      return 'saturate(1.38) contrast(1.1) brightness(1.02)';
    default:
      return 'none';
  }
};

const findLandmark = (face, key) => {
  const names = LANDMARK_ALIASES[key] || [key];
  const landmarks = face?.landmarks || [];
  for (const name of names) {
    const point = landmarks.find((item) => item.type === name);
    if (point) return point;
  }
  return null;
};

const drawLightningBolt = (ctx, x, y, size, color) => {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + size * 0.24, y + size * 0.44);
  ctx.lineTo(x + size * 0.07, y + size * 0.44);
  ctx.lineTo(x + size * 0.3, y + size);
  ctx.lineTo(x + size * 0.12, y + size * 0.58);
  ctx.lineTo(x + size * 0.28, y + size * 0.58);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
};

const CameraCapture = ({ onPhotoCapture, onClose, isStandalonePage = false }) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [caption, setCaption] = useState('');
  const [showCaptionForm, setShowCaptionForm] = useState(false);
  const [facingMode, setFacingMode] = useState('user');
  const [isLoading, setIsLoading] = useState(false);
  const [flashMode, setFlashMode] = useState('off');
  const [flashPulse, setFlashPulse] = useState(false);
  const [focusPoint, setFocusPoint] = useState(null);
  const [activeFilterId, setActiveFilterId] = useState('natural');
  const [faceTrackingAvailable, setFaceTrackingAvailable] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const focusTimeoutRef = useRef(null);
  const flashTimeoutRef = useRef(null);
  const animationRef = useRef(null);
  const faceDetectorRef = useRef(null);
  const faceDetectionsRef = useRef([]);
  const isDetectingRef = useRef(false);
  const lastDetectTsRef = useRef(0);
  const hasShownCameraPermissionAlertRef = useRef(false);

  const drawFaceEffects = (ctx, faces, width, height) => {
    if (!faces.length) return;

    faces.forEach((face) => {
      const box = face.boundingBox;
      const leftEye = findLandmark(face, 'leftEye');
      const rightEye = findLandmark(face, 'rightEye');
      const mouth = findLandmark(face, 'mouth');

      if (activeFilterId === 'bright-eyes' && leftEye && rightEye) {
        [leftEye, rightEye].forEach((eye) => {
          const glow = ctx.createRadialGradient(eye.x, eye.y, 2, eye.x, eye.y, 26);
          glow.addColorStop(0, 'rgba(255,255,255,0.35)');
          glow.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(eye.x, eye.y, 26, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      if (activeFilterId === 'subtle-makeup' && leftEye && rightEye && mouth) {
        const cheekY = mouth.y - Math.max(10, box.height * 0.08);
        const leftCheekX = leftEye.x;
        const rightCheekX = rightEye.x;

        [leftCheekX, rightCheekX].forEach((x) => {
          const blush = ctx.createRadialGradient(x, cheekY, 4, x, cheekY, 24);
          blush.addColorStop(0, 'rgba(255,120,160,0.22)');
          blush.addColorStop(1, 'rgba(255,120,160,0)');
          ctx.fillStyle = blush;
          ctx.beginPath();
          ctx.arc(x, cheekY, 24, 0, Math.PI * 2);
          ctx.fill();
        });

        ctx.strokeStyle = 'rgba(255, 186, 205, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(mouth.x - 10, mouth.y + 2);
        ctx.quadraticCurveTo(mouth.x, mouth.y + 7, mouth.x + 10, mouth.y + 2);
        ctx.stroke();
      }

      if (activeFilterId === 'slim-face') {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 220, 120, 0.18)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(
          box.x + box.width / 2,
          box.y + box.height / 2,
          box.width * 0.42,
          box.height * 0.56,
          0,
          0,
          Math.PI * 2
        );
        ctx.stroke();
        ctx.restore();
      }

      if (activeFilterId === 'dog-face') {
        const earW = box.width * 0.26;
        const earH = box.height * 0.28;
        const earY = box.y - earH * 0.65;

        ctx.fillStyle = 'rgba(119, 72, 33, 0.92)';
        ctx.beginPath();
        ctx.ellipse(box.x + box.width * 0.24, earY, earW * 0.55, earH, -0.6, 0, Math.PI * 2);
        ctx.ellipse(box.x + box.width * 0.76, earY, earW * 0.55, earH, 0.6, 0, Math.PI * 2);
        ctx.fill();

        if (mouth) {
          ctx.fillStyle = 'rgba(255, 105, 160, 0.85)';
          ctx.beginPath();
          ctx.ellipse(mouth.x, mouth.y + box.height * 0.18, box.width * 0.12, box.height * 0.18, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (activeFilterId === 'anime-eyes' && leftEye && rightEye) {
        [leftEye, rightEye].forEach((eye) => {
          ctx.fillStyle = 'rgba(255,255,255,0.94)';
          ctx.beginPath();
          ctx.ellipse(eye.x, eye.y, 18, 12, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(37, 99, 235, 0.92)';
          ctx.beginPath();
          ctx.arc(eye.x, eye.y, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'white';
          ctx.beginPath();
          ctx.arc(eye.x + 2, eye.y - 2, 2, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      if (activeFilterId === 'helmet-mask') {
        const top = box.y - box.height * 0.2;
        const arcHeight = box.height * 0.44;
        ctx.fillStyle = 'rgba(26, 26, 40, 0.44)';
        ctx.strokeStyle = 'rgba(120, 255, 255, 0.75)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(box.x - 8, top, box.width + 16, box.height + 12, 20);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.ellipse(box.x + box.width / 2, top + arcHeight, box.width * 0.55, arcHeight, 0, Math.PI, 0);
        ctx.stroke();
      }

      if (activeFilterId === 'funny-distort' && mouth) {
        ctx.fillStyle = 'rgba(255, 40, 40, 0.78)';
        ctx.beginPath();
        ctx.arc(mouth.x, mouth.y, Math.max(8, box.width * 0.08), 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 230, 120, 0.9)';
        ctx.lineWidth = 2;
        ctx.strokeRect(box.x, box.y, box.width, box.height);
      }
    });

    if (activeFilterId === 'event-frame') {
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.9)';
      ctx.lineWidth = Math.max(8, Math.round(width * 0.013));
      ctx.strokeRect(8, 8, width - 16, height - 16);
      ctx.fillStyle = 'rgba(13, 11, 20, 0.48)';
      ctx.fillRect(0, height - 74, width, 74);
      ctx.fillStyle = '#FCD34D';
      ctx.font = `${Math.max(18, Math.round(width * 0.033))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('Byte Bash Blitz Badge Day 2026', width / 2, height - 28);
    }

    if (activeFilterId === 'logo-overlay') {
      const badgeW = Math.max(130, width * 0.28);
      const badgeH = 46;
      const x = width - badgeW - 20;
      const y = 20;
      ctx.fillStyle = 'rgba(13, 11, 20, 0.6)';
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.75)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x, y, badgeW, badgeH, 14);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FCD34D';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('BYTE BOOTH', x + badgeW / 2, y + 19);
      ctx.font = '12px sans-serif';
      ctx.fillText('BADGE DAY', x + badgeW / 2, y + 35);
    }

    if (activeFilterId === 'wizard-frame') {
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.95)';
      ctx.lineWidth = 10;
      ctx.strokeRect(12, 12, width - 24, height - 24);
      ctx.strokeStyle = 'rgba(250, 220, 120, 0.55)';
      ctx.lineWidth = 2;
      ctx.strokeRect(24, 24, width - 48, height - 48);
      drawLightningBolt(ctx, 28, 28, 42, 'rgba(250, 220, 120, 0.96)');
      drawLightningBolt(ctx, width - 64, height - 72, 42, 'rgba(250, 220, 120, 0.96)');
    }

    if (!faces.length && activeFilterId === 'event-frame') {
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.9)';
      ctx.lineWidth = Math.max(8, Math.round(width * 0.013));
      ctx.strokeRect(8, 8, width - 16, height - 16);
      ctx.fillStyle = 'rgba(13, 11, 20, 0.48)';
      ctx.fillRect(0, height - 74, width, 74);
      ctx.fillStyle = '#FCD34D';
      ctx.font = `${Math.max(18, Math.round(width * 0.033))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('Byte Bash Blitz Badge Day 2026', width / 2, height - 28);
    }

    if (!faces.length && activeFilterId === 'logo-overlay') {
      const badgeW = Math.max(130, width * 0.28);
      const badgeH = 46;
      const x = width - badgeW - 20;
      const y = 20;
      ctx.fillStyle = 'rgba(13, 11, 20, 0.6)';
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.75)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x, y, badgeW, badgeH, 14);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FCD34D';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('BYTE BOOTH', x + badgeW / 2, y + 19);
      ctx.font = '12px sans-serif';
      ctx.fillText('BADGE DAY', x + badgeW / 2, y + 35);
    }

    if (!faces.length && activeFilterId === 'wizard-frame') {
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.95)';
      ctx.lineWidth = 10;
      ctx.strokeRect(12, 12, width - 24, height - 24);
      ctx.strokeStyle = 'rgba(250, 220, 120, 0.55)';
      ctx.lineWidth = 2;
      ctx.strokeRect(24, 24, width - 48, height - 48);
      drawLightningBolt(ctx, 28, 28, 42, 'rgba(250, 220, 120, 0.96)');
      drawLightningBolt(ctx, width - 64, height - 72, 42, 'rgba(250, 220, 120, 0.96)');
    }
  };

  const detectFaces = async (video, now) => {
    if (!faceDetectorRef.current) return;
    if (isDetectingRef.current) return;
    if (now - lastDetectTsRef.current < 180) return;

    isDetectingRef.current = true;
    lastDetectTsRef.current = now;
    try {
      const faces = await faceDetectorRef.current.detect(video);
      faceDetectionsRef.current = faces || [];
    } catch {
      faceDetectionsRef.current = [];
    } finally {
      isDetectingRef.current = false;
    }
  };

  const renderFrame = async (now) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      animationRef.current = requestAnimationFrame(renderFrame);
      return;
    }

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      animationRef.current = requestAnimationFrame(renderFrame);
      return;
    }

    ctx.save();
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    // Filters temporarily disabled.
    // ctx.filter = getFilterCss(activeFilterId);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    await detectFaces(video, now);
    // AR and overlay filter drawing temporarily disabled.
    // drawFaceEffects(ctx, faceDetectionsRef.current, canvas.width, canvas.height);

    if (flashPulse) {
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    animationRef.current = requestAnimationFrame(renderFrame);
  };

  const startCamera = async (targetFacingMode = facingMode) => {
    try {
      setIsLoading(true);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: targetFacingMode },
        audio: false,
      });
      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      if (!hasShownCameraPermissionAlertRef.current) {
        alert('Could not access camera. Please check permissions.');
        hasShownCameraPermissionAlertRef.current = true;
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if ('FaceDetector' in window) {
      try {
        faceDetectorRef.current = new window.FaceDetector({
          fastMode: true,
          maxDetectedFaces: 1,
        });
        setFaceTrackingAvailable(true);
      } catch {
        setFaceTrackingAvailable(false);
      }
    }

    startCamera();
    animationRef.current = requestAnimationFrame(renderFrame);

    return () => {
      if (focusTimeoutRef.current) clearTimeout(focusTimeoutRef.current);
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (capturedImage?.url) {
        URL.revokeObjectURL(capturedImage.url);
      }
    };
  }, []);

  const switchCamera = async () => {
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);
    await startCamera(newFacingMode);
  };

  const capturePhoto = () => {
    if (!canvasRef.current) return;
    setIsCapturing(true);

    if (flashMode === 'on' || flashMode === 'auto') {
      setFlashPulse(true);
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = setTimeout(() => setFlashPulse(false), 160);
    }

    canvasRef.current.toBlob((blob) => {
      if (blob) {
        if (capturedImage?.url) URL.revokeObjectURL(capturedImage.url);
        const url = URL.createObjectURL(blob);
        setCapturedImage({ blob, url });
        setShowCaptionForm(true);
      }
      setIsCapturing(false);
    }, 'image/jpeg', 0.92);
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
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    onClose();
  };

  const cycleFlashMode = () => {
    setFlashMode((prev) => {
      if (prev === 'off') return 'auto';
      if (prev === 'auto') return 'on';
      return 'off';
    });
  };

  const handleFocusTap = (event) => {
    if (showCaptionForm) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;

    setFocusPoint({ x, y, id: Date.now() });
    if (focusTimeoutRef.current) clearTimeout(focusTimeoutRef.current);
    focusTimeoutRef.current = setTimeout(() => {
      setFocusPoint(null);
    }, 650);
  };

  return (
    <div
      className={isStandalonePage
        ? 'min-h-screen w-full overflow-hidden relative'
        : 'fixed inset-0 z-50 flex items-end sm:items-center justify-center'}
      style={{ backgroundColor: 'rgba(0,0,0,0.95)' }}
    >
      <div
        className={isStandalonePage
          ? 'w-full h-[100dvh] overflow-hidden'
          : 'w-full sm:w-auto sm:min-w-[480px] sm:max-w-2xl sm:mx-4 sm:rounded-2xl overflow-hidden'}
        style={{
          backgroundColor: '#0A0A0A',
          border: isStandalonePage ? 'none' : '1px solid rgba(212,175,55,0.3)',
          boxShadow: isStandalonePage ? 'none' : '0 0 40px rgba(212,175,55,0.1)',
          maxHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {showCaptionForm ? (
          <div className="flex flex-col flex-1 overflow-y-auto p-4 sm:p-6" style={{ backgroundColor: '#151515' }}>
            <div className="text-center mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-2xl font-bold text-amber-300 mb-1">Add Caption</h3>
              <p className="text-xs sm:text-sm" style={{ color: 'rgba(212,175,55,0.6)' }}>
                Filtered snap is ready
              </p>
            </div>

            <div className="relative mb-4 sm:mb-6 flex-shrink-0">
              <img
                src={capturedImage?.url}
                alt="Captured photo"
                className="w-full max-h-48 sm:max-h-64 object-cover rounded-lg"
                style={{ border: '2px solid rgba(212,175,55,0.3)' }}
              />
            </div>

            <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6 flex-shrink-0">
              <label className="flex items-center gap-2 font-medium text-amber-300 text-sm sm:text-base">
                <Type className="w-4 h-4 text-amber-400" />
                Caption (optional)
              </label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add your Badge Day moment"
                className="w-full p-3 sm:p-4 rounded-lg focus:outline-none resize-none text-amber-100 placeholder-amber-900/60 text-sm sm:text-base"
                style={{
                  backgroundColor: '#12101C',
                  border: '2px solid rgba(212,175,55,0.2)',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(212,175,55,0.6)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(212,175,55,0.2)';
                }}
                rows={2}
                maxLength={500}
              />
              <div className="text-right text-xs" style={{ color: 'rgba(212,175,55,0.4)' }}>
                {caption.length}/500
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3 flex-shrink-0">
              <button
                onClick={handleRetake}
                className="flex items-center justify-center gap-1 sm:gap-2 font-semibold py-3 rounded-lg transition-colors text-sm sm:text-base"
                style={{ backgroundColor: 'rgba(26,26,26,0.9)', color: '#fcd34d', border: '1px solid rgba(212,175,55,0.3)' }}
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
          <>
            <div className="relative bg-black flex-1 min-h-0" onPointerDown={handleFocusTap}>
              <video ref={videoRef} autoPlay playsInline muted className="hidden" />
              <canvas ref={canvasRef} className="w-full h-full object-cover" style={{ maxHeight: '100dvh', minHeight: '240px' }} />

              <div className="absolute inset-0 pointer-events-none">
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.35), rgba(0,0,0,0.05) 35%, rgba(0,0,0,0.35) 100%)',
                  }}
                />
              </div>

              {focusPoint && (
                <div
                  key={focusPoint.id}
                  className="absolute pointer-events-none"
                  style={{ left: focusPoint.x, top: focusPoint.y, transform: 'translate(-50%, -50%)' }}
                >
                  <div className="h-14 w-14 rounded-full border-2 border-amber-300 animate-ping" />
                  <div className="absolute inset-0 h-14 w-14 rounded-full border-2 border-amber-100/90" />
                </div>
              )}

              <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                <button
                  onClick={handleClose}
                  className="rounded-full p-2 transition-colors"
                  style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: '#fef3c7' }}
                  aria-label="Close camera"
                >
                  <X className="w-6 h-6" />
                </button>

                <div className="rounded-full px-3 py-1 text-xs font-semibold"
                  style={{ backgroundColor: 'rgba(0,0,0,0.45)', color: '#fde68a' }}>
                  {faceTrackingAvailable ? 'Face Tracking On' : 'Face Tracking Limited'}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={cycleFlashMode}
                    className="rounded-full p-2 transition-colors"
                    style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: flashMode === 'off' ? '#fef3c7' : '#fbbf24' }}
                    aria-label={`Flash mode ${flashMode}`}
                    title={`Flash: ${flashMode}`}
                  >
                    {flashMode === 'off' ? <ZapOff className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={switchCamera}
                    disabled={isLoading || isCapturing}
                    className="rounded-full p-2 transition-colors disabled:opacity-50"
                    style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: '#fef3c7' }}
                    title={`Switch to ${facingMode === 'user' ? 'back' : 'front'} camera`}
                  >
                    <SwitchCamera className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {isLoading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-400 border-t-transparent mx-auto mb-2" />
                    <p className="text-amber-300 text-sm">Switching camera...</p>
                  </div>
                </div>
              )}

              <div className="absolute bottom-8 left-0 right-0 px-3 py-2"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75), rgba(0,0,0,0.08))' }}>
                <div className="flex items-center justify-center gap-3">
                  {/* Filter strip temporarily disabled.
                  <div className="flex-1 overflow-x-auto">
                    <div className="flex gap-3 snap-x snap-mandatory">
                      {FILTERS.map((filter) => (
                        <button
                          key={filter.id}
                          type="button"
                          onClick={() => setActiveFilterId(filter.id)}
                          className="snap-center flex min-w-[72px] flex-col items-center gap-1 rounded-2xl px-2 py-2 transition-all"
                          style={activeFilterId === filter.id
                            ? { backgroundColor: 'rgba(251, 191, 36, 0.22)', boxShadow: '0 0 16px rgba(251, 191, 36, 0.25)' }
                            : { backgroundColor: 'rgba(13, 11, 20, 0.4)' }}
                        >
                          <span
                            className="h-10 w-10 rounded-full border-2"
                            style={activeFilterId === filter.id
                              ? { borderColor: '#fbbf24', backgroundColor: 'rgba(251, 191, 36, 0.22)' }
                              : { borderColor: 'rgba(253, 230, 138, 0.45)', backgroundColor: 'rgba(0,0,0,0.35)' }}
                          />
                          <span
                            className="text-[11px] font-semibold leading-none whitespace-nowrap"
                            style={activeFilterId === filter.id ? { color: '#fcd34d' } : { color: 'rgba(253, 230, 138, 0.8)' }}
                          >
                            {filter.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                  */}

                  <button
                    onClick={capturePhoto}
                    disabled={isCapturing || isLoading}
                    className="inline-flex items-center justify-center h-20 w-20 rounded-full disabled:opacity-50"
                    style={{
                      border: '4px solid #fff',
                      boxShadow: '0 0 0 6px rgba(255,255,255,0.25)',
                      backgroundColor: isCapturing ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)',
                    }}
                    aria-label="Take photo"
                  >
                    <Camera className="w-8 h-8 text-white" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CameraCapture;
