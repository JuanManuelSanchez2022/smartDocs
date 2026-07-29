import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  TextField,
  Stack,
  Chip
} from '@mui/material';
import { useDocumentStore } from '../hooks/useDocumentStore';
import { ParsedRecord } from '../types/document';

interface Props {
  documents: ParsedRecord[] | undefined;
}

export const NormalizedTable: React.FC<Props> = ({ documents }) => {
  const updateDocument = useDocumentStore((state) => state.updateDocument);

  if (!documents || documents.length === 0) {
    return (
      <Card sx={{ borderRadius: 4 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Tabla normalizada</Typography>
          <Typography variant="body2">No hay registros normalizados disponibles.</Typography>
        </CardContent>
      </Card>
    );
  }

  const handleCellChange = (recordId: string, field: keyof ParsedRecord, value: string | number) => {
    const updatedRecords = documents.map((record) =>
      record.id === recordId ? { ...record, [field]: value } : record
    );
    updateDocument(documents[0]?.id || '', { parsedRecords: updatedRecords });
  };

  return (
    <Card sx={{ borderRadius: 4, mt: 3 }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Tabla normalizada</Typography>
            <Typography variant="body2" color="text.secondary">
              Edite valores, categorías y confianza directamente desde aquí.
            </Typography>
          </Box>
          <Chip label="Editando registros" color="primary" />
        </Stack>

        <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Proveedor</TableCell>
                <TableCell>Producto</TableCell>
                <TableCell>Código</TableCell>
                <TableCell>Presentación</TableCell>
                <TableCell>Cantidad</TableCell>
                <TableCell>Precio</TableCell>
                <TableCell>Confianza</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {documents.map((record) => (
                <TableRow key={record.id} hover>
                  <TableCell>
                    <TextField
                      value={record.proveedor}
                      size="small"
                      onChange={(e) => handleCellChange(record.id, 'proveedor', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={record.producto}
                      size="small"
                      onChange={(e) => handleCellChange(record.id, 'producto', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={record.codigo}
                      size="small"
                      onChange={(e) => handleCellChange(record.id, 'codigo', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={record.presentacion}
                      size="small"
                      onChange={(e) => handleCellChange(record.id, 'presentacion', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={record.cantidad}
                      size="small"
                      onChange={(e) => handleCellChange(record.id, 'cantidad', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={record.precio}
                      size="small"
                      type="number"
                      onChange={(e) => handleCellChange(record.id, 'precio', Number(e.target.value))}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={record.confidence}
                      size="small"
                      type="number"
                      inputProps={{ min: 0, max: 1, step: 0.01 }}
                      onChange={(e) => handleCellChange(record.id, 'confidence', Number(e.target.value))}
                    />
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
