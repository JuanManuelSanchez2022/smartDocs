import React, { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField
} from '@mui/material';
import { ArrowBack as BackIcon, CheckCircleOutline as ValidateIcon, AutoGraph as GraphIcon } from '@mui/icons-material';
import { useDocumentStore } from '../hooks/useDocumentStore';
import { LearningCenterService } from '../services/learning/LearningCenterService';
import { DocumentCategory } from '../types/document';

interface LearningCenterProps {
  onNavigate: (page: string) => void;
}

export const LearningCenter: React.FC<LearningCenterProps> = ({ onNavigate }) => {
  const documents = useDocumentStore((state) => state.documents);
  const [corrections, setCorrections] = useState<Record<string, { category: DocumentCategory; correctedValue: string }>>({});
  const summary = useMemo(() => LearningCenterService.getSummary(documents), [documents]);

  const lowConfidenceTokens = summary.pendingTokens;

  const handleCorrectionChange = (id: string, field: 'category' | 'correctedValue', value: string) => {
    setCorrections((current) => ({
      ...current,
      [id]: {
        category: field === 'category' ? (value as DocumentCategory) : current[id]?.category || 'otro',
        correctedValue: field === 'correctedValue' ? value : current[id]?.correctedValue || ''
      }
    }));
  };

  const handleSaveCorrection = (id: string) => {
    const correction = corrections[id];
    if (!correction) return;
    // TODO: save correction in knowledge base when feature is implemented
    window.alert(`Corrección guardada para token ${id}`);
  };

  return (
    <Box className="animate-fade-in" sx={{ display: 'flex', flexDirection: 'column', gap: 3, flexGrow: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h5" component="h2" sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>
            Centro de Aprendizaje
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 680 }}>
            Revisa los documentos pendientes y ayuda al sistema a aprender con cada corrección.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          color="primary"
          startIcon={<BackIcon />}
          onClick={() => onNavigate('home')}
          sx={{ borderRadius: 2 }}
        >
          Volver al Inicio
        </Button>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card sx={{ borderRadius: 4, height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>Resumen de Aprendizaje</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Las métricas se actualizan automáticamente con cada documento procesado.
                  </Typography>
                </Box>
                <Chip icon={<GraphIcon />} label="Activo" color="success" />
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Card sx={{ borderRadius: 3, p: 2, height: '100%' }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Documentos pendientes</Typography>
                    <Typography variant="h3" sx={{ fontWeight: 800 }}>{summary.pendingDocuments.length}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Requieren revisión o validación manual.
                    </Typography>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Card sx={{ borderRadius: 3, p: 2, height: '100%' }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Diseños nuevos</Typography>
                    <Typography variant="h3" sx={{ fontWeight: 800 }}>{summary.newLayouts.length}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Diseños de proveedor que el sistema aún no ha reutilizado.
                    </Typography>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Card sx={{ borderRadius: 3, p: 2, height: '100%' }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Productos desconocidos</Typography>
                    <Typography variant="h3" sx={{ fontWeight: 800 }}>{summary.unknownProducts.length}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Elementos detectados que aún no existen en el catálogo maestro.
                    </Typography>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Card sx={{ borderRadius: 3, p: 2, height: '100%' }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Categorías nuevas</Typography>
                    <Typography variant="h3" sx={{ fontWeight: 800 }}>{summary.newCategories.length}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Categorías emergentes que el sistema requiere confirmar.
                    </Typography>
                  </Card>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Stack spacing={2}>
            <Card sx={{ borderRadius: 4, p: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Señales prioritarias</Typography>
              <Stack spacing={1}>
                <Typography variant="body2">OCR con baja confianza: {summary.lowConfidenceItems.length}</Typography>
                <Typography variant="body2">Documentos pendientes: {summary.pendingDocuments.length}</Typography>
                <Typography variant="body2">Tokens pendientes: {summary.pendingTokens.length}</Typography>
              </Stack>
            </Card>
            <Card sx={{ borderRadius: 4, p: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Acciones rápidas</Typography>
              <Stack spacing={1}>
                <Button variant="contained" color="primary" fullWidth startIcon={<ValidateIcon />}>
                  Revisar documentos pendientes
                </Button>
                <Button variant="outlined" color="primary" fullWidth>
                  Actualizar catálogo maestro
                </Button>
              </Stack>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      <Card sx={{ mt: 4, borderRadius: 4 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Tokens de baja confianza</Typography>
          <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Texto OCR</TableCell>
                  <TableCell>Categoría propuesta</TableCell>
                  <TableCell>Confianza</TableCell>
                  <TableCell>Corrección</TableCell>
                  <TableCell>Guardar</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lowConfidenceTokens.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      No hay tokens pendientes de revisión.
                    </TableCell>
                  </TableRow>
                ) : (
                  lowConfidenceTokens.map((item) => {
                    const current = corrections[item.id] || { category: item.category, correctedValue: item.rawText };
                    return (
                      <TableRow key={item.id}>
                        <TableCell>{item.rawText}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>{Math.round(item.confidence * 100)}%</TableCell>
                        <TableCell>
                          <TextField
                            value={current.correctedValue}
                            size="small"
                            onChange={(e) => handleCorrectionChange(item.id, 'correctedValue', e.target.value)}
                            sx={{ minWidth: 200 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => handleSaveCorrection(item.id)}
                          >
                            Guardar
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};
