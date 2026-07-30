import React, { useState, useMemo } from 'react';
import {
  Box, Container, Typography, Card, CardContent, CardHeader,
  Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
  TextField, Button, Chip, Stack, Divider, Alert, IconButton,
  Tooltip, LinearProgress, Paper,
} from '@mui/material';
import {
  CheckCircle as OkIcon,
  Warning as PendingIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  School as LearningIcon,
} from '@mui/icons-material';
import { useDocumentStore } from '../hooks/useDocumentStore';
import { DocumentItem, CAMPOS_OBLIGATORIOS_LISTA } from '../types/document';

interface LearningProps {
  onNavigate: (page: string) => void;
}

// Campos que el usuario puede editar manualmente en la tabla
const CAMPOS_EDITABLES: { key: keyof DocumentItem; label: string; width?: number }[] = [
  { key: 'proveedor',    label: 'Proveedor',    width: 140 },
  { key: 'codigo',       label: 'Código',       width: 90  },
  { key: 'descripcion',  label: 'Descripción',  width: 220 },
  { key: 'presentacion', label: 'Presentación', width: 120 },
  { key: 'cantidad',     label: 'Cantidad',     width: 80  },
  { key: 'precio',       label: 'Precio',       width: 100 },
];

interface EditState {
  docId: string;
  itemIndex: number;
  values: Partial<DocumentItem>;
}

