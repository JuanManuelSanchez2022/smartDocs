import React, { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  MenuItem,
  Select,
  SelectChangeEvent,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import { ArrowBack as BackIcon } from '@mui/icons-material';
import { useDocumentStore } from '../hooks/useDocumentStore';

interface OcrInspectorProps {
  onNavigate: (page: string) => void;
}

export const OcrInspector: React.FC<OcrInspectorProps> = ({ onNavigate }) => {
  const documents = useDocumentStore((state) => state.documents);
  const [selectedId, setSelectedId] = useState<string>(documents[0]?.id || '');

  const selectedDocument = useMemo(
    () => documents.find((doc) => doc.id === selectedId) || documents[0] || null,
    [documents, selectedId]
  );

  const handleDocumentChange = (event: SelectChangeEvent<string>) => {
    setSelectedId(event.target.value as string);
  };

  return (
    <Box className="animate-fade-in" sx={{ display: 'flex', flexDirection: 'column', gap: 3, flexGrow: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h5" component="h2" sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>
            Inspector OCR
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 680 }}>
            Revisa el resultado de OCR, los registros parseados y métricas de confianza.
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

      <Card sx={{ borderRadius: 4, p: 2 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id="ocr-inspector-document-label">Documento</InputLabel>
                <Select
                  labelId="ocr-inspector-document-label"
                  value={selectedId}
                  label="Documento"
                  onChange={handleDocumentChange}
                >
                  {documents.map((doc) => (
                    <MenuItem key={doc.id} value={doc.id}>
                      {doc.fileName} - {doc.processedAt}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6} sx={{ display: 'flex', alignItems: 'center' }}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Documentos procesados: {documents.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Documento seleccionado: {selectedDocument?.fileName || 'Ninguno'}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {selectedDocument ? (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card sx={{ borderRadius: 4, p: 2, height: '100%' }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                  Información del documento
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}><strong>Nombre:</strong> {selectedDocument.fileName}</Typography>
                <Typography variant="body2" sx={{ mb: 1 }}><strong>Tipo:</strong> {selectedDocument.fileType}</Typography>
                <Typography variant="body2" sx={{ mb: 1 }}><strong>Procesado:</strong> {selectedDocument.processedAt}</Typography>
                <Typography variant="body2" sx={{ mb: 1 }}><strong>Status:</strong> {selectedDocument.status}</Typography>
                <Typography variant="body2" sx={{ mb: 1 }}><strong>Registros:</strong> {selectedDocument.parsedRecords?.length ?? 0}</Typography>
                <Typography variant="body2" sx={{ mb: 1 }}><strong>Tokens:</strong> {selectedDocument.interpretation?.fields.length ?? 0}</Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={8}>
            <Card sx={{ borderRadius: 4, p: 2 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                  Estadísticas de Parser
                </Typography>
                {selectedDocument.parserDebug ? (
                  <Box>
                    <Typography variant="body2" sx={{ mb: 1 }}><strong>Segmentos:</strong> {selectedDocument.parserDebug.segmentsDetected}</Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}><strong>Líneas:</strong> {selectedDocument.parserDebug.linesDetected}</Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}><strong>Tokens:</strong> {selectedDocument.parserDebug.tokensDetected}</Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}><strong>Registros:</strong> {selectedDocument.parserDebug.recordsBuilt}</Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}><strong>Tokens baja confianza:</strong> {selectedDocument.parserDebug.lowConfidenceTokens}</Typography>
                    <Typography variant="body2" sx={{ mt: 2, fontWeight: 700 }}>Tiempos de etapa</Typography>
                    {selectedDocument.parserDebug.stageTimings.map((timing) => (
                      <Typography key={timing.stage} variant="body2" sx={{ mb: 0.5 }}>
                        {timing.stage}: {timing.durationMs.toFixed(1)} ms
                      </Typography>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">No hay datos de depuración disponibles.</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card sx={{ borderRadius: 4, p: 2 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                  Registros parseados
                </Typography>
                {selectedDocument.parsedRecords && selectedDocument.parsedRecords.length > 0 ? (
                  <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Linea</TableCell>
                          <TableCell>Producto</TableCell>
                          <TableCell>Código</TableCell>
                          <TableCell>Cantidad</TableCell>
                          <TableCell>Precio</TableCell>
                          <TableCell>Confianza</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedDocument.parsedRecords.slice(0, 20).map((record) => (
                          <TableRow key={record.id}>
                            <TableCell>{record.lineIndex + 1}</TableCell>
                            <TableCell>{record.producto}</TableCell>
                            <TableCell>{record.codigo}</TableCell>
                            <TableCell>{record.cantidad}</TableCell>
                            <TableCell>{record.precio}</TableCell>
                            <TableCell>{Math.round(record.confidence * 100)}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography variant="body2" color="text.secondary">No hay registros parseados para este documento.</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card sx={{ borderRadius: 4, p: 2 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                  Campos OCR más bajos en confianza
                </Typography>
                {selectedDocument.interpretation?.fields.length ? (
                  <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Texto</TableCell>
                          <TableCell>Categoría</TableCell>
                          <TableCell>Confianza</TableCell>
                          <TableCell>Línea</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedDocument.interpretation?.fields
                          .sort((a, b) => a.confidence - b.confidence)
                          .slice(0, 20)
                          .map((field, idx) => (
                            <TableRow key={`${field.rawText}-${idx}`}>
                              <TableCell>{field.rawText}</TableCell>
                              <TableCell>{field.category}</TableCell>
                              <TableCell>{Math.round(field.confidence * 100)}%</TableCell>
                              <TableCell>{field.row + 1}</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography variant="body2" color="text.secondary">No hay campos disponibles en este documento.</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      ) : (
        <Card sx={{ borderRadius: 4, p: 3 }}>
          <CardContent>
            <Typography variant="body1">No hay documentos en el historial para inspeccionar.</Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};
