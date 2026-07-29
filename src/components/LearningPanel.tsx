import React from 'react';
import { Card, CardContent, Typography, Button } from '@mui/material';
import { KnowledgeBase } from '../services/knowledge/KnowledgeBase';

export const LearningPanel: React.FC = () => {
  const entries = KnowledgeBase.getEntries();

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Centro de Aprendizaje (Preview)</Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>Entradas guardadas: {entries.length}</Typography>
        <Button size="small" onClick={() => window.alert('Abrir panel completo de aprendizaje (pendiente)')}>Abrir centro</Button>
      </CardContent>
    </Card>
  );
};
