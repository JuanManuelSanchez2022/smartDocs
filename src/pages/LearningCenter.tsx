import React, { useMemo, useState, useEffect } from 'react';
import { Box, Typography, Grid, Card, CardContent, Button, Chip, Stack } from '@mui/material';
import { ArrowBack as BackIcon, AutoGraph as GraphIcon } from '@mui/icons-material';
import { useDocumentStore } from '../hooks/useDocumentStore';
import { LearningCenterService } from '../services/learning/LearningCenterService';
import { LearningQueue } from '../services/learning/LearningQueue';
import { LearningQueuePanel } from '../components/LearningQueue';
import { NormalizedTable } from '../components/NormalizedTable';

interface LearningCenterProps {
  onNavigate: (page: string) => void;
}

export const LearningCenter: React.FC<LearningCenterProps> = ({ onNavigate }) => {
  const documents = useDocumentStore((state) => state.documents);
  const [manualCorrections, setManualCorrections] = useState<number>(0);
  const summary = useMemo(
    () => LearningCenterService.getSummary(documents, manualCorrections),
    [documents, manualCorrections]
  );

  useEffect(() => {
    LearningQueue.setItems(summary.pendingTokens);
  }, [summary.pendingTokens]);

  const latestDocument = documents.find((doc) => doc.status === 'success');

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
                    Métricas activas para el aprendizaje supervisado.
                  </Typography>
                </Box>
                <Chip icon={<GraphIcon />} label="Activo" color="success" />
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Card sx={{ borderRadius: 3, p: 2, height: '100%' }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Documentos procesados</Typography>
                    <Typography variant="h3" sx={{ fontWeight: 800 }}>{summary.documentsProcessed}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Documentos con resultados extraídos.
                    </Typography>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Card sx={{ borderRadius: 3, p: 2, height: '100%' }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Registros normalizados</Typography>
                    <Typography variant="h3" sx={{ fontWeight: 800 }}>{summary.recordsNormalized}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Registros construidos y listos para revisión.
                    </Typography>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Card sx={{ borderRadius: 3, p: 2, height: '100%' }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Campos clasificados automáticamente</Typography>
                    <Typography variant="h3" sx={{ fontWeight: 800 }}>{summary.fieldsAutoClassified}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      No aparecerán en la cola de aprendizaje.
                    </Typography>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Card sx={{ borderRadius: 3, p: 2, height: '100%' }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Campos pendientes</Typography>
                    <Typography variant="h3" sx={{ fontWeight: 800 }}>{summary.fieldsPending}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Enviados al Centro de Aprendizaje.
                    </Typography>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Card sx={{ borderRadius: 3, p: 2, height: '100%' }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Campos corregidos manualmente</Typography>
                    <Typography variant="h3" sx={{ fontWeight: 800 }}>{summary.fieldsCorrected}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Correcciones activas en memoria.
                    </Typography>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Card sx={{ borderRadius: 3, p: 2, height: '100%' }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Confianza promedio</Typography>
                    <Typography variant="h3" sx={{ fontWeight: 800 }}>{Math.round(summary.averageConfidence * 100)}%</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Nivel promedio del documento.
                    </Typography>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Card sx={{ borderRadius: 3, p: 2, height: '100%' }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Estimación de precisión</Typography>
                    <Typography variant="h3" sx={{ fontWeight: 800 }}>{Math.round(summary.estimatedPrecision * 100)}%</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Aproximación de la precisión del documento.
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
                <Typography variant="body2">Campos en cola de aprendizaje: {summary.fieldsPending}</Typography>
                <Typography variant="body2">Documentos pendientes: {summary.pendingDocuments.length}</Typography>
                <Typography variant="body2">Registros normalizados: {summary.recordsNormalized}</Typography>
              </Stack>
            </Card>
            <Card sx={{ borderRadius: 4, p: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Acciones rápidas</Typography>
              <Stack spacing={1}>
                <Button variant="contained" color="primary" fullWidth onClick={() => onNavigate('review')}>
                  Revisar documentos pendientes
                </Button>
                <Button variant="outlined" color="primary" fullWidth>
                  Exportar cola de aprendizaje
                </Button>
              </Stack>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      <LearningQueuePanel
        documents={documents}
        manualCorrections={manualCorrections}
        setManualCorrections={setManualCorrections}
      />

      <NormalizedTable documents={latestDocument?.parsedRecords} />
    </Box>
  );
};
