import React from 'react';
import { Card, CardContent, Typography, List, ListItem, ListItemText } from '@mui/material';
import { ParsedRecord } from '../types/document';

interface Props { records?: ParsedRecord[] }

export const RecordViewer: React.FC<Props> = ({ records }) => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Registros construidos</Typography>
        {!records || records.length === 0 ? (
          <Typography variant="body2">No hay registros.</Typography>
        ) : (
          <List>
            {records.map((r) => (
              <ListItem key={r.id} divider>
                <ListItemText primary={`${r.producto} — ${r.cantidad} x ${r.precio}`} secondary={`Confianza ${Math.round(r.confidence * 100)}%`} />
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
};