export const Learning: React.FC<LearningProps> = ({ onNavigate }) => {
  const documents        = useDocumentStore(state => state.documents);
  const updateDocumentItem = useDocumentStore(state => state.updateDocumentItem);

  const [editState, setEditState] = useState<EditState | null>(null);
  const [savedCount, setSavedCount] = useState(0);

  // Solo documentos con items pendientes de revisión
  const pendingDocs = useMemo(
    () =>
      documents
        .filter(
          doc =>
            doc.extractedData.tipo === 'lista_de_precios' &&
            doc.extractedData.items.some(i => i.pendienteRevision)
        )
        .sort((a, b) =>
          new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime()
        ),
    [documents]
  );

  const totalPendientes = useMemo(
    () => pendingDocs.reduce((sum, doc) => sum + (doc.itemsPendientes ?? 0), 0),
    [pendingDocs]
  );

  const totalItems = useMemo(
    () =>
      documents
        .filter(d => d.extractedData.tipo === 'lista_de_precios')
        .reduce((sum, d) => sum + d.extractedData.items.length, 0),
    [documents]
  );

  const progreso = totalItems > 0
    ? Math.round(((totalItems - totalPendientes) / totalItems) * 100)
    : 100;

  // ── Handlers de edición ──────────────────────────────────────────

  const startEdit = (docId: string, itemIndex: number, item: DocumentItem) => {
    setEditState({
      docId,
      itemIndex,
      values: {
        proveedor:    item.proveedor    ?? '',
        codigo:       item.codigo       ?? '',
        descripcion:  item.descripcion  ?? '',
        presentacion: item.presentacion ?? '',
        cantidad:     item.cantidad     ?? 0,
        precio:       item.precio       ?? 0,
      },
    });
  };

  const cancelEdit = () => setEditState(null);

  const saveEdit = async () => {
    if (!editState) return;
    await updateDocumentItem(editState.docId, editState.itemIndex, editState.values);
    setSavedCount(n => n + 1);
    setEditState(null);
  };

  const handleFieldChange = (field: keyof DocumentItem, value: string) => {
    if (!editState) return;
    const parsed =
      field === 'cantidad' || field === 'precio'
        ? parseFloat(value.replace(',', '.')) || 0
        : value;
    setEditState({ ...editState, values: { ...editState.values, [field]: parsed } });
  };

  // ── Render ────────────────────────────────────────────────────────

  if (pendingDocs.length === 0) {
    return (
      <Container maxWidth="md" sx={{ mt: 8, textAlign: 'center' }}>
        <LearningIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
        <Typography variant="h4" fontWeight={700} mb={2}>
          Sin documentos pendientes
        </Typography>
        <Typography color="text.secondary" mb={4}>
          Todos los items de listas de precios están normalizados.
          Procesá más documentos para entrenar el normalizador.
        </Typography>
        <Button variant="contained" onClick={() => onNavigate('open-file')}>
          Procesar un documento
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 6 }}>
      {/* Encabezado */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" alignItems="center" spacing={2} mb={1}>
          <LearningIcon sx={{ color: 'primary.main', fontSize: 32 }} />
          <Typography variant="h4" fontWeight={800}>
            Aprendizaje
          </Typography>
          <Chip
            label={`${totalPendientes} pendiente${totalPendientes !== 1 ? 's' : ''}`}
            color="warning"
            size="small"
            sx={{ fontWeight: 700 }}
          />
        </Stack>
        <Typography color="text.secondary" mb={3}>
          Completá los campos vacíos para que el normalizador aprenda a reconocerlos
          automáticamente en futuros documentos.
        </Typography>

        {/* Barra de progreso */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Stack direction="row" justifyContent="space-between" mb={0.5}>
            <Typography variant="body2" color="text.secondary">
              Progreso de normalización
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {progreso}% — {totalItems - totalPendientes} / {totalItems} items
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={progreso}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Paper>

        {savedCount > 0 && (
          <Alert severity="success" sx={{ mt: 2 }} onClose={() => setSavedCount(0)}>
            {savedCount} item{savedCount !== 1 ? 's guardados' : ' guardado'} correctamente.
            El normalizador incorporará estos datos en la próxima ejecución.
          </Alert>
        )}
      </Box>

      {/* Lista de documentos con items pendientes */}
      {pendingDocs.map(doc => {
        const pendingItems = doc.extractedData.items
          .map((item, idx) => ({ item, idx }))
          .filter(({ item }) => item.pendienteRevision);

        return (
          <Card key={doc.id} sx={{ mb: 4 }}>
            <CardHeader
              title={
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="h6" fontWeight={700}>
                    {doc.fileName}
                  </Typography>
                  <Chip
                    label={`${pendingItems.length} pendiente${pendingItems.length !== 1 ? 's' : ''}`}
                    size="small"
                    color="warning"
                  />
                </Stack>
              }
              subheader={
                <Typography variant="body2" color="text.secondary">
                  Proveedor: {doc.extractedData.empresa} — Procesado:{' '}
                  {new Date(doc.processedAt).toLocaleDateString('es-AR', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                  })}
                </Typography>
              }
            />
            <Divider />
            <CardContent sx={{ p: 0 }}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {CAMPOS_EDITABLES.map(c => (
                        <TableCell
                          key={c.key}
                          sx={{ fontWeight: 700, width: c.width, whiteSpace: 'nowrap' }}
                        >
                          {c.label}
                        </TableCell>
                      ))}
                      <TableCell sx={{ fontWeight: 700, width: 220 }}>
                        Texto original OCR
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, width: 100 }}>
                        Acción
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pendingItems.map(({ item, idx }) => {
                      const isEditing =
                        editState?.docId === doc.id && editState?.itemIndex === idx;

                      // Campos vacíos para resaltar
                      const camposVacios = CAMPOS_OBLIGATORIOS_LISTA.filter(campo => {
                        const val = item[campo];
                        return val === undefined || val === null || val === '' || val === 0;
                      });

                      return (
                        <TableRow
                          key={idx}
                          sx={{
                            bgcolor: isEditing ? 'action.selected' : undefined,
                            '&:hover': { bgcolor: 'action.hover' },
                          }}
                        >
                          {CAMPOS_EDITABLES.map(({ key }) => {
                            const isEmpty = camposVacios.includes(key as keyof DocumentItem);
                            const currentVal =
                              isEditing
                                ? String(editState?.values[key] ?? '')
                                : String(item[key] ?? '');

                            return (
                              <TableCell
                                key={key}
                                sx={{
                                  borderLeft: isEmpty
                                    ? '2px solid'
                                    : undefined,
                                  borderLeftColor: isEmpty
                                    ? 'warning.main'
                                    : undefined,
                                }}
                              >
                                {isEditing ? (
                                  <TextField
                                    size="small"
                                    variant="standard"
                                    value={currentVal}
                                    onChange={e => handleFieldChange(key, e.target.value)}
                                    placeholder={isEmpty ? '— requerido —' : ''}
                                    inputProps={{
                                      style: { fontSize: 13 },
                                    }}
                                    sx={{ minWidth: 70 }}
                                  />
                                ) : (
                                  <Typography
                                    variant="body2"
                                    color={isEmpty ? 'warning.main' : 'text.primary'}
                                    fontStyle={isEmpty ? 'italic' : 'normal'}
                                  >
                                    {currentVal || '—'}
                                  </Typography>
                                )}
                              </TableCell>
                            );
                          })}

                          {/* Texto original OCR */}
                          <TableCell>
                            <Tooltip title={item.originalText ?? ''} arrow>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{
                                  maxWidth: 200,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  fontFamily: 'monospace',
                                  fontSize: 11,
                                  cursor: 'help',
                                }}
                              >
                                {item.originalText ?? '—'}
                              </Typography>
                            </Tooltip>
                          </TableCell>

                          {/* Botones */}
                          <TableCell align="center">
                            {isEditing ? (
                              <Stack direction="row" spacing={0.5} justifyContent="center">
                                <Tooltip title="Guardar">
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={saveEdit}
                                  >
                                    <SaveIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Cancelar">
                                  <IconButton size="small" onClick={cancelEdit}>
                                    <CancelIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            ) : (
                              <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center">
                                <Tooltip title={`${camposVacios.length} campo${camposVacios.length !== 1 ? 's' : ''} vacío${camposVacios.length !== 1 ? 's' : ''}`}>
                                  <PendingIcon
                                    fontSize="small"
                                    sx={{ color: 'warning.main' }}
                                  />
                                </Tooltip>
                                <Tooltip title="Editar item">
                                  <IconButton
                                    size="small"
                                    onClick={() => startEdit(doc.id, idx, item)}
                                    disabled={editState !== null}
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        );
      })}
    </Container>
  );
};
