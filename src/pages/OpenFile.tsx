import React, { useState } from 'react';
import { useDocumentStore } from '../hooks/useDocumentStore';
import {
  Box,
  Typography,
  Card,
  Grid,
  Button,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Alert,
  Tooltip,
  TextField
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  CopyAll as CopyIcon,
  CheckCircleOutline as SuccessIcon,
  ErrorOutline as ErrorIcon,
  ArrowBack as BackIcon,
  Refresh as RetryIcon,
  TableChart as TableIcon,
  Code as CodeIcon,
  Description as TextIcon,
  Image as ImageIcon
} from '@mui/icons-material';
import { NormalizedTable } from '../components/NormalizedTable';

interface OpenFileProps {
  onNavigate: (page: string) => void;
}

export const OpenFile: React.FC<OpenFileProps> = ({ onNavigate }) => {
  const processFile = useDocumentStore((state) => state.processFile);
  const processing = useDocumentStore((state) => state.processing);
  const resetProcessing = useDocumentStore((state) => state.resetProcessing);

  const [dragActive, setDragActive] = useState(false);
  const [imageTab, setImageTab] = useState(0); // 0 = Original, 1 = Procesada
  const [resultTab, setResultTab] = useState(0); // 0 = Tabla, 1 = JSON, 2 = Texto

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      await processFile(file);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      await processFile(file);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const doc = processing.result;
  const showImages = doc && (doc.originalImage || doc.processedImage);
  const isExcelOrWord = doc && (
    doc.fileName.endsWith('.xlsx') || 
    doc.fileName.endsWith('.xls') || 
    doc.fileName.endsWith('.docx') || 
    doc.fileName.endsWith('.doc')
  );

  return (
    <Box className="animate-fade-in" sx={{ display: 'flex', flexDirection: 'column', gap: 3, flexGrow: 1 }}>
      
      {/* Header */}
      <Box sx={{ display: 'flex', width: '100%', alignItems: 'center' }}>
        <IconButton onClick={() => onNavigate('home')} color="inherit" sx={{ mr: 2 }}>
          <BackIcon />
        </IconButton>
        <Typography variant="h5" component="h2" sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>
          Digitalizar Archivo
        </Typography>
      </Box>

      {/* 1. DROPZONE - Show when idle */}
      {processing.status === 'idle' && (
        <Box
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px dashed',
            borderColor: dragActive ? 'primary.main' : 'divider',
            borderRadius: 6,
            bgcolor: dragActive ? 'rgba(138, 92, 246, 0.04)' : 'rgba(255, 255, 255, 0.01)',
            p: 6,
            textAlign: 'center',
            transition: 'all 0.2s ease',
            cursor: 'pointer',
            position: 'relative'
          }}
          component="label"
        >
          <input
            type="file"
            accept=".png,.jpg,.jpeg,.pdf,.xlsx,.xls,.docx,.doc"
            style={{ display: 'none' }}
            onChange={handleFileInput}
          />
          <UploadIcon sx={{ fontSize: 64, color: dragActive ? 'primary.main' : 'text.secondary', mb: 2 }} />
          <Typography variant="h6" sx={{ fontFamily: 'Outfit', fontWeight: 600, mb: 1 }}>
            Arrastra tu archivo aquí o haz clic para buscar
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Soporta JPG, PNG, PDF, Excel y Word (DOCX). Procesamiento local offline.
          </Typography>
          <Button variant="outlined" component="span" sx={{ pointerEvents: 'none' }}>
            Seleccionar Archivo
          </Button>
        </Box>
      )}

      {/* 2. RESULTS VIEW - Show when success or failed */}
      {(processing.status === 'success' || processing.status === 'failed') && doc && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          
          {/* Status Indicator Bar */}
          <Alert
            severity={processing.status === 'success' ? 'success' : 'error'}
            icon={processing.status === 'success' ? <SuccessIcon /> : <ErrorIcon />}
            action={
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button 
                  size="small" 
                  color="inherit" 
                  startIcon={<RetryIcon />} 
                  onClick={resetProcessing}
                >
                  Cargar Otro
                </Button>
                {processing.status === 'success' && (
                  <Button 
                    size="small" 
                    variant="contained" 
                    color={processing.status === 'success' ? 'success' : 'primary'}
                    onClick={() => onNavigate('history')}
                  >
                    Ver Historial
                  </Button>
                )}
              </Box>
            }
            sx={{ borderRadius: 3 }}
          >
            {processing.status === 'success' 
              ? `¡Archivo "${doc.fileName}" digitalizado y guardado con éxito!`
              : `Error procesando "${doc.fileName}": ${processing.errorMessage}`
            }
          </Alert>

          {/* Document metadata overview card */}
          {processing.status === 'success' && (
            <Card sx={{ p: 3, borderRadius: 4 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={3}>
                  <Typography variant="caption" color="text.secondary" display="block">Tipo de Documento</Typography>
                  <Chip
                    label={doc.extractedData.tipo.toUpperCase().replace(/_/g, ' ')}
                    color={
                      doc.extractedData.tipo === 'factura' ? 'primary' :
                      doc.extractedData.tipo === 'remito' ? 'secondary' :
                      doc.extractedData.tipo === 'lista_de_precios' ? 'info' :
                      doc.extractedData.tipo === 'presupuesto' ? 'warning' : 'default'
                    }
                    sx={{ fontWeight: 'bold', mt: 0.5 }}
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary" display="block">Proveedor / Empresa</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>{doc.extractedData.empresa || 'No detectado'}</Typography>
                </Grid>
                <Grid item xs={6} sm={2}>
                  <Typography variant="caption" color="text.secondary" display="block">CUIT</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>{doc.extractedData.cuit || 'No detectado'}</Typography>
                </Grid>
                <Grid item xs={6} sm={2}>
                  <Typography variant="caption" color="text.secondary" display="block">Fecha / Número</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {doc.extractedData.fecha || 'S/D'} • {doc.extractedData.numero || 'S/N'}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={2}>
                  <Typography variant="caption" color="text.secondary" display="block">Total</Typography>
                  <Typography variant="h6" color="primary.main" sx={{ fontWeight: 700 }}>
                    ${doc.extractedData.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </Typography>
                </Grid>
              </Grid>
            </Card>
          )}

          {/* Details Panels */}
          {processing.status === 'success' && (
            <Grid container spacing={3}>
              
              {/* Left Panel: Images (if available and not Excel/Word) */}
              {showImages && !isExcelOrWord && (
                <Grid item xs={12} md={5}>
                  <Card sx={{ borderRadius: 4, height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                      <Tabs value={imageTab} onChange={(_, val) => setImageTab(val)} aria-label="Tabs de imágenes">
                        <Tab icon={<ImageIcon />} label="Original" sx={{ minHeight: 48, py: 1 }} />
                        <Tab icon={<ImageIcon />} label="Procesada (OpenCV)" sx={{ minHeight: 48, py: 1 }} />
                      </Tabs>
                    </Box>
                    <Box sx={{ p: 2, flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.2)', minHeight: 300 }}>
                      {imageTab === 0 ? (
                        <img
                          src={doc.originalImage}
                          alt="Original"
                          style={{ maxWidth: '100%', maxHeight: 400, objectFit: 'contain', borderRadius: 8 }}
                        />
                      ) : (
                        <img
                          src={doc.processedImage || doc.originalImage}
                          alt="Procesada"
                          style={{ maxWidth: '100%', maxHeight: 400, objectFit: 'contain', borderRadius: 8 }}
                        />
                      )}
                    </Box>
                  </Card>
                </Grid>
              )}

              {/* Right Panel: Extracted Tables and JSON */}
              <Grid item xs={12} md={showImages && !isExcelOrWord ? 7 : 12}>
                <Card sx={{ borderRadius: 4, height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center', pr: 2 }}>
                    <Tabs value={resultTab} onChange={(_, val) => setResultTab(val)} aria-label="Tabs de resultados">
                      <Tab icon={<TableIcon />} label="Tabla de Items" sx={{ minHeight: 48, py: 1 }} />
                      <Tab icon={<CodeIcon />} label="JSON Generado" sx={{ minHeight: 48, py: 1 }} />
                      {!isExcelOrWord && <Tab icon={<TextIcon />} label="Texto OCR" sx={{ minHeight: 48, py: 1 }} />}
                    </Tabs>

                    {resultTab === 1 && (
                      <Tooltip title="Copiar JSON">
                        <IconButton 
                          onClick={() => copyToClipboard(JSON.stringify(doc.extractedData, null, 2))}
                          color="primary"
                        >
                          <CopyIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>

                  <Box sx={{ p: 2, flexGrow: 1, overflow: 'auto', maxHeight: 450 }}>
                    
                    {/* Tab 0: Table view */}
                    {resultTab === 0 && (
                      <TableContainer component={Paper} elevation={0} sx={{ border: 'none' }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 'bold' }}>Código</TableCell>
                              <TableCell sx={{ fontWeight: 'bold' }}>Descripción</TableCell>
                              <TableCell sx={{ fontWeight: 'bold' }} align="right">Cantidad</TableCell>
                              <TableCell sx={{ fontWeight: 'bold' }}>Unidad</TableCell>
                              <TableCell sx={{ fontWeight: 'bold' }} align="right">Precio Unitario</TableCell>
                              <TableCell sx={{ fontWeight: 'bold' }} align="right">Subtotal</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {doc.extractedData.items.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                  No se detectaron ítems tabulares en el documento.
                                </TableCell>
                              </TableRow>
                            ) : (
                              doc.extractedData.items.map((item, idx) => (
                                <TableRow key={idx}>
                                  <TableCell>{item.codigo}</TableCell>
                                  <TableCell>{item.descripcion}</TableCell>
                                  <TableCell align="right">{item.cantidad}</TableCell>
                                  <TableCell>{item.unidad}</TableCell>
                                  <TableCell align="right">${item.precio.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</TableCell>
                                  <TableCell align="right">${item.subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</TableCell>
                                </TableRow>
                              ))
                            )}
                            
                            {/* Summary Rows */}
                            {doc.extractedData.items.length > 0 && (
                              <>
                                <TableRow>
                                  <TableCell colSpan={4} sx={{ borderBottom: 'none' }} />
                                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Subtotal:</TableCell>
                                  <TableCell align="right">${doc.extractedData.subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell colSpan={4} sx={{ borderBottom: 'none' }} />
                                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>IVA:</TableCell>
                                  <TableCell align="right">${doc.extractedData.iva.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell colSpan={4} sx={{ borderBottom: 'none' }} />
                                  <TableCell align="right" sx={{ fontWeight: 'bold', color: 'primary.main' }}>Total:</TableCell>
                                  <TableCell align="right" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                                    ${doc.extractedData.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                  </TableCell>
                                </TableRow>
                              </>
                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}

                    {/* Tab 1: JSON view */}
                    {resultTab === 1 && (
                      <Box
                        component="pre"
                        sx={{
                          p: 2,
                          bgcolor: 'rgba(0,0,0,0.3)',
                          borderRadius: 2,
                          fontFamily: 'monospace',
                          fontSize: '0.85rem',
                          overflow: 'auto',
                          m: 0,
                          color: '#8be9fd' // Dracula theme style
                        }}
                      >
                        {JSON.stringify(doc.extractedData, null, 2)}
                      </Box>
                    )}

                    {/* Tab 2: OCR Text view */}
                    {resultTab === 2 && !isExcelOrWord && (
                      <TextField
                        fullWidth
                        multiline
                        rows={12}
                        variant="outlined"
                        placeholder="Sin texto extraído."
                        value={doc.rawText || ''}
                        InputProps={{
                          readOnly: true,
                          sx: {
                            fontFamily: 'monospace',
                            fontSize: '0.9rem',
                            bgcolor: 'rgba(0,0,0,0.15)',
                            lineHeight: 1.6
                          }
                        }}
                      />
                    )}

                  </Box>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* Render Normalized Table with 9 standard fields */}
          {processing.status === 'success' && doc.parsedRecords && doc.parsedRecords.length > 0 && (
            <NormalizedTable documents={doc.parsedRecords} />
          )}

        </Box>
      )}

    </Box>
  );
};
