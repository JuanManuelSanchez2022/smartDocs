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
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Tabla normalizada (9 campos)</Typography>
          <Typography variant="body2" color="text.secondary">No hay registros normalizados disponibles.</Typography>
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
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Tabla normalizada (Esquema Unificado SmartDocs)</Typography>
            <Typography variant="body2" color="text.secondary">
              9 campos estandarizados: Proveedor | Categoría | Código | Producto | Tipo | Presentación | Precio | Marca | Cantidad Bulto
            </Typography>
          </Box>
          <Chip label={`${documents.length} registros`} color="primary" />
        </Stack>

        <TableContainer component={Paper} sx={{ boxShadow: 'none', overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Proveedor</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Código</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Producto (Descripción)</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Presentación</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Cantidad / Bulto</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Precio</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Marca</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {documents.map((record) => (
                <TableRow key={record.id} hover>
                  <TableCell>
                    <TextField
                      value={record.proveedor || ''}
                      size="small"
                      onChange={(e) => handleCellChange(record.id, 'proveedor', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={record.codigo || ''}
                      size="small"
                      onChange={(e) => handleCellChange(record.id, 'codigo', e.target.value)}
                    />
                  </TableCell>
                  <TableCell style={{ minWidth: 260 }}>
                    <TextField
                      value={record.producto || ''}
                      size="small"
                      fullWidth
                      onChange={(e) => handleCellChange(record.id, 'producto', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={record.presentacion || ''}
                      size="small"
                      onChange={(e) => handleCellChange(record.id, 'presentacion', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={record.cantidad || ''}
                      size="small"
                      onChange={(e) => handleCellChange(record.id, 'cantidad', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={record.precio || 0}
                      size="small"
                      type="number"
                      onChange={(e) => handleCellChange(record.id, 'precio', Number(e.target.value))}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={(record as any).marca || ''}
                      size="small"
                      onChange={(e) => handleCellChange(record.id, 'marca' as any, e.target.value)}
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
