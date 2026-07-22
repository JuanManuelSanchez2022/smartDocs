import React, { useRef, useState, useEffect } from 'react';
import { useDocumentStore } from '../hooks/useDocumentStore';
import {
  Box,
  Button,
  Typography,
  Card,
  IconButton,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  CameraAlt as CameraIcon,
  Replay as ReplayIcon,
  Check as CheckIcon,
  ArrowBack as BackIcon,
  FlipCameraIos as FlipIcon
} from '@mui/icons-material';

interface CaptureProps {
  onNavigate: (page: string) => void;
}

export const Capture: React.FC<CaptureProps> = ({ onNavigate }) => {
  const processFile = useDocumentStore((state) => state.processFile);
  const resetProcessing = useDocumentStore((state) => state.resetProcessing);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  const startCamera = async (mode: 'user' | 'environment') => {
    setLoading(true);
    setError(null);
    
    // Stop any existing stream
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setLoading(false);
    } catch (err: any) {
      console.error('Error accessing webcam:', err);
      setError(
        'No se pudo acceder a la cámara. Asegúrate de otorgar los permisos necesarios o verifica que ningún otro programa la esté usando.'
      );
      setLoading(false);
    }
  };

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw current video frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to base64 URL
        const dataUrl = canvas.toDataURL('image/png');
        setPhoto(dataUrl);
        
        // Stop the camera feed while reviewing
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }
      }
    }
  };

  const handleRetake = () => {
    setPhoto(null);
    startCamera(facingMode);
  };

  const handleConfirm = async () => {
    if (photo) {
      resetProcessing();
      onNavigate('open-file'); // Go to processing details page
      // Trigger process in store
      const name = `Captura_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '_')}.png`;
      await processFile(photo, name);
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
  };

  return (
    <Box className="animate-fade-in" sx={{ display: 'flex', flexDirection: 'column', gap: 3, flexGrow: 1, alignItems: 'center' }}>
      
      {/* Header section */}
      <Box sx={{ display: 'flex', width: '100%', alignItems: 'center', mb: 1 }}>
        <IconButton onClick={() => onNavigate('home')} color="inherit" sx={{ mr: 2 }}>
          <BackIcon />
        </IconButton>
        <Typography variant="h5" component="h2" sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>
          Capturar con Cámara
        </Typography>
      </Box>

      {error ? (
        <Alert severity="error" sx={{ width: '100%', maxWidth: 640 }}>
          {error}
          <Box sx={{ mt: 2 }}>
            <Button variant="outlined" color="error" onClick={() => startCamera(facingMode)} sx={{ mr: 2 }}>
              Reintentar
            </Button>
            <Button variant="contained" onClick={() => onNavigate('open-file')}>
              Subir Archivo Local
            </Button>
          </Box>
        </Alert>
      ) : (
        <Card
          sx={{
            width: '100%',
            maxWidth: 640,
            aspectRatio: '4/3',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            borderRadius: 4,
            border: '2px solid rgba(255,255,255,0.08)',
            backgroundColor: 'black'
          }}
        >
          {loading && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, color: 'white' }}>
              <CircularProgress color="inherit" />
              <Typography variant="body2">Iniciando cámara...</Typography>
            </Box>
          )}

          {/* Video Stream */}
          {!photo && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: loading ? 'none' : 'block'
              }}
            />
          )}

          {/* Captured Image Preview */}
          {photo && (
            <img
              src={photo}
              alt="Capture review"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          )}

          {/* Overlay Grid lines for framing */}
          {!photo && !loading && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                pointerEvents: 'none',
                border: '20px solid rgba(0, 0, 0, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {/* Document boundary guide box */}
              <Box
                sx={{
                  width: '80%',
                  height: '80%',
                  border: '2px dashed rgba(255, 255, 255, 0.6)',
                  borderRadius: 2,
                  position: 'relative'
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    position: 'absolute',
                    bottom: -25,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    color: 'white',
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 1,
                    whiteSpace: 'nowrap'
                  }}
                >
                  Encuadra el documento aquí
                </Typography>
              </Box>
            </Box>
          )}
        </Card>
      )}

      {/* Control Buttons */}
      {!loading && !error && (
        <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', width: '100%' }}>
          {!photo ? (
            <>
              <Button
                variant="outlined"
                startIcon={<FlipIcon />}
                onClick={toggleCamera}
                sx={{ borderRadius: 3 }}
              >
                Girar
              </Button>
              
              <Button
                variant="contained"
                color="primary"
                size="large"
                startIcon={<CameraIcon />}
                onClick={capturePhoto}
                sx={{
                  borderRadius: 6,
                  height: 56,
                  px: 4,
                  fontSize: '1.1rem'
                }}
              >
                Capturar Foto
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outlined"
                color="inherit"
                startIcon={<ReplayIcon />}
                onClick={handleRetake}
                sx={{ borderRadius: 3, height: 50, px: 3 }}
              >
                Volver a Tomar
              </Button>
              
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckIcon />}
                onClick={handleConfirm}
                sx={{
                  borderRadius: 3,
                  height: 50,
                  px: 4,
                  fontSize: '1rem',
                  boxShadow: '0 4px 14px rgba(46, 125, 50, 0.4) !important',
                  background: 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%) !important',
                  '&:hover': {
                    transform: 'translateY(-2px) !important',
                    boxShadow: '0 6px 20px rgba(46, 125, 50, 0.6) !important',
                  }
                }}
              >
                Procesar Documento
              </Button>
            </>
          )}
        </Box>
      )}

      {/* Offscreen canvas used to capture frames */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </Box>
  );
};
