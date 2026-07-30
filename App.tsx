import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { useDocumentStore } from './hooks/useDocumentStore';
import { Layout }           from './components/Layout';
import { LoadingOverlay }   from './components/LoadingOverlay';
import { Home }             from './pages/Home';
import { Capture }          from './pages/Capture';
import { OpenFile }         from './pages/OpenFile';
import { History }          from './pages/History';
import { Settings }         from './pages/Settings';
import { Learning }         from './pages/Learning';  // ← Fase 1

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<string>('home');
  const config      = useDocumentStore(state => state.config);
  const loadHistory = useDocumentStore(state => state.loadHistory);

  useEffect(() => {
    loadHistory();
    document.documentElement.classList.toggle('dark', config.darkMode);
  }, []);

  const theme = createTheme({
    palette: {
      mode: config.darkMode ? 'dark' : 'light',
      primary:    { main: '#8a5cf6' },
      secondary:  { main: '#d946ef' },
      background: {
        default: config.darkMode ? '#0b0a12' : '#f6f5fa',
        paper:   config.darkMode ? 'rgba(22, 20, 36, 0.75)' : '#ffffff',
      },
      text: {
        primary:   config.darkMode ? '#f1f0f7' : '#1e1b2d',
        secondary: config.darkMode ? '#a19fb0' : '#615f75',
      },
    },
    typography: {
      fontFamily: "'Outfit', 'Roboto', sans-serif",
      h3: { fontFamily: "'Outfit', sans-serif" },
      h4: { fontFamily: "'Outfit', sans-serif" },
      h5: { fontFamily: "'Outfit', sans-serif" },
      h6: { fontFamily: "'Outfit', sans-serif" },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    shape: { borderRadius: 12 },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            border: '1px solid',
            borderColor: config.darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            boxShadow: config.darkMode
              ? '0 4px 20px rgba(0,0,0,0.3)'
              : '0 4px 20px rgba(0,0,0,0.05)',
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderColor: config.darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          },
        },
      },
    },
  });

  const renderPage = () => {
    switch (currentPage) {
      case 'home':      return <Home      onNavigate={setCurrentPage} />;
      case 'capture':   return <Capture   onNavigate={setCurrentPage} />;
      case 'open-file': return <OpenFile  onNavigate={setCurrentPage} />;
      case 'history':   return <History   onNavigate={setCurrentPage} />;
      case 'settings':  return <Settings  onNavigate={setCurrentPage} />;
      case 'learning':  return <Learning  onNavigate={setCurrentPage} />;  // ← Fase 1
      default:          return <Home      onNavigate={setCurrentPage} />;
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
        {renderPage()}
      </Layout>
      <LoadingOverlay />
    </ThemeProvider>
  );
};
