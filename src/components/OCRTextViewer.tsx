import React from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import { ProcessedDocument } from '../types/document';

interface Props { document: ProcessedDocument | null }

export const OCRTextViewer: React.FC<Props> = ({ document }) => {
  return (
    <Card sx={{ borderRadius: 3 }}>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Texto OCR Crudo</Typography>
        <Box component="pre" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 13 }}>
          {document?.rawText || 'No hay texto OCR disponible.'}
        </Box>
      </CardContent>
    </Card>
  );
};
