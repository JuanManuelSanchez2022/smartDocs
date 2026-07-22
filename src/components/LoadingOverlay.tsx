import React from 'react';
import { useDocumentStore } from '../hooks/useDocumentStore';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  LinearProgress,
  Button
} from '@mui/material';
import { Cancel as CancelIcon } from '@mui/icons-material';

export const LoadingOverlay: React.FC = () => {
  const processing = useDocumentStore((state) => state.processing);
  const cancelProcessing = useDocumentStore((state) => state.cancelProcessing);

  const open = processing.status === 'processing';

  return (
    <Dialog
      open={open}
      disableEscapeKeyDown
      onClose={(event, reason) => {
        // Prevent closing on backdrop click or escape key press
        if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
          return;
        }
      }}
      PaperProps={{
        sx: {
          p: 2,
          minWidth: { xs: 280, sm: 400 },
          textAlign: 'center',
          borderRadius: 4,
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)'
        }
      }}
    >
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, my: 1 }}>
          
          {/* Logo animation or processing loader */}
          <Box sx={{ position: 'relative', display: 'inline-flex' }}>
            <Box
              sx={{
                width: 70,
                height: 70,
                borderRadius: '50%',
                border: '4px solid',
                borderColor: 'primary.light',
                borderTopColor: 'secondary.main',
                animation: 'spin 1.5s linear infinite',
              }}
            />
            <Typography
              variant="h4"
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                lineHeight: 1
              }}
            >
              📑
            </Typography>
          </Box>

          <style>
            {`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}
          </style>

          <Box sx={{ width: '100%' }}>
            <Typography variant="h6" sx={{ fontFamily: 'Outfit', fontWeight: 600, mb: 1 }}>
              Procesando Documento
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ minHeight: 40, mb: 2 }}>
              {processing.step}
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
              <Box sx={{ width: '100%', mr: 1 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={processing.progress} 
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
              <Box sx={{ minWidth: 35 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                  {`${processing.progress}%`}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Button
            variant="outlined"
            color="error"
            startIcon={<CancelIcon />}
            onClick={cancelProcessing}
            sx={{ mt: 1, borderRadius: 2 }}
          >
            Cancelar Proceso
          </Button>

        </Box>
      </DialogContent>
    </Dialog>
  );
};
