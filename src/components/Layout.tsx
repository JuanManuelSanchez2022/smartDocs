import React from 'react';
import { useDocumentStore } from '../hooks/useDocumentStore';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Button,
  Container,
  Chip,
  useTheme,
  Switch,
  Tooltip
} from '@mui/material';
import {
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  WifiOff as OfflineIcon,
  CameraAlt as CameraIcon,
  FolderOpen as FileIcon,
  History as HistoryIcon,
  Settings as SettingsIcon,
  Home as HomeIcon
} from '@mui/icons-material';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentPage, onPageChange }) => {
  const config = useDocumentStore((state) => state.config);
  const updateConfig = useDocumentStore((state) => state.updateConfig);
  const theme = useTheme();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default', color: 'text.primary' }}>
      {/* Header */}
      <AppBar 
        position="sticky" 
        elevation={0}
        sx={{
          background: config.darkMode ? 'rgba(11, 10, 18, 0.8)' : 'rgba(246, 245, 250, 0.8)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Container maxWidth="xl">
          <Toolbar disableGutters sx={{ justifyContent: 'space-between' }}>
            {/* Logo */}
            <Box 
              sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => onPageChange('home')}
            >
              <Typography
                variant="h5"
                noWrap
                component="div"
                sx={{
                  fontFamily: 'Outfit',
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #8a5cf6 0%, #d946ef 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                📑 DocuMind
              </Typography>
            </Box>

            {/* Navigation links (Desktop) */}
            <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}>
              <Button
                startIcon={<HomeIcon />}
                onClick={() => onPageChange('home')}
                variant={currentPage === 'home' ? 'text' : 'text'}
                sx={{
                  fontWeight: 600,
                  color: currentPage === 'home' ? 'primary.main' : 'text.secondary',
                  borderRadius: 2
                }}
              >
                Inicio
              </Button>
              <Button
                startIcon={<CameraIcon />}
                onClick={() => onPageChange('capture')}
                sx={{
                  fontWeight: 600,
                  color: currentPage === 'capture' ? 'primary.main' : 'text.secondary',
                  borderRadius: 2
                }}
              >
                Capturar
              </Button>
              <Button
                startIcon={<FileIcon />}
                onClick={() => onPageChange('open-file')}
                sx={{
                  fontWeight: 600,
                  color: currentPage === 'open-file' ? 'primary.main' : 'text.secondary',
                  borderRadius: 2
                }}
              >
                Abrir Archivo
              </Button>
              <Button
                startIcon={<HistoryIcon />}
                onClick={() => onPageChange('history')}
                sx={{
                  fontWeight: 600,
                  color: currentPage === 'history' ? 'primary.main' : 'text.secondary',
                  borderRadius: 2
                }}
              >
                Historial
              </Button>
              <Button
                startIcon={<SettingsIcon />}
                onClick={() => onPageChange('settings')}
                sx={{
                  fontWeight: 600,
                  color: currentPage === 'settings' ? 'primary.main' : 'text.secondary',
                  borderRadius: 2
                }}
              >
                Configurar
              </Button>
            </Box>

            {/* Badges & Actions */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {/* Offline Badge */}
              <Chip
                icon={<OfflineIcon fontSize="small" style={{ color: '#ffb020' }} />}
                label="Offline"
                variant="outlined"
                sx={{
                  borderColor: 'rgba(255, 176, 32, 0.3)',
                  color: '#ffb020',
                  fontWeight: '600',
                  fontSize: '0.75rem',
                  backgroundColor: 'rgba(255, 176, 32, 0.05)',
                  height: 24
                }}
              />

              {/* Dark mode switch */}
              <Tooltip title={config.darkMode ? 'Modo Claro' : 'Modo Oscuro'}>
                <IconButton 
                  onClick={() => updateConfig({ darkMode: !config.darkMode })}
                  color="inherit"
                  sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 0.5 }}
                >
                  {config.darkMode ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      {/* Main Content Area */}
      <Box component="main" sx={{ flexGrow: 1, py: 4, display: 'flex', flexDirection: 'column' }}>
        <Container maxWidth="xl" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          {children}
        </Container>
      </Box>

      {/* Footer */}
      <Box 
        component="footer" 
        sx={{
          py: 3, 
          px: 2, 
          mt: 'auto',
          borderTop: '1px solid',
          borderColor: 'divider',
          textAlign: 'center',
          bgcolor: config.darkMode ? 'rgba(11, 10, 18, 0.5)' : 'rgba(240, 240, 245, 0.5)'
        }}
      >
        <Typography variant="body2" color="text.secondary">
          DocuMind MVP — Procesamiento de documentos 100% en el cliente.
        </Typography>
      </Box>
    </Box>
  );
};
