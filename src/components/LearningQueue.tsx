import React, { useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
  TextField,
  MenuItem,
  Select,
  SelectChangeEvent,
  IconButton,
  Stack,
  Chip
} from '@mui/material';
import { Check as CheckIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { LearningReviewItem, DocumentCategory, ProcessedDocument } from '../types/document';
import { LearningCategoryRegistry } from '../services/learning/LearningCategoryRegistry';
import { LearningQueue } from '../services/learning/LearningQueue';
import { LearningActions } from '../services/learning/LearningActions';
import { useDocumentStore } from '../hooks/useDocumentStore';

interface Props {
  documents: ProcessedDocument[];
  manualCorrections: number;
  setManualCorrections: (value: number) => void;
}

interface EditState {
  category: DocumentCategory | 'otro';
  correctedValue: string;
}

export const LearningQueuePanel: React.FC<Props> = ({ documents, manualCorrections, setManualCorrections }) => {
  const [edits, setEdits] = useState<Record<string, EditState>>({});
  const updateDocument = useDocumentStore((state) => state.updateDocument);

  const categories = useMemo(() => LearningCategoryRegistry.getCategories(), []);

  const reviewItems = useMemo(() => {
    const items = LearningQueue.getItems();
    return items;
  }, [documents]);

  const handleEditChange = (id: string, field: keyof EditState, value: string) => {
    setEdits((current) => ({
      ...current,
      [id]: {
        ...current[id],
        [field]: value
      }
    }));
  };

  const handleAccept = (item: LearningReviewItem) => {
    const state = edits[item.id] || { category: item.category, correctedValue: item.correctedValue || item.rawText };
    const correctedCategory = state.category;
    const correctedValue = state.correctedValue;

    const document = documents.find((doc) => doc.id === item.documentId);
    if (!document || !document.interpretation) return;

    updateDocument(item.documentId, {
      interpretation: {
        ...document.interpretation,
        fields: document.interpretation.fields.map((field) =>
          field.rawText === item.rawText && field.page === item.page
            ? { ...field, normalizedText: correctedValue, category: correctedCategory as any, confirmed: true }
            : field
        )
      }
    });

    LearningQueue.removeItem(item.id);
    setManualCorrections(manualCorrections + 1);
    LearningActions.notify(LearningActions.buildCorrection(item, correctedValue, correctedCategory));
  };

  const handleIgnore = (item: LearningReviewItem) => {
    LearningQueue.removeItem(item.id);
  };

  return (
    <Card sx={{ borderRadius: 4 }}>
      <CardContent>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Cola de Aprendizaje</Typography>
            <Typography variant="body2" color="text.secondary">
              Solo los campos que el clasificador no clasificó con suficiente confianza.
            </Typography>
          </Box>
          <Chip label={`${reviewItems.length} elementos pendientes`} color="warning" />
        </Box>

        <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Texto OCR</TableCell>
                <TableCell>Proveedor</TableCell>
                <TableCell>Documento</TableCell>
                <TableCell>Página</TableCell>
                <TableCell>Contexto</TableCell>
                <TableCell>Categoría</TableCell>
                <TableCell>Valor</TableCell>
                <TableCell>Confianza</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reviewItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">No hay elementos pendientes de aprendizaje.</TableCell>
                </TableRow>
              ) : (
                reviewItems.map((item) => {
                  const edit = edits[item.id] || { category: item.category, correctedValue: item.correctedValue || item.rawText };
                  const doc = documents.find((docItem) => docItem.id === item.documentId);
                  const currentContext = doc?.interpretation?.fields
                    .filter((field) => field.page === item.page && field.category !== item.category)
                    .slice(0, 3)
                    .map((field) => field.rawText)
                    .join(' • ');

                  return (
                    <TableRow key={item.id} hover>
                      <TableCell>{item.rawText}</TableCell>
                      <TableCell>{doc?.extractedData.empresa || 'Desconocido'}</TableCell>
                      <TableCell>{item.fileName}</TableCell>
                      <TableCell>{item.page}</TableCell>
                      <TableCell>{currentContext || 'N/A'}</TableCell>
                      <TableCell>
                        <Select
                          value={edit.category}
                          onChange={(e: SelectChangeEvent<DocumentCategory | 'otro'>) =>
                            handleEditChange(item.id, 'category', e.target.value)
                          }
                          size="small"
                          sx={{ minWidth: 160 }}
                        >
                          {categories.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </TableCell>
                      <TableCell>
                        <TextField
                          value={edit.correctedValue}
                          size="small"
                          onChange={(e) => handleEditChange(item.id, 'correctedValue', e.target.value)}
                          fullWidth
                        />
                      </TableCell>
                      <TableCell>{Math.round(item.confidence * 100)}%</TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={1} justifyContent="center">
                          <IconButton size="small" color="success" onClick={() => handleAccept(item)}>
                            <CheckIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="secondary" onClick={() => handleIgnore(item)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Stack>
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
  );
};
