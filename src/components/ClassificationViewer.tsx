import React from 'react';
import { Card, CardContent, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button } from '@mui/material';
import { InterpretedField } from '../types/document';
import { ConfidenceDebugger } from '../services/debug/ConfidenceDebugger';
import { KnowledgeBase } from '../services/knowledge/KnowledgeBase';

interface Props { fields?: InterpretedField[] }

export const ClassificationViewer: React.FC<Props> = ({ fields }) => {
  if (!fields || fields.length === 0) return (
    <Card><CardContent><Typography>No hay campos interpretados.</Typography></CardContent></Card>
  );

  const handleSaveCorrection = (f: InterpretedField, correctedValue: string) => {
    KnowledgeBase.addEntry({ originalText: f.rawText, correctedText: correctedValue, category: f.category, confidence: f.confidence });
    window.alert('Corrección guardada en KnowledgeBase');
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Clasificación</Typography>
        <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Texto</TableCell>
                <TableCell>Categoría</TableCell>
                <TableCell>Confianza</TableCell>
                <TableCell>Acción</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {fields.map((f, idx) => (
                <TableRow key={`${f.rawText}-${idx}`}>
                  <TableCell>{f.rawText}</TableCell>
                  <TableCell>{f.category}</TableCell>
                  <TableCell>{ConfidenceDebugger.formatPercent(f.confidence)}</TableCell>
                  <TableCell>
                    {ConfidenceDebugger.isLow(f.confidence) ? (
                      <Button size="small" onClick={() => handleSaveCorrection(f, f.normalizedText)}>Guardar corrección</Button>
                    ) : (
                      <Typography variant="body2">OK</Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};
