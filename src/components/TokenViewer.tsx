import React from 'react';
import { Card, CardContent, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { ParsedToken } from '../types/document';

interface Props { tokens?: ParsedToken[] }

export const TokenViewer: React.FC<Props> = ({ tokens }) => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Tokens detectados</Typography>
        {!tokens || tokens.length === 0 ? (
          <Typography variant="body2">No hay tokens detectados.</Typography>
        ) : (
          <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Texto</TableCell>
                  <TableCell>Cat.</TableCell>
                  <TableCell>Confianza</TableCell>
                  <TableCell>Linea</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tokens.slice(0, 200).map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{t.rawText}</TableCell>
                    <TableCell>{t.category}</TableCell>
                    <TableCell>{Math.round(t.confidence * 100)}%</TableCell>
                    <TableCell>{t.lineIndex + 1}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
};
