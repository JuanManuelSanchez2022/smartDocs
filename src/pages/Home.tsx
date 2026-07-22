import React from 'react';
import {
  Grid,
  Card,
  CardActionArea,
  CardContent,
  Typography,
  Box,
  Container
} from '@mui/material';
import {
  CameraAlt as CameraIcon,
  FolderOpen as FolderIcon,
  History as HistoryIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';

interface HomeProps {
  onNavigate: (page: string) => void;
}

export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const menuItems = [
    {
      id: 'capture',
      title: 'Capturar',
      description: 'Toma una foto en tiempo real con la cámara web de tu dispositivo.',
      icon: <CameraIcon sx={{ fontSize: 48 }} />,
      color: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)', // Violet
      shadow: 'rgba(139, 92, 246, 0.3)'
    },
    {
      id: 'open-file',
      title: 'Abrir Archivo',
      description: 'Sube un documento local (JPG, PNG, PDF, XLS, XLSX) para digitalizarlo.',
      icon: <FolderIcon sx={{ fontSize: 48 }} />,
      color: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)', // Pink
      shadow: 'rgba(219, 39, 119, 0.3)'
    },
    {
      id: 'history',
      title: 'Historial',
      description: 'Revisa, busca, filtra y exporta todos los documentos digitalizados previamente.',
      icon: <HistoryIcon sx={{ fontSize: 48 }} />,
      color: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', // Blue
      shadow: 'rgba(37, 99, 235, 0.3)'
    },
    {
      id: 'settings',
      title: 'Configuración',
      description: 'Ajusta los parámetros técnicos de OpenCV, idioma del OCR y la base de datos.',
      icon: <SettingsIcon sx={{ fontSize: 48 }} />,
      color: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', // Green
      shadow: 'rgba(5, 150, 105, 0.3)'
    }
  ];

  return (
    <Container maxWidth="md" sx={{ mt: { xs: 2, md: 8 }, mb: 4, display: 'flex', flexDirection: 'column', justifyContent: 'center', flexGrow: 1 }}>
      {/* Title section */}
      <Box sx={{ textAlign: 'center', mb: 6 }} className="animate-fade-in">
        <Typography 
          variant="h3" 
          component="h1" 
          sx={{ 
            fontFamily: 'Outfit', 
            fontWeight: 800, 
            letterSpacing: '-0.5px',
            mb: 2
          }}
        >
          Digitalización de Documentos
        </Typography>
        <Typography 
          variant="h6" 
          color="text.secondary" 
          sx={{ fontWeight: 400, maxWidth: 600, mx: 'auto', lineHeight: 1.5 }}
        >
          Procesa, clasifica y extrae datos estructurados localmente en tu navegador. 
          Totalmente privado, rápido y 100% offline.
        </Typography>
      </Box>

      {/* Grid of buttons */}
      <Grid container spacing={3} className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
        {menuItems.map((item) => (
          <Grid item xs={12} sm={6} key={item.id}>
            <Card
              sx={{
                borderRadius: 4,
                overflow: 'hidden',
                transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-6px)',
                  boxShadow: `0 20px 25px -5px ${item.shadow}, 0 10px 10px -5px ${item.shadow}`
                }
              }}
            >
              <CardActionArea 
                onClick={() => onNavigate(item.id)}
                sx={{ height: '100%', p: 2 }}
              >
                <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 2 }}>
                  {/* Icon with gradient circle */}
                  <Box
                    sx={{
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      background: item.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      boxShadow: `0 10px 15px -3px ${item.shadow}`
                    }}
                  >
                    {item.icon}
                  </Box>

                  <Box>
                    <Typography 
                      variant="h5" 
                      component="h2" 
                      sx={{ 
                        fontFamily: 'Outfit', 
                        fontWeight: 700, 
                        mb: 1 
                      }}
                    >
                      {item.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ px: 2, height: 40, overflow: 'hidden' }}>
                      {item.description}
                    </Typography>
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};
