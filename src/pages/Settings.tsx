import React from 'react';
import { useDocumentStore } from '../hooks/useDocumentStore';
import {
  Box,
  Typography,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Button,
  Grid,
  Divider,
  IconButton
} from '@mui/material';
import {
  DeleteForever as ClearDbIcon,
  ArrowBack as BackIcon
} from '@mui/icons-material';

interface SettingsProps {
  onNavigate: (page: string) => void;
}

export const Settings: React.FC<SettingsProps> = ({ onNavigate }) => {
  const config = useDocumentStore((state) => state.config);
  const updateConfig = useDocumentStore((state) => state.updateConfig);
  const documents = useDocumentStore((state) => state.documents);
  const clearHistory = useDocumentStore((state) => state.clearHistory);

  const handleLangChange = (val: 'spa' | 'eng') => {
    updateConfig({ ocrLang: val });
  };

  const handleSliderChange = (key: 'contrast' | 'binarizationBlock' | 'binarizationC', val: number) => {
    updateConfig({ [key]: val });
  };

  const handleRestoreDefaults = () => {
    updateConfig({
      ocrLang: 'spa',
      contrast: 1.2,
      binarizationBlock: 15,
      binarizationC: 5
    });
  };

  return (
    <Box className="animate-fade-in" sx={{ display: 'flex', flexDirection: 'column', gap: 3, flexGrow: 1, maxWidth: 800, mx: 'auto', width: '100%' }}>
      
      {/* Header */}
      <Box sx={{ display: 'flex', width: '100%', alignItems: 'center' }}>
        <IconButton onClick={() => onNavigate('home')} color="inherit" sx={{ mr: 2 }}>
          <BackIcon />
        </IconButton>
        <Typography variant="h5" component="h2" sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>
          Configuración Técnica
        </Typography>
      </Box>

      <Grid container spacing={3}>
        
        {/* 1. OCR Settings */}
        <Grid item xs={12}>
          <Card sx={{ borderRadius: 4 }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Typography variant="h6" sx={{ fontFamily: 'Outfit', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                ⚙ Configuración del Motor OCR
              </Typography>
              <Divider />
              
              <Box sx={{ maxWidth: 300 }}>
                <FormControl fullWidth size="small">
                  <InputLabel id="ocr-lang-label">Idioma del OCR</InputLabel>
                  <Select
                    labelId="ocr-lang-label"
                    value={config.ocrLang}
                    label="Idioma del OCR"
                    onChange={(e) => handleLangChange(e.target.value as 'spa' | 'eng')}
                  >
                    <MenuItem value="spa">Español (spa)</MenuItem>
                    <MenuItem value="eng">Inglés (eng)</MenuItem>
                  </Select>
                </FormControl>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  El idioma seleccionado define qué paquete de datos entrenados local (`tessdata`) cargará el motor Tesseract.js.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 2. OpenCV Settings */}
        <Grid item xs={12}>
          <Card sx={{ borderRadius: 4 }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" sx={{ fontFamily: 'Outfit', fontWeight: 600 }}>
                  👁 Parámetros de Procesamiento (OpenCV)
                </Typography>
                <Button size="small" onClick={handleRestoreDefaults}>
                  Restaurar Valores
                </Button>
              </Box>
              <Divider />

              {/* Slider for Contrast */}
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Factor de Contraste (Alfa)
                  </Typography>
                  <Typography variant="body2" color="primary.main" sx={{ fontWeight: 'bold' }}>
                    {config.contrast}x
                  </Typography>
                </Box>
                <Slider
                  value={config.contrast}
                  min={1.0}
                  max={3.0}
                  step={0.1}
                  onChange={(_, val) => handleSliderChange('contrast', val as number)}
                  valueLabelDisplay="auto"
                />
                <Typography variant="caption" color="text.secondary">
                  Aumenta el contraste de la imagen para oscurecer las letras y aclarar el fondo. Un valor de 1.2 es ideal para la mayoría de los casos.
                </Typography>
              </Box>

              {/* Slider for BlockSize */}
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Tamaño de Bloque Binarización (BlockSize)
                  </Typography>
                  <Typography variant="body2" color="primary.main" sx={{ fontWeight: 'bold' }}>
                    {config.binarizationBlock}px
                  </Typography>
                </Box>
                <Slider
                  value={config.binarizationBlock}
                  min={3}
                  max={31}
                  step={2} // Must be odd number
                  onChange={(_, val) => handleSliderChange('binarizationBlock', val as number)}
                  valueLabelDisplay="auto"
                />
                <Typography variant="caption" color="text.secondary">
                  Define el tamaño del vecindario de píxeles utilizado para calcular el umbral adaptativo. Debe ser un número impar.
                </Typography>
              </Box>

              {/* Slider for Constant C */}
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Constante de Resta Binarización (C)
                  </Typography>
                  <Typography variant="body2" color="primary.main" sx={{ fontWeight: 'bold' }}>
                    {config.binarizationC}
                  </Typography>
                </Box>
                <Slider
                  value={config.binarizationC}
                  min={1}
                  max={20}
                  step={1}
                  onChange={(_, val) => handleSliderChange('binarizationC', val as number)}
                  valueLabelDisplay="auto"
                />
                <Typography variant="caption" color="text.secondary">
                  Constante restada de la media ponderada de píxeles locales. Ayuda a eliminar sombras y ruido de fondo.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 3. System Storage */}
        <Grid item xs={12}>
          <Card sx={{ borderRadius: 4 }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Typography variant="h6" sx={{ fontFamily: 'Outfit', fontWeight: 600 }}>
                💾 Almacenamiento Local (IndexedDB)
              </Typography>
              <Divider />
              
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={8}>
                  <Typography variant="body2">
                    Actualmente hay <strong>{documents.length}</strong> documentos almacenados en tu base de datos local del navegador.
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                    Toda la información reside únicamente en tu dispositivo. Al borrar el historial, la base de datos se vaciará por completo.
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<ClearDbIcon />}
                    onClick={() => {
                      if (window.confirm('¿Seguro que deseas eliminar todos los registros locales? Esta acción vaciará la base de datos IndexedDB.')) {
                        clearHistory();
                        alert('Base de datos vaciada con éxito.');
                      }
                    }}
                    sx={{ borderRadius: 2 }}
                    disabled={documents.length === 0}
                  >
                    Vaciar Base de Datos
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

      </Grid>
    </Box>
  );
};
