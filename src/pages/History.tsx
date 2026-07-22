import React, { useState, useEffect } from 'react';
import { useDocumentStore } from '../hooks/useDocumentStore';
import { ProcessedDocument, DocumentType } from '../types/document';
import * as XLSX from 'xlsx';
import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Tooltip
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  ArrowBack as BackIcon,
  TableChart as TableIcon,
  Code as CodeIcon,
  Description as TextIcon,
  Image as ImageIcon
} from '@mui/icons-material';

interface HistoryProps {
  onNavigate: (page: string) => void;
}

export const History: React.FC<HistoryProps> = ({ onNavigate }) => {
  const documents = useDocumentStore((state) => state.documents);
  const loadHistory = useDocumentStore((state) => state.loadHistory);
  const deleteDocument = useDocumentStore((state) => state.deleteDocument);
  const clearHistory = useDocumentStore((state) => state.clearHistory);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('todos');
  const [selectedDoc, setSelectedDoc] = useState<ProcessedDocument | null>(null);
  
  // Details Modal tabs
  const [modalTab, setModalTab] = useState(0); // 0 = Tabla, 1 = JSON, 2 = Texto, 3 = Imagen
  const [imgViewTab, setImgViewTab] = useState(0); // 0 = Original, 1 = Procesada

  useEffect(() => {
    loadHistory();
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleFilterChange = (val: string) => {
    setFilterType(val);
  };

  // Filter documents
  const filteredDocs = documents.filter((doc) => {
    const data = doc.extractedData;
    const matchesSearch = 
      doc.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      data.empresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      data.cuit.toLowerCase().includes(searchTerm.toLowerCase()) ||
      data.numero.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'todos' || data.tipo === filterType;

    return matchesSearch && matchesType;
  });

  // Export selected / filtered list as JSON file
  const exportAsJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredDocs.map(d => d.extractedData), null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'DocuMind_Export_' + Date.now() + '.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Export filtered list as CSV
  const exportAsCSV = () => {
    // Generate simple rows of documents
    let csvContent = 'ID,Archivo,FechaProcesado,Tipo,Empresa,CUIT,NroDocumento,Subtotal,IVA,Total\n';
    
    filteredDocs.forEach((doc) => {
      const data = doc.extractedData;
      const row = [
        doc.id,
        `"${doc.fileName}"`,
        doc.processedAt,
        data.tipo,
        `"${data.empresa}"`,
        `"${data.cuit}"`,
        `"${data.numero}"`,
        data.subtotal,
        data.iva,
        data.total
      ].join(',');
      csvContent += row + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'DocuMind_Export_' + Date.now() + '.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Export to Excel using SheetJS
  const exportAsExcel = () => {
    // Compile general documents sheet
    const summaryRows = filteredDocs.map((doc) => {
      const data = doc.extractedData;
      return {
        'ID': doc.id,
        'Nombre de Archivo': doc.fileName,
        'Fecha Procesado': new Date(doc.processedAt).toLocaleString(),
        'Tipo': data.tipo.toUpperCase().replace(/_/g, ' '),
        'Empresa / Proveedor': data.empresa,
        'CUIT': data.cuit,
        'Nº Documento': data.numero,
        'Subtotal ($)': data.subtotal,
        'IVA ($)': data.iva,
        'Total ($)': data.total
      };
    });

    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen Documentos');

    // Create a detailed sheet aggregating all items in the filtered set
    const itemRows: any[] = [];
    filteredDocs.forEach((doc) => {
      const data = doc.extractedData;
      data.items.forEach((item) => {
        itemRows.push({
          'Doc ID': doc.id,
          'Documento': doc.fileName,
          'Proveedor': data.empresa,
          'Tipo Doc': data.tipo,
          'Nº Doc': data.numero,
          'Código Item': item.codigo,
          'Descripción': item.descripcion,
          'Cantidad': item.cantidad,
          'Unidad': item.unidad,
          'Precio Unitario ($)': item.precio,
          'Importe ($)': item.subtotal
        });
      });
    });

    if (itemRows.length > 0) {
      const wsItems = XLSX.utils.json_to_sheet(itemRows);
      XLSX.utils.book_append_sheet(wb, wsItems, 'Detalle de Artículos');
    }

    XLSX.writeFile(wb, 'DocuMind_Historial_' + Date.now() + '.xlsx');
  };

  const handleOpenDetails = (doc: ProcessedDocument) => {
    setSelectedDoc(doc);
    setModalTab(0);
    setImgViewTab(0);
  };

  const handleCloseDetails = () => {
    setSelectedDoc(null);
  };

  return (
    <Box className="animate-fade-in" sx={{ display: 'flex', flexDirection: 'column', gap: 3, flexGrow: 1 }}>
      
      {/* Header */}
      <Box sx={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton onClick={() => onNavigate('home')} color="inherit" sx={{ mr: 2 }}>
            <BackIcon />
          </IconButton>
          <Typography variant="h5" component="h2" sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>
            Historial de Documentos
          </Typography>
        </Box>

        {documents.length > 0 && (
          <Button
            variant="outlined"
            color="error"
            size="small"
            startIcon={<ClearIcon />}
            onClick={() => {
              if (window.confirm('¿Estás seguro de que deseas borrar todo el historial? Esta acción es irreversible.')) {
                clearHistory();
              }
            }}
            sx={{ borderRadius: 2 }}
          >
            Borrar Todo
          </Button>
        )}
      </Box>

      {/* Filters & Export Panel */}
      <Card sx={{ p: 2, borderRadius: 4 }}>
        <Grid container spacing={2} alignItems="center">
          {/* Search bar */}
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="Buscar por archivo, proveedor, CUIT..."
              value={searchTerm}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Grid>
          
          {/* Filter DocumentType dropdown */}
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel id="filter-type-label">Tipo Documento</InputLabel>
              <Select
                labelId="filter-type-label"
                value={filterType}
                label="Tipo Documento"
                onChange={(e) => handleFilterChange(e.target.value)}
              >
                <MenuItem value="todos">Todos los tipos</MenuItem>
                <MenuItem value="factura">Factura</MenuItem>
                <MenuItem value="remito">Remito</MenuItem>
                <MenuItem value="lista_de_precios">Lista de Precios</MenuItem>
                <MenuItem value="presupuesto">Presupuesto</MenuItem>
                <MenuItem value="orden_de_compra">Orden de Compra</MenuItem>
                <MenuItem value="otro">Otro</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Export buttons */}
          <Grid item xs={12} sm={5} sx={{ display: 'flex', gap: 1.5, justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<DownloadIcon />}
              onClick={exportAsJSON}
              disabled={filteredDocs.length === 0}
              sx={{ borderRadius: 2 }}
            >
              Exportar JSON
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<DownloadIcon />}
              onClick={exportAsCSV}
              disabled={filteredDocs.length === 0}
              sx={{ borderRadius: 2 }}
            >
              CSV
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<DownloadIcon />}
              onClick={exportAsExcel}
              disabled={filteredDocs.length === 0}
              sx={{ borderRadius: 2 }}
            >
              Excel (Completo)
            </Button>
          </Grid>
        </Grid>
      </Card>

      {/* History Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 4, flexGrow: 1 }}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Fecha Escaneo</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Nombre del Archivo</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Tipo</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Proveedor / Empresa</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Nº Documento</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="right">Total</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredDocs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <Typography variant="body1" color="text.secondary">
                    {documents.length === 0 
                      ? 'No hay documentos digitalizados todavía. ¡Carga un archivo o captura una foto para empezar!'
                      : 'Ningún documento coincide con los filtros aplicados.'
                    }
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredDocs.map((doc) => (
                <TableRow key={doc.id} hover>
                  <TableCell>
                    {new Date(doc.processedAt).toLocaleDateString()} {new Date(doc.processedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{doc.fileName}</TableCell>
                  <TableCell>
                    <Chip
                      label={doc.extractedData.tipo.toUpperCase().replace(/_/g, ' ')}
                      size="small"
                      color={
                        doc.extractedData.tipo === 'factura' ? 'primary' :
                        doc.extractedData.tipo === 'remito' ? 'secondary' :
                        doc.extractedData.tipo === 'lista_de_precios' ? 'info' :
                        doc.extractedData.tipo === 'presupuesto' ? 'warning' : 'default'
                      }
                      sx={{ fontWeight: 'bold', fontSize: '0.7rem' }}
                    />
                  </TableCell>
                  <TableCell>{doc.extractedData.empresa || '-'}</TableCell>
                  <TableCell>{doc.extractedData.numero || '-'}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                    ${doc.extractedData.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'inline-flex', gap: 1 }}>
                      <Tooltip title="Ver Detalles">
                        <IconButton 
                          size="small" 
                          color="primary"
                          onClick={() => handleOpenDetails(doc)}
                        >
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar Registro">
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => {
                            if (window.confirm(`¿Seguro que deseas eliminar "${doc.fileName}" del historial?`)) {
                              deleteDocument(doc.id);
                            }
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 3. DETAILS MODAL (Pop-up inspect window) */}
      {selectedDoc && (
        <Dialog
          open={true}
          onClose={handleCloseDetails}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: { borderRadius: 4 }
          }}
        >
          <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h6" component="div" sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>
                Detalles del Documento
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Archivo: {selectedDoc.fileName} • ID: {selectedDoc.id}
              </Typography>
            </Box>
            <Chip
              label={selectedDoc.extractedData.tipo.toUpperCase().replace(/_/g, ' ')}
              color="primary"
              sx={{ fontWeight: 'bold' }}
            />
          </DialogTitle>
          
          <DialogContent dividers sx={{ p: 0 }}>
            {/* Navigation Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={modalTab} onChange={(e, val) => setModalTab(val)}>
                <Tab icon={<TableIcon />} label="Tabla Items" />
                <Tab icon={<CodeIcon />} label="JSON Estructurado" />
                <Tab icon={<TextIcon />} label="Texto Completo" />
                {(selectedDoc.originalImage || selectedDoc.processedImage) && <Tab icon={<ImageIcon />} label="Imágenes" />}
              </Tabs>
            </Box>

            {/* Tab Contents */}
            <Box sx={{ p: 3, maxHeight: '55vh', overflow: 'auto' }}>
              
              {/* Tab 0: Table */}
              {modalTab === 0 && (
                <TableContainer component={Paper} elevation={0}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Código</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Descripción</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }} align="right">Cant.</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Unidad</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }} align="right">P. Unitario</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }} align="right">Importe</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedDoc.extractedData.items.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                            No hay ítems tabulados detectados.
                          </TableCell>
                        </TableRow>
                      ) : (
                        selectedDoc.extractedData.items.map((item, idx) => (
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
                      {selectedDoc.extractedData.items.length > 0 && (
                        <>
                          <TableRow>
                            <TableCell colSpan={4} border={0} />
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Subtotal:</TableCell>
                            <TableCell align="right">${selectedDoc.extractedData.subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell colSpan={4} border={0} />
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>IVA (21%):</TableCell>
                            <TableCell align="right">${selectedDoc.extractedData.iva.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell colSpan={4} border={0} />
                            <TableCell align="right" sx={{ fontWeight: 'bold', color: 'primary.main' }}>Total:</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                              ${selectedDoc.extractedData.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        </>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {/* Tab 1: JSON */}
              {modalTab === 1 && (
                <Box
                  component="pre"
                  sx={{
                    p: 2,
                    bgcolor: 'rgba(0,0,0,0.3)',
                    borderRadius: 2,
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    color: '#8be9fd',
                    overflow: 'auto',
                    m: 0
                  }}
                >
                  {JSON.stringify(selectedDoc.extractedData, null, 2)}
                </Box>
              )}

              {/* Tab 2: Raw Text */}
              {modalTab === 2 && (
                <TextField
                  fullWidth
                  multiline
                  rows={10}
                  variant="outlined"
                  placeholder="Sin texto registrado."
                  value={selectedDoc.rawText || ''}
                  InputProps={{
                    readOnly: true,
                    sx: {
                      fontFamily: 'monospace',
                      fontSize: '0.9rem',
                      bgcolor: 'rgba(0,0,0,0.1)',
                      lineHeight: 1.6
                    }
                  }}
                />
              )}

              {/* Tab 3: Images */}
              {modalTab === 3 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={imgViewTab} onChange={(e, val) => setImgViewTab(val)}>
                      <Tab label="Imagen Original" />
                      {selectedDoc.processedImage && <Tab label="Procesada (OpenCV)" />}
                    </Tabs>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.2)', p: 2, borderRadius: 2 }}>
                    <img
                      src={imgViewTab === 0 ? selectedDoc.originalImage : selectedDoc.processedImage}
                      alt="Capture view"
                      style={{ maxWidth: '100%', maxHeight: 350, objectFit: 'contain', borderRadius: 4 }}
                    />
                  </Box>
                </Box>
              )}

            </Box>
          </DialogContent>
          
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={handleCloseDetails} color="inherit">
              Cerrar
            </Button>
            <Button
              variant="outlined"
              startIcon={<CodeIcon />}
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(selectedDoc.extractedData, null, 2));
                alert('¡Copiado al portapapeles!');
              }}
            >
              Copiar JSON
            </Button>
          </DialogActions>
        </Dialog>
      )}

    </Box>
  );
};
