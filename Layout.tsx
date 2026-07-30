import React from 'react';
import { useDocumentStore } from '../hooks/useDocumentStore';
import {
  Box, AppBar, Toolbar, Typography, IconButton, Button,
  Container, Chip, useTheme, Tooltip, Badge,
} from '@mui/material';
import {
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  WifiOff as OfflineIcon,
  CameraAlt as CameraIcon,
  FolderOpen as FileIcon,
  History as HistoryIcon,
  Settings as SettingsIcon,
  Home as HomeIcon,
  School as LearningIcon,  // ← Fase 1
} from '@mui/icons-material';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentPage, onPageChange }) => {
  const config      = useDocumentStore(state => state.config);
  const updateConfig = useDocumentStore(state => state.updateConfig);
  const documents   = useDocumentStore(state => state.documents);

  // Total de items pendientes de revisión en todos los documentos
  const totalPendientes = documents.reduce(
    (sum, doc) => sum + (doc.itemsPendientes ?? 0),
    0
  );

  const navButton = (
    page: string,
    label: string,
    icon: React.ReactNode,
    badge?: number
  ) => (
    <Button
      startIcon={
        badge && badge > 0 ? (
          <Badge badgeContent={badge} color="error" max={99}>
            {icon}
          </Badge>
        ) : (
          icon
        )
      }
      onClick={() => onPageChange(page)}
      sx={{
        fontWeight: 600,
        color: currentPage === page ? 'primary.main' : 'text.secondary',
        borderRadius: 2,
      }}
    >
      {label}
    </Button>
  );

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
            <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => onPageChange('home')}>
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
                  gap: 1,
                }}
              >
                📑 DocuMind
              </Typography>
            </Box>

            {/* Navegación desktop */}
            <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}>
              {navButton('home',      'Inicio',       <HomeIcon />)}
              {navButton('capture',   'Capturar',     <CameraIcon />)}
              {navButton('open-file', 'Abrir Archivo',<FileIcon />)}
              {navButton('history',   'Historial',    <HistoryIcon />)}
              {navButton('learning',  'Aprendizaje',  <LearningIcon />, totalPendientes)}
              {navButton('settings',  'Configurar',   <SettingsIcon />)}
            </Box>

            {/* Badges y acciones */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip
                icon={<OfflineIcon fontSize="small" style={{ color: '#ffb020' }} />}
                label="Offline"
                variant="outlined"
                sx={{
                  borderColor: 'rgba(255,176,32,0.3)',
                  color: '#ffb020',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  backgroundColor: 'rgba(255,176,32,0.05)',
                  height: 24,
                }}
              />
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

      {/* Contenido */}
      <Box component="main" sx={{ flexGrow: 1, py: 4, display: 'flex', flexDirection: 'column' }}>
        <Container maxWidth="xl" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          {children}
        </Container>
      </Box>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          py: 3, px: 2, mt: 'auto',
          borderTop: '1px solid', borderColor: 'divider',
          textAlign: 'center',
          bgcolor: config.darkMode ? 'rgba(11,10,18,0.5)' : 'rgba(240,240,245,0.5)',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          DocuMind MVP — Procesamiento de documentos 100% en el cliente.
        </Typography>
      </Box>
    </Box>
  );
};
