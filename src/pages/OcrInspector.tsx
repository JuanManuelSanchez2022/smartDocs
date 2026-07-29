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
  InputLabel
} from '@mui/material';
import { ArrowBack as BackIcon } from '@mui/icons-material';
import { useDocumentStore } from '../hooks/useDocumentStore';
import { OCRTextViewer } from '../components/OCRTextViewer';
import { TokenViewer } from '../components/TokenViewer';
import { ClassificationViewer } from '../components/ClassificationViewer';
import { RecordViewer } from '../components/RecordViewer';
import { LearningPanel } from '../components/LearningPanel';
import { ProcessedDocument } from '../types/document';

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
            <OCRTextViewer document={selectedDocument as ProcessedDocument} />
            <Box sx={{ mt: 2 }}>
              <RecordViewer records={selectedDocument.parsedRecords} />
            </Box>
          </Grid>

          <Grid item xs={12} md={8}>
            <TokenViewer tokens={selectedDocument.tokens} />
            <Box sx={{ mt: 2 }}>
              <ClassificationViewer fields={selectedDocument.interpretation?.fields} />
            </Box>
            <Box sx={{ mt: 2 }}>
              <LearningPanel />
            </Box>
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
