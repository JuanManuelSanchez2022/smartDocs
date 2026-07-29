import React, { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Stack,
  Chip,
  Divider,
  Grid,
  Select,
  MenuItem,
  TextField,
  SelectChangeEvent,
  Alert
} from '@mui/material';
import { ArrowBack as BackIcon, CheckCircle as CheckIcon, AutoGraph as GraphIcon } from '@mui/icons-material';
import { useDocumentStore } from '../hooks/useDocumentStore';
import { LearningReviewService } from '../services/learning/LearningReviewService';
import type { DocumentCategory, LearningReviewItem } from '../types/document';

const CATEGORY_OPTIONS: Array<{ value: DocumentCategory | 'otro'; label: string }> = [
  { value: 'proveedor', label: 'Proveedor' },
  { value: 'categoria', label: 'Categoría' },
  { value: 'codigo', label: 'Código' },
  { value: 'marca', label: 'Marca' },
  { value: 'producto', label: 'Producto' },
  { value: 'tipo', label: 'Tipo' },
  { value: 'presentacion', label: 'Presentación' },
  { value: 'cantidad', label: 'Cantidad de bulto' },
  { value: 'precio', label: 'Precio' },
  { value: 'otro', label: 'No corresponde' }
];

interface LearningReviewProps {
  onNavigate: (page: string) => void;
}

export const LearningReview: React.FC<LearningReviewProps> = ({ onNavigate }) => {
  const documents = useDocumentStore((state) => state.documents);
  const updateDocument = useDocumentStore((state) => state.updateDocument);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { correctedValue: string; correctedCategory: DocumentCategory | 'otro' }>>({});

  const pendingDocuments = useMemo(
    () => documents.filter((doc) => doc.status === 'success' && LearningReviewService.getPendingReviewItems(doc).length > 0),
    [documents]
  );

  const selectedDocument = useMemo(
    () => pendingDocuments.find((doc) => doc.id === selectedDocId) || pendingDocuments[0] || null,
    [pendingDocuments, selectedDocId]
  );

  const pendingItems = useMemo(() => {
    if (!selectedDocument) {
      return [] as LearningReviewItem[];
    }
    return LearningReviewService.getPendingReviewItems(selectedDocument);
  }, [selectedDocument]);

  const updateDraft = (itemId: string, field: 'correctedValue' | 'correctedCategory', value: string) => {
    setDrafts((current) => ({
      ...current,
      [itemId]: {
        correctedValue: current[itemId]?.correctedValue ?? '',
        correctedCategory: current[itemId]?.correctedCategory ?? 'otro',
        [field]: value
      } as { correctedValue: string; correctedCategory: DocumentCategory | 'otro' }
    }));
  };

  const handleConfirm = async (item: LearningReviewItem) => {
    const doc = documents.find((candidate) => candidate.id === item.documentId);
    if (!doc) {
      return;
    }

    const draft = drafts[item.id] || {
      correctedValue: item.correctedValue || item.rawText,
      correctedCategory: item.category || 'otro'
    };

    const updatedDocument = LearningReviewService.applyCorrection(doc, item, {
      correctedValue: draft.correctedValue,
      correctedCategory: draft.correctedCategory
    });

    await updateDocument(doc.id, updatedDocument);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, flexGrow: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant='h5' component='h2' sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>
            Revisión supervisada de documentos
          </Typography>
          <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
            Clasifica campo por campo los datos pendientes para construir el dataset de aprendizaje.
          </Typography>
        </Box>
        <Button variant='outlined' startIcon={<BackIcon />} onClick={() => onNavigate('learning')}>
          Volver al Centro
        </Button>
      </Box>

      {pendingDocuments.length === 0 ? (
        <Alert severity='success'>No hay documentos pendientes por revisar. El sistema ya está alineado con los campos aceptados.</Alert>
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Stack spacing={2}>
              {pendingDocuments.map((doc) => {
                const pendingCount = LearningReviewService.getPendingReviewItems(doc).length;
                return (
                  <Card key={doc.id} sx={{ borderRadius: 4 }}>
                    <CardContent>
                      <Typography variant='subtitle1' sx={{ fontWeight: 700 }}>{doc.fileName}</Typography>
                      <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
                        {doc.processedAt ? new Date(doc.processedAt).toLocaleString() : 'Sin fecha'}
                      </Typography>
                      <Stack direction='row' spacing={1} sx={{ mt: 1 }}>
                        <Chip size='small' label={`${pendingCount} campos pendientes`} color='warning' />
                        <Chip size='small' label={doc.extractedData?.empresa || 'Proveedor desconocido'} />
                      </Stack>
                      <Button
                        variant={selectedDocument?.id === doc.id ? 'contained' : 'outlined'}
                        fullWidth
                        sx={{ mt: 2 }}
                        onClick={() => setSelectedDocId(doc.id)}
                      >
                        Revisar
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
          </Grid>

          <Grid item xs={12} md={8}>
            {selectedDocument ? (
              <Card sx={{ borderRadius: 4 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box>
                      <Typography variant='h6' sx={{ fontWeight: 700 }}>{selectedDocument.fileName}</Typography>
                      <Typography variant='body2' color='text.secondary'>
                        Contexto OCR y clasificación manual para cada valor pendiente.
                      </Typography>
                    </Box>
                    <Chip icon={<GraphIcon />} label='Aprendizaje supervisado' color='primary' />
                  </Box>

                  <Divider sx={{ mb: 2 }} />

                  {pendingItems.length === 0 ? (
                    <Alert severity='info'>Este documento ya no tiene campos pendientes.</Alert>
                  ) : (
                    pendingItems.map((item) => {
                      const draft = drafts[item.id] || {
                        correctedValue: item.correctedValue || item.rawText,
                        correctedCategory: item.category || 'otro'
                      };

                      return (
                        <Box key={item.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, p: 2, mb: 2 }}>
                          <Typography variant='subtitle2' sx={{ fontWeight: 700, mb: 1 }}>
                            Texto detectado: {item.rawText}
                          </Typography>
                          <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
                            Contexto: {item.context || selectedDocument.rawText || 'Sin contexto disponible'}
                          </Typography>
                          <Typography variant='body2' sx={{ mb: 2 }}>
                            Confianza: {(item.confidence * 100).toFixed(0)}% · Clasificación actual: {item.category || 'otro'}
                          </Typography>

                          <Grid container spacing={2} alignItems='flex-end'>
                            <Grid item xs={12} md={6}>
                              <TextField
                                label='Valor corregido'
                                value={draft.correctedValue}
                                fullWidth
                                onChange={(event) => updateDraft(item.id, 'correctedValue', event.target.value)}
                              />
                            </Grid>
                            <Grid item xs={12} md={4}>
                              <Select
                                value={draft.correctedCategory}
                                fullWidth
                                onChange={(event: SelectChangeEvent<DocumentCategory | 'otro'>) => updateDraft(item.id, 'correctedCategory', event.target.value)}
                              >
                                {CATEGORY_OPTIONS.map((option) => (
                                  <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                  </MenuItem>
                                ))}
                              </Select>
                            </Grid>
                            <Grid item xs={12} md={2}>
                              <Button fullWidth variant='contained' color='primary' startIcon={<CheckIcon />} onClick={() => handleConfirm(item)}>
                                Guardar
                              </Button>
                            </Grid>
                          </Grid>
                        </Box>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            ) : null}
          </Grid>
        </Grid>
      )}
    </Box>
  );
};
