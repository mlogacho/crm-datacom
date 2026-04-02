import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Upload, Download, Search, Trash2, FileSpreadsheet,
  X, CheckCircle, AlertCircle, DollarSign, FileText,
  ChevronRight, ChevronDown, BarChart2, Pencil, FileDown,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { DATACOM_LOGO } from '../assets/logoBase64';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

// ─── Constants ─────────────────────────────────────────────────────────────

const MONTHS = [
  { value: 1,  label: 'Enero' },   { value: 2,  label: 'Febrero' },
  { value: 3,  label: 'Marzo' },   { value: 4,  label: 'Abril' },
  { value: 5,  label: 'Mayo' },    { value: 6,  label: 'Junio' },
  { value: 7,  label: 'Julio' },   { value: 8,  label: 'Agosto' },
  { value: 9,  label: 'Septiembre' }, { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },  { value: 12, label: 'Diciembre' },
];

const MONTH_NAME_TO_NUM = {
  ENERO: 1, FEBRERO: 2, MARZO: 3, ABRIL: 4, MAYO: 5, JUNIO: 6,
  JULIO: 7, AGOSTO: 8, SEPTIEMBRE: 9, OCTUBRE: 10, NOVIEMBRE: 11, DICIEMBRE: 12,
  ENE: 1, FEB: 2, MAR: 3, ABR: 4, MAY: 5, JUN: 6,
  JUL: 7, AGO: 8, SEP: 9, OCT: 10, NOV: 11, DIC: 12,
};

const COL_ALIASES = {
  client_name:    ['CLIENTE', 'CLIENT', 'NOMBRE CLIENTE', 'NOMBRE_CLIENTE', 'NOMBRE'],
  service_name:   ['SERVICIO', 'SERVICIO POR CLIENTE', 'SERVICIO_POR_CLIENTE', 'SERVICE', 'TIPO SERVICIO'],
  service_amount: ['SERVICIO SIN IVA', 'SERVICIO_SIN_IVA', 'MONTO SIN IVA', 'SUBTOTAL', 'MONTO', 'PRECIO SIN IVA'],
  observations:   ['OBSERVACIONES', 'OBSERVACION', 'NOTAS', 'NOTES'],
  factura:        ['FACTURA', 'NRO FACTURA', 'NUMERO FACTURA', 'NÚMERO FACTURA', 'N° FACTURA'],
  credito:        ['CRÉDITO', 'CREDITO', 'CREDIT', 'NOTA CREDITO', 'NOTA DE CRÉDITO'],
  mes:            ['MES', 'MONTH'],
  anio:           ['AÑO', 'ANO', 'YEAR', 'ANIO'],
};

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 8 }, (_, i) => CURRENT_YEAR - 3 + i);

// ─── Helpers ────────────────────────────────────────────────────────────────

function findColIdx(headers, field) {
  const aliases = COL_ALIASES[field] || [field.toUpperCase()];
  for (const alias of aliases) {
    const idx = headers.findIndex(h => h === alias);
    if (idx !== -1) return idx;
  }
  return -1;
}

function parseMes(val) {
  if (val == null || val === '') return null;
  const num = parseInt(val, 10);
  if (!isNaN(num) && num >= 1 && num <= 12) return num;
  const name = String(val).toUpperCase().trim();
  return MONTH_NAME_TO_NUM[name] || null;
}

function parseDecimal(val) {
  if (val == null || val === '') return 0;
  const str = String(val).replace(/[$,\s]/g, '').replace(',', '.');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

function fmtCurrency(value) {
  const n = parseFloat(value) || 0;
  return `$${n.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getMesLabel(num) {
  return MONTHS.find(m => m.value === Number(num))?.label || num;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function Billing() {
  const [records, setRecords]   = useState([]);
  const [catalogs, setCatalogs] = useState([]);
  const [loading, setLoading]   = useState(true);

  const [filters, setFilters] = useState({
    mes: String(new Date().getMonth() + 1), anio: String(CURRENT_YEAR), client: '',
  });

  // Selection
  const [selectedIds,    setSelectedIds]    = useState(new Set());
  const [deleting,       setDeleting]       = useState(false);
  const [expandedGroups, setExpandedGroups] = useState(new Set());

  // Upload modal
  const [showUpload,   setShowUpload]   = useState(false);
  const [uploadFile,   setUploadFile]   = useState(null);
  const [previewRows,  setPreviewRows]  = useState([]);
  const [parseErrors,  setParseErrors]  = useState([]);
  const [importing,    setImporting]    = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [dragOver,     setDragOver]     = useState(false);
  const [showReport,   setShowReport]   = useState(false);

  // Edit modal
  const [editingRecord, setEditingRecord] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    service_catalog: '',
    service_amount: '',
    observations: '',
    factura: '',
    credito: '',
    mes: '',
    anio: '',
  });

  const fileRef = useRef();

  // ── Fetch ──────────────────────────────────────────────────────────────

  const fetchCatalogs = useCallback(async () => {
    try {
      const res = await axios.get('/api/services/catalog/');
      const data = res.data.results || res.data;
      setCatalogs(data.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (e) { console.error(e); }
  }, []);

  const fetchRecords = useCallback(async () => {
    try {
      const params = {};
      if (filters.mes)   params.mes   = filters.mes;
      if (filters.anio)  params.anio  = filters.anio;
      if (filters.client) params.client = filters.client;
      const res = await axios.get('/api/billing/records/', { params });
      setRecords(res.data.results || res.data);
    } catch (e) { console.error(e); }
  }, [filters]);

  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchCatalogs(), fetchRecords()]);
      setLoading(false);
    };
    init();
  }, []);                    // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!loading) { setSelectedIds(new Set()); fetchRecords(); }
  }, [filters]);             // eslint-disable-line react-hooks/exhaustive-deps

  // ── File parsing ────────────────────────────────────────────────────────

  const parseFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const allRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        if (allRows.length < 2) {
          setParseErrors(['El archivo está vacío o no tiene datos.']);
          setPreviewRows([]);
          return;
        }

        const headers  = allRows[0].map(h => String(h).toUpperCase().trim());
        const dataRows = allRows.slice(1).filter(r => r.some(c => c !== ''));

        const colIdx = {};
        for (const field of Object.keys(COL_ALIASES)) {
          colIdx[field] = findColIdx(headers, field);
        }

        // Required columns
        const missingCols = [];
        for (const req of ['client_name', 'mes', 'anio']) {
          if (colIdx[req] === -1) {
            const aliases = COL_ALIASES[req];
            missingCols.push(`"${aliases[0]}" (también acepta: ${aliases.slice(1).join(', ')})`);
          }
        }
        if (missingCols.length) {
          setParseErrors(missingCols.map(c => `Columna requerida no encontrada: ${c}`));
          setPreviewRows([]);
          return;
        }

        const parsed    = [];
        const rowErrors = [];

        dataRows.forEach((row, i) => {
          const rowNum     = i + 2;
          const clientName = String(row[colIdx.client_name] ?? '').trim();
          const mesVal     = colIdx.mes  !== -1 ? row[colIdx.mes]  : '';
          const anioVal    = colIdx.anio !== -1 ? row[colIdx.anio] : '';
          const mes        = parseMes(mesVal);
          const anio       = parseInt(anioVal, 10);

          if (!clientName) {
            rowErrors.push(`Fila ${rowNum}: cliente vacío, se omitirá`);
            return;
          }
          if (!mes) {
            rowErrors.push(`Fila ${rowNum}: mes inválido "${mesVal}", se omitirá`);
            return;
          }
          if (!anio || isNaN(anio)) {
            rowErrors.push(`Fila ${rowNum}: año inválido "${anioVal}", se omitirá`);
            return;
          }

          parsed.push({
            client_name:    clientName,
            service_name:   colIdx.service_name   !== -1 ? String(row[colIdx.service_name]   ?? '').trim() : '',
            service_amount: colIdx.service_amount  !== -1 ? parseDecimal(row[colIdx.service_amount])        : 0,
            observations:   colIdx.observations    !== -1 ? String(row[colIdx.observations]   ?? '').trim() : '',
            factura:        colIdx.factura         !== -1 ? String(row[colIdx.factura]         ?? '').trim() : '',
            credito:        colIdx.credito         !== -1 ? String(row[colIdx.credito]         ?? '').trim() : '',
            mes,
            anio,
          });
        });

        setPreviewRows(parsed);
        setParseErrors(rowErrors);
      } catch (err) {
        setParseErrors([`Error al leer el archivo: ${err.message}`]);
        setPreviewRows([]);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileSelect = (file) => {
    if (!file) return;
    const name = file.name.toLowerCase();
    if (!name.endsWith('.csv') && !name.endsWith('.xlsx') && !name.endsWith('.xls')) {
      alert('Solo se permiten archivos CSV o Excel (.xlsx / .xls)');
      return;
    }
    setUploadFile(file);
    setImportResult(null);
    parseFile(file);
  };

  // ── Import ───────────────────────────────────────────────────────────────

  const handleImport = async () => {
    if (previewRows.length === 0) return;
    setImporting(true);
    try {
      const res = await axios.post('/api/billing/bulk-create/', { records: previewRows });
      setImportResult(res.data);
      if (res.data.created > 0) fetchRecords();
    } catch (err) {
      setImportResult({ error: err.response?.data?.error || 'Error al importar registros' });
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este registro de facturación?')) return;
    try {
      await axios.delete(`/api/billing/records/${id}/`);
      setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
      fetchRecords();
    } catch (e) { console.error(e); }
  };

  const openEditModal = (record) => {
    setEditingRecord(record);
    setEditForm({
      service_catalog: record.service_catalog || '',
      service_amount: String(parseFloat(record.service_amount || 0)),
      observations: record.observations || '',
      factura: record.factura || '',
      credito: record.credito || '',
      mes: String(record.mes || ''),
      anio: String(record.anio || ''),
    });
  };

  const closeEditModal = () => {
    setEditingRecord(null);
    setSavingEdit(false);
  };

  const handleEditChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveEdit = async () => {
    if (!editingRecord) return;

    const serviceAmount = parseFloat(editForm.service_amount);
    const mes = parseInt(editForm.mes, 10);
    const anio = parseInt(editForm.anio, 10);

    if (Number.isNaN(serviceAmount) || serviceAmount < 0) {
      alert('Ingrese un valor válido para "Servicio sin IVA".');
      return;
    }
    if (Number.isNaN(mes) || mes < 1 || mes > 12) {
      alert('El mes debe estar entre 1 y 12.');
      return;
    }
    if (Number.isNaN(anio) || anio < 1900 || anio > 2100) {
      alert('Ingrese un año válido.');
      return;
    }

    const payload = {
      service_catalog: editForm.service_catalog === '' ? null : Number(editForm.service_catalog),
      service_amount: serviceAmount,
      observations: editForm.observations,
      factura: editForm.factura,
      credito: editForm.credito,
      mes,
      anio,
    };

    setSavingEdit(true);
    try {
      await axios.patch(`/api/billing/records/${editingRecord.id}/`, payload);
      await fetchRecords();
      closeEditModal();
    } catch (err) {
      alert(err.response?.data?.detail || 'No se pudo actualizar el registro.');
    } finally {
      setSavingEdit(false);
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === records.length && records.length > 0)
      setSelectedIds(new Set());
    else
      setSelectedIds(new Set(records.map(r => r.id)));
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const n = selectedIds.size;
    if (!window.confirm(`¿Eliminar ${n} registro${n !== 1 ? 's' : ''} seleccionado${n !== 1 ? 's' : ''}?`)) return;
    setDeleting(true);
    try {
      await Promise.all([...selectedIds].map(id => axios.delete(`/api/billing/records/${id}/`)));
      setSelectedIds(new Set());
      fetchRecords();
    } catch (e) { console.error(e); }
    finally { setDeleting(false); }
  };

  const toggleExpandGroup = (key) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const toggleSelectGroup = (groupRecords) => {
    const ids = groupRecords.map(r => r.id);
    const allIn = ids.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allIn) ids.forEach(id => next.delete(id));
      else ids.forEach(id => next.add(id));
      return next;
    });
  };

  // ── Excel report export (backend) ──────────────────────────────────────

  const downloadExcelReport = () => {
    const params = new URLSearchParams();
    if (filters.mes)  params.set('mes',  filters.mes);
    if (filters.anio) params.set('anio', filters.anio);
    const url = `/api/billing/report/export/?${params.toString()}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = '';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // ── PDF report export (client-side jsPDF, data from backend ClientService) ───

  const downloadPdfReport = async () => {
    // Brand colors: Azul Datacom #001e41, Celeste #00d4ea, Gris #E8E8E8
    const AZUL_DC     = [0, 30, 65];
    const WHITE       = [255, 255, 255];
    const BLACK       = [0, 0, 0];
    const GRIS        = [232, 232, 232];

    // Fetch data from backend (ClientService source)
    const params = new URLSearchParams();
    if (filters.mes)  params.set('mes',  filters.mes);
    if (filters.anio) params.set('anio', filters.anio);

    let reportData;
    try {
      const res = await axios.get(`/api/billing/report/data/?${params.toString()}`);
      reportData = res.data;
    } catch (err) {
      alert('Error al obtener datos del reporte: ' + (err.response?.data?.error || err.message));
      return;
    }

    if (!reportData.clients || reportData.clients.length === 0) {
      alert('No hay servicios activos para generar el reporte.');
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    const yearLabel = String(reportData.anio);
    const title     = `FACTURACION MENSUAL RECURRENTE ${yearLabel}`;
    const pageW     = doc.internal.pageSize.width;  // 297mm

    let startY = 28;

    // Titulo pagina 1 (sin logo aqui — el logo se pone en didDrawPage)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...AZUL_DC);
    doc.text(title, pageW / 2, 24, { align: 'center' });

    // Build table body
    const body = [];
    reportData.clients.forEach(client => {
      client.records.forEach((rec, idx) => {
        body.push([
          idx === 0 ? client.name : '',
          rec.service_label || '',
          `$${Number(rec.service_amount).toLocaleString('es-EC', { minimumFractionDigits: 2 })}`,
          `$${Number(rec.iva_amount).toLocaleString('es-EC', { minimumFractionDigits: 2 })}`,
          `$${Number(rec.total).toLocaleString('es-EC', { minimumFractionDigits: 2 })}`,
          idx === 0 ? `$${Number(client.total).toLocaleString('es-EC', { minimumFractionDigits: 2 })}` : '',
          rec.observations || '',
          rec.factura      || '',
          rec.credito      || '',
        ]);
      });
      body.push(['', '', '', '', '', '', '', '', '']); // separator
    });

    const fmt = n => `$${Number(n).toLocaleString('es-EC', { minimumFractionDigits: 2 })}`;

    // TOTAL RECURRENTES
    body.push(['TOTAL RECURRENTES', '',
      fmt(reportData.grand_sin_iva), fmt(reportData.grand_iva), fmt(reportData.grand_total),
      '', '', '', '']);

    // ADICIONALES NO RECURRENTES header
    body.push(['__ADICIONALES__', '', '', '', '', '', '', '', '']);

    // Additional rows
    const adds = reportData.additionals || [];
    adds.forEach(add => {
      body.push([
        add.client_name || '',
        add.service_label || '',
        fmt(add.service_amount),
        fmt(add.iva_amount),
        fmt(add.total),
        '',
        add.observations || '',
        add.factura      || '',
        add.credito      || '',
      ]);
    });

    // TOTAL ADICIONALES
    body.push(['TOTAL ADICIONALES', '',
      fmt(reportData.add_sin_iva || 0), fmt(reportData.add_iva || 0), fmt(reportData.add_total || 0),
      '', '', '', '']);
    body.push(['', '', '', '', '', '', '', '', '']);

    // TOTAL FACTURACION
    body.push(['TOTAL FACTURACIÓN', '',
      fmt(reportData.total_facturacion_sin_iva), fmt(reportData.total_facturacion_iva), fmt(reportData.total_facturacion),
      '', '', '', '']);

    autoTable(doc, {
      startY,
      head: [['Cliente', 'Servicio por Cliente', 'Servicio sin IVA', '15% IVA',
              'TOTAL', 'Facturacion Total Clientes', 'OBSERVACIONES', 'FACTURA', 'CRÉDITO']],
      body,
      styles: {
        font: 'helvetica',
        fontSize: 7,
        cellPadding: 1.5,
        lineWidth: 0,
        overflow: 'linebreak',
        textColor: BLACK,
      },
      headStyles: {
        fillColor: AZUL_DC,
        textColor: WHITE,
        fontStyle: 'bold',
        halign: 'center',
        fontSize: 7.5,
      },
      columnStyles: {
        0: { cellWidth: 28, fontStyle: 'bold' },
        1: { cellWidth: 55 },
        2: { cellWidth: 18, halign: 'right' },
        3: { cellWidth: 16, halign: 'right' },
        4: { cellWidth: 18, halign: 'right' },
        5: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
        6: { cellWidth: 45 },
        7: { cellWidth: 18, halign: 'center' },
        8: { cellWidth: 18, halign: 'center' },
      },
      didParseCell(data) {
        const row     = data.row.raw;
        const isTotal = row[0] === 'TOTAL RECURRENTES';
        const isAddH  = row[0] === '__ADICIONALES__';
        const isAddT  = row[0] === 'TOTAL ADICIONALES';
        const isGrand = row[0] === 'TOTAL FACTURACIÓN';
        const isSep   = row.every(c => c === '');
        if (isTotal || isAddT) {
          data.cell.styles.fillColor = WHITE;
          data.cell.styles.textColor = AZUL_DC;
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fontSize  = 8;
        }
        if (isGrand) {
          data.cell.styles.fillColor = WHITE;
          data.cell.styles.textColor = AZUL_DC;
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fontSize  = 9;
        }
        if (isAddH) {
          data.cell.styles.fillColor = GRIS;
          data.cell.styles.textColor = BLACK;
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fontSize  = 8;
          data.cell.styles.halign    = 'center';
          if (data.column.index === 0) {
            data.cell.text = ['ADICIONALES NO RECURRENTES'];
          } else {
            data.cell.text = [''];
          }
        }
        if (isSep) {
          data.cell.styles.minCellHeight = 2;
          data.cell.styles.fillColor     = WHITE;
          data.cell.styles.lineWidth     = 0;
        }
        // Client name cells: Azul Datacom background + white text
        if (data.column.index === 0 && !isTotal && !isAddH && !isAddT && !isGrand && !isSep && row[0] !== '') {
          data.cell.styles.fillColor = AZUL_DC;
          data.cell.styles.textColor = WHITE;
        }
      },
      margin: { left: 8, right: 8, top: 28 },
    });

    // ── Summary: per-client totals ─────────────────────────────────────
    const summaryBody = reportData.clients.map(c => [c.name, fmt(c.total)]);
    if (adds.length > 0) {
      summaryBody.push(['TOTAL ADICIONALES', fmt(reportData.add_sin_iva || 0)]);
    }

    autoTable(doc, {
      startY: doc.lastAutoTable?.finalY + 8,
      head: [[`FACTURACION MENSUAL RECURRENTE ${yearLabel}`, '']],
      body: summaryBody,
      headStyles: { fillColor: AZUL_DC, textColor: WHITE, fontStyle: 'bold', fontSize: 9 },
      styles: { font: 'helvetica', fontSize: 7, cellPadding: 1.5, lineWidth: 0 },
      columnStyles: {
        0: { cellWidth: 60, fontStyle: 'bold' },
        1: { cellWidth: 25, halign: 'right', fontStyle: 'bold' },
      },
      margin: { left: 8, right: 8 },
      tableWidth: 85,
    });

    const mesLabel = reportData.mes_label || '';

    // ── Añadir logo y titulo en TODAS las paginas (post-render) ──────────
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.saveGraphicsState();
      doc.addImage(DATACOM_LOGO, 'JPEG', 8, 3, 55, 22, 'datacomlogo');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(0, 30, 65);
      doc.text(title, pageW / 2, 24, { align: 'center' });
      doc.restoreGraphicsState();
    }
    doc.setPage(totalPages); // volver a la ultima para guardar en orden

    const filename = mesLabel
      ? `Facturacion_${mesLabel}_${yearLabel}.pdf`
      : `Facturacion_${yearLabel}.pdf`;
    doc.save(filename);
  };

  // ── Template download ────────────────────────────────────────────────────

  const downloadTemplate = () => {
    const rows = [
      ['CLIENTE', 'SERVICIO', 'SERVICIO SIN IVA', '15% IVA', 'TOTAL',
       'FACTURACION TOTAL CLIENTE', 'OBSERVACIONES', 'FACTURA', 'CRÉDITO', 'MES', 'AÑO'],
      ['Empresa ABC', 'Internet Fibra 100Mbps', 500.00, '', '', '', 'Pago puntual', 'FAC-0001', '', 1, CURRENT_YEAR],
      ['Empresa XYZ', 'Hosting Dedicado',       300.00, '', '', '', '',             'FAC-0002', '', 1, CURRENT_YEAR],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    // Column widths
    ws['!cols'] = [20,25,18,12,12,22,20,14,14,8,8].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Facturación');
    XLSX.writeFile(wb, 'plantilla_facturacion.xlsx');
  };

  // ── Reset / close ────────────────────────────────────────────────────────

  const resetUpload = () => {
    setUploadFile(null);
    setPreviewRows([]);
    setParseErrors([]);
    setImportResult(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const closeUpload = () => {
    setShowUpload(false);
    resetUpload();
  };

  // ── Computed stats ───────────────────────────────────────────────────────

  // Dedup by client+mes+anio so multi-service clients are counted once
  const clientMonthTotals = new Map();
  records.forEach(r => {
    const key = `${r.client}_${r.mes}_${r.anio}`;
    clientMonthTotals.set(key, parseFloat(r.facturacion_total_cliente || 0));
  });
  const totalSinIva   = Array.from(clientMonthTotals.values()).reduce((a, b) => a + b, 0);
  const totalConIva   = totalSinIva * 1.15;
  const uniqueClients = new Set(records.map(r => r.client)).size;
  const allSelected   = records.length > 0 && selectedIds.size === records.length;
  const someSelected  = selectedIds.size > 0 && !allSelected;

  // Build grouped structure: one group per client+mes+anio
  const groupedRecords = (() => {
    const map = new Map();
    records.forEach(r => {
      const key = `${r.client}_${r.mes}_${r.anio}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          client: r.client,
          client_name: r.client_name,
          mes: r.mes,
          anio: r.anio,
          facturacion_total_cliente: parseFloat(r.facturacion_total_cliente || 0),
          rows: [],
        });
      }
      map.get(key).rows.push(r);
    });
    return Array.from(map.values());
  })();

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Facturación</h1>
          <p className="text-slate-500 text-sm mt-1">Gestión de facturación mensual por cliente</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Plantilla
          </button>
          <button
            onClick={() => setShowReport(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            <BarChart2 className="w-4 h-4" />
            Generar Reportes
          </button>
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Migrar Excel / CSV
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={<FileText className="w-5 h-5 text-sky-600" />} bg="bg-sky-100"
          label="Registros" value={records.length} />
        <StatCard icon={<DollarSign className="w-5 h-5 text-emerald-600" />} bg="bg-emerald-100"
          label="Total sin IVA" value={fmtCurrency(totalSinIva)} />
        <StatCard icon={<DollarSign className="w-5 h-5 text-amber-600" />} bg="bg-amber-100"
          label="Total con IVA" value={fmtCurrency(totalConIva)} />
      </div>

      {/* ── Filters + Download ── */}
      <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[180px]">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={filters.client}
              onChange={e => setFilters(p => ({ ...p, client: e.target.value }))}
              className="w-full text-sm border-none outline-none text-slate-700 placeholder-slate-400 bg-transparent"
            />
          </div>

          {/* Mes label + select */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-slate-500">Mes</span>
            <select
              value={filters.mes}
              onChange={e => setFilters(p => ({ ...p, mes: e.target.value }))}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">Todos</option>
              {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

          {/* Año label + select */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-slate-500">Año</span>
            <select
              value={filters.anio}
              onChange={e => setFilters(p => ({ ...p, anio: e.target.value }))}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">Todos</option>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {(filters.mes || filters.client || filters.anio !== String(CURRENT_YEAR)) && (
            <button
              onClick={() => setFilters({ mes: '', anio: String(CURRENT_YEAR), client: '' })}
              className="text-sm text-sky-600 hover:text-sky-800 font-medium"
            >
              Limpiar
            </button>
          )}

          {/* Divider */}
          <div className="hidden sm:block w-px h-7 bg-slate-200 mx-1" />

          {/* Download buttons */}
          <button
            onClick={downloadExcelReport}
            title="Descargar reporte Excel del período seleccionado"
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
          >
            <FileDown className="w-4 h-4" />
            Descargar Excel
          </button>
          <button
            onClick={downloadPdfReport}
            title="Descargar reporte PDF del período seleccionado"
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
          >
            <FileText className="w-4 h-4" />
            Descargar PDF
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" />
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <FileSpreadsheet className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-700 font-semibold">Sin registros de facturación</p>
            <p className="text-slate-500 text-sm mt-1">Importa un archivo Excel o CSV para comenzar</p>
            <button
              onClick={() => setShowUpload(true)}
              className="mt-4 flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700"
            >
              <Upload className="w-4 h-4" /> Importar ahora
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* ── Bulk action bar ── */}
            {selectedIds.size > 0 && (
              <div className="flex items-center justify-between px-4 py-2.5 bg-sky-50 border-b border-sky-200">
                <span className="text-sm font-medium text-sky-700">
                  {selectedIds.size} registro{selectedIds.size !== 1 ? 's' : ''} seleccionado{selectedIds.size !== 1 ? 's' : ''}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    className="text-sm text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    Deseleccionar
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    disabled={deleting}
                    className="flex items-center gap-1.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {deleting ? 'Eliminando…' : `Eliminar (${selectedIds.size})`}
                  </button>
                </div>
              </div>
            )}
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={el => { if (el) el.indeterminate = someSelected; }}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                    />
                  </th>
                  {[
                    ['Cliente',            'text-left'],
                    ['Servicio',           'text-left'],
                    ['Servicio sin IVA',   'text-right'],
                    ['15% IVA',            'text-right'],
                    ['Total',              'text-right'],
                    ['Fact. Total Cliente','text-right'],
                    ['Observaciones',      'text-left'],
                    ['Factura',            'text-left'],
                    ['Crédito',            'text-left'],
                    ['Mes',                'text-center'],
                    ['Año',                'text-center'],
                    ['',                   ''],
                  ].map(([label, align], i) => (
                    <th key={i} className={`${align} px-4 py-3 font-semibold text-slate-600 whitespace-nowrap`}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groupedRecords.map(g => {
                  const isExpanded    = expandedGroups.has(g.key);
                  const groupIds      = g.rows.map(r => r.id);
                  const allGroupSel   = groupIds.every(id => selectedIds.has(id));
                  const someGroupSel  = groupIds.some(id => selectedIds.has(id)) && !allGroupSel;
                  const ftc           = g.facturacion_total_cliente;
                  const sumIva        = ftc * 0.15;
                  const sumTotal      = ftc * 1.15;
                  const firstRow      = g.rows[0];
                  const commonCredito = g.rows.every(r => r.credito === firstRow.credito) ? (firstRow.credito || '—') : 'Varios';

                  return (
                    <React.Fragment key={g.key}>
                      {/* ── Summary row ── */}
                      <tr className={`border-b border-slate-200 transition-colors ${
                        allGroupSel ? 'bg-sky-50' : 'bg-slate-50 hover:bg-slate-100'
                      }`}>
                        <td className="px-4 py-3 w-10">
                          <input
                            type="checkbox"
                            checked={allGroupSel}
                            ref={el => { if (el) el.indeterminate = someGroupSel; }}
                            onChange={() => toggleSelectGroup(g.rows)}
                            className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleExpandGroup(g.key)}
                            className="flex items-center gap-2 group text-left w-full"
                          >
                            {isExpanded
                              ? <ChevronDown  className="w-4 h-4 text-sky-500 shrink-0" />
                              : <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-sky-500 shrink-0" />
                            }
                            <span className="font-semibold text-slate-800 whitespace-nowrap">{g.client_name}</span>
                            <span className="ml-1 px-1.5 py-0.5 text-xs font-medium bg-sky-100 text-sky-700 rounded-full whitespace-nowrap">
                              {g.rows.length} {g.rows.length === 1 ? 'servicio' : 'servicios'}
                            </span>
                          </button>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs italic">—</td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-slate-800 whitespace-nowrap">{fmtCurrency(ftc)}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-500 whitespace-nowrap">{fmtCurrency(sumIva)}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">{fmtCurrency(sumTotal)}</td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-sky-700 whitespace-nowrap">{fmtCurrency(ftc)}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs italic">—</td>
                        <td className="px-4 py-3 text-slate-400 text-xs italic">—</td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap text-sm">{commonCredito}</td>
                        <td className="px-4 py-3 text-center text-slate-700 whitespace-nowrap">{getMesLabel(g.mes)}</td>
                        <td className="px-4 py-3 text-center text-slate-700 whitespace-nowrap">{g.anio}</td>
                        <td className="px-4 py-3">
                          {g.rows.length === 1 && (
                            <button
                              onClick={() => openEditModal(g.rows[0])}
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors mr-1"
                              title="Editar registro"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={async () => {
                              if (!window.confirm(`¿Eliminar todos los servicios de ${g.client_name} (${g.rows.length})?`)) return;
                              await Promise.all(g.rows.map(r => axios.delete(`/api/billing/records/${r.id}/`)));
                              setSelectedIds(prev => { const n = new Set(prev); groupIds.forEach(id => n.delete(id)); return n; });
                              fetchRecords();
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar todos los servicios de este cliente"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>

                      {/* ── Detail rows (expanded) ── */}
                      {isExpanded && g.rows.map((r) => {
                        const isSelected = selectedIds.has(r.id);
                        return (
                          <tr
                            key={r.id}
                            className={`border-b border-slate-100 transition-colors text-sm ${
                              isSelected ? 'bg-sky-50' : 'bg-white hover:bg-slate-50'
                            }`}
                          >
                            <td className="px-4 py-2.5 w-10">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectOne(r.id)}
                                className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                              />
                            </td>
                            <td className="pl-10 pr-4 py-2.5 text-slate-500 whitespace-nowrap">
                              <span className="text-slate-300 mr-2">└</span>
                              <span className="text-slate-600">{r.service_name || '—'}</span>
                            </td>
                            <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{r.service_name || '—'}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-slate-700 whitespace-nowrap">{fmtCurrency(r.service_amount)}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-slate-400 whitespace-nowrap">{fmtCurrency(r.iva_amount)}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-slate-700 whitespace-nowrap">{fmtCurrency(r.total)}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-sky-600 whitespace-nowrap">{fmtCurrency(r.facturacion_total_cliente)}</td>
                            <td className="px-4 py-2.5 text-slate-400 max-w-[180px] truncate">{r.observations || '—'}</td>
                            <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{r.factura || '—'}</td>
                            <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{r.credito || '—'}</td>
                            <td className="px-4 py-2.5 text-center text-slate-500 whitespace-nowrap">{getMesLabel(r.mes)}</td>
                            <td className="px-4 py-2.5 text-center text-slate-500 whitespace-nowrap">{r.anio}</td>
                            <td className="px-4 py-2.5">
                              <button
                                onClick={() => openEditModal(r)}
                                className="p-1.5 text-slate-300 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors mr-1"
                                title="Editar"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(r.id)}
                                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
              {records.length} servicio{records.length !== 1 ? 's' : ''} · {uniqueClients} cliente{uniqueClients !== 1 ? 's' : ''}
            </div>
          </div>
        )}
      </div>

      {/* ── Edit Modal ── */}
      {editingRecord && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Editar registro de facturación</h2>
                <p className="text-xs text-slate-500 mt-0.5">Cliente: {editingRecord.client_name}</p>
              </div>
              <button onClick={closeEditModal} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="text-sm text-slate-700">
                Servicio (catálogo)
                <select
                  value={editForm.service_catalog}
                  onChange={e => handleEditChange('service_catalog', e.target.value)}
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                >
                  <option value="">Sin catálogo</option>
                  {catalogs.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-slate-700">
                Servicio sin IVA
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editForm.service_amount}
                  onChange={e => handleEditChange('service_amount', e.target.value)}
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </label>

              <label className="text-sm text-slate-700">
                Factura
                <input
                  type="text"
                  value={editForm.factura}
                  onChange={e => handleEditChange('factura', e.target.value)}
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </label>

              <label className="text-sm text-slate-700">
                Crédito
                <input
                  type="text"
                  value={editForm.credito}
                  onChange={e => handleEditChange('credito', e.target.value)}
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </label>

              <label className="text-sm text-slate-700">
                Mes
                <select
                  value={editForm.mes}
                  onChange={e => handleEditChange('mes', e.target.value)}
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                >
                  <option value="">Seleccione mes</option>
                  {MONTHS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-slate-700">
                Año
                <input
                  type="number"
                  min="1900"
                  max="2100"
                  value={editForm.anio}
                  onChange={e => handleEditChange('anio', e.target.value)}
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </label>

              <label className="text-sm text-slate-700 md:col-span-2">
                Observaciones
                <textarea
                  rows={3}
                  value={editForm.observations}
                  onChange={e => handleEditChange('observations', e.target.value)}
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </label>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                onClick={closeEditModal}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 disabled:opacity-60 transition-colors"
              >
                {savingEdit ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Report Modal ── */}
      {showReport && (
        <BillingReportModal
          records={records}
          groupedRecords={groupedRecords}
          onClose={() => setShowReport(false)}
        />
      )}

      {/* ── Upload Modal ── */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5 text-sky-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Importar Facturación</h2>
                  <p className="text-xs text-slate-500">Sube un archivo Excel (.xlsx) o CSV y revisa la vista previa antes de confirmar</p>
                </div>
              </div>
              <button onClick={closeUpload} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto flex-1 p-6 space-y-5">
              {!importResult ? (
                <>
                  {/* Drop zone */}
                  <div
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={e => { e.preventDefault(); setDragOver(false); handleFileSelect(e.dataTransfer.files[0]); }}
                    onClick={() => fileRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all select-none ${
                      dragOver
                        ? 'border-sky-500 bg-sky-50'
                        : uploadFile
                          ? 'border-emerald-400 bg-emerald-50'
                          : 'border-slate-300 hover:border-sky-400 hover:bg-sky-50/50'
                    }`}
                  >
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      className="hidden"
                      onChange={e => handleFileSelect(e.target.files[0])}
                    />
                    {uploadFile ? (
                      <>
                        <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                        <p className="font-semibold text-emerald-700">{uploadFile.name}</p>
                        <p className="text-sm text-emerald-600 mt-1">
                          {previewRows.length} {previewRows.length === 1 ? 'fila detectada' : 'filas detectadas'}
                        </p>
                        <button
                          onClick={e => { e.stopPropagation(); resetUpload(); }}
                          className="mt-2 text-xs text-slate-500 hover:text-red-500 underline"
                        >
                          Cambiar archivo
                        </button>
                      </>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                        <p className="font-semibold text-slate-700">Arrastra tu archivo aquí</p>
                        <p className="text-sm text-slate-400 mt-1">o haz clic para seleccionar</p>
                        <p className="text-xs text-slate-400 mt-2">Formatos aceptados: .xlsx · .xls · .csv</p>
                      </>
                    )}
                  </div>

                  {/* Column reference */}
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-slate-700 mb-3">Columnas del archivo:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-4 text-xs">
                      {[
                        ['CLIENTE *',           'Nombre del cliente (requerido)'],
                        ['SERVICIO',            'Nombre del servicio del catálogo'],
                        ['SERVICIO SIN IVA',    'Monto base sin IVA'],
                        ['OBSERVACIONES',       'Notas u observaciones'],
                        ['FACTURA',             'Número o referencia de factura'],
                        ['CRÉDITO',             'Nota de crédito'],
                        ['MES *',               'Número 1–12 o nombre del mes (requerido)'],
                        ['AÑO *',               'Año a 4 dígitos, ej. 2026 (requerido)'],
                      ].map(([col, desc]) => (
                        <div key={col} className="flex items-baseline gap-2">
                          <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-700 shrink-0">
                            {col}
                          </span>
                          <span className="text-slate-500">{desc}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-slate-400 text-xs mt-3">
                      Las columnas <strong>15% IVA</strong>, <strong>TOTAL</strong> y <strong>FACTURACIÓN TOTAL CLIENTE</strong> se calculan automáticamente.
                    </p>
                  </div>

                  {/* Parse warnings */}
                  {parseErrors.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm mb-2">
                        <AlertCircle className="w-4 h-4" />
                        {parseErrors.length} advertencia{parseErrors.length !== 1 ? 's' : ''}
                      </div>
                      <ul className="space-y-0.5">
                        {parseErrors.slice(0, 6).map((e, i) => (
                          <li key={i} className="text-xs text-amber-700">{e}</li>
                        ))}
                        {parseErrors.length > 6 && (
                          <li className="text-xs text-amber-500">…y {parseErrors.length - 6} más</li>
                        )}
                      </ul>
                    </div>
                  )}

                  {/* Preview table */}
                  {previewRows.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-slate-700 mb-2">
                        Vista previa — {previewRows.length} registro{previewRows.length !== 1 ? 's' : ''} a importar
                      </p>
                      <div className="overflow-x-auto border border-slate-200 rounded-xl">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                              {['Cliente','Servicio','Sin IVA','Observaciones','Factura','Crédito','Mes','Año'].map(h => (
                                <th key={h} className="px-3 py-2 text-left font-semibold text-slate-600 whitespace-nowrap">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {previewRows.slice(0, 8).map((row, i) => (
                              <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="px-3 py-2 font-medium text-slate-800 whitespace-nowrap">{row.client_name}</td>
                                <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{row.service_name || '—'}</td>
                                <td className="px-3 py-2 text-right font-mono">{fmtCurrency(row.service_amount)}</td>
                                <td className="px-3 py-2 text-slate-500 max-w-[120px] truncate">{row.observations || '—'}</td>
                                <td className="px-3 py-2 whitespace-nowrap">{row.factura || '—'}</td>
                                <td className="px-3 py-2 whitespace-nowrap">{row.credito || '—'}</td>
                                <td className="px-3 py-2 text-center whitespace-nowrap">{getMesLabel(row.mes)}</td>
                                <td className="px-3 py-2 text-center">{row.anio}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {previewRows.length > 8 && (
                          <p className="text-xs text-slate-400 text-center py-2">
                            …y {previewRows.length - 8} filas más
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Import result */
                <div className={`rounded-xl p-8 text-center ${importResult.error ? 'bg-red-50 border border-red-200' : 'bg-emerald-50 border border-emerald-200'}`}>
                  {importResult.error ? (
                    <>
                      <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                      <p className="font-semibold text-red-700 text-lg">{importResult.error}</p>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                      <div className="flex items-center justify-center gap-6 mb-1">
                        {importResult.created > 0 && (
                          <div className="text-center">
                            <p className="font-bold text-emerald-700 text-2xl">{importResult.created}</p>
                            <p className="text-emerald-600 text-sm font-medium">nuevo{importResult.created !== 1 ? 's' : ''}</p>
                          </div>
                        )}
                        {importResult.updated > 0 && (
                          <div className="text-center">
                            <p className="font-bold text-sky-700 text-2xl">{importResult.updated}</p>
                            <p className="text-sky-600 text-sm font-medium">actualizado{importResult.updated !== 1 ? 's' : ''}</p>
                          </div>
                        )}
                      </div>
                      <p className="text-slate-500 text-sm">
                        {(importResult.created + (importResult.updated || 0))} registro{(importResult.created + (importResult.updated || 0)) !== 1 ? 's' : ''} procesado{(importResult.created + (importResult.updated || 0)) !== 1 ? 's' : ''} correctamente
                      </p>
                      {importResult.clients_created?.length > 0 && (
                        <div className="mt-4 text-left bg-sky-50 border border-sky-200 rounded-lg p-3 space-y-1">
                          <p className="text-sm font-semibold text-sky-700">
                            {importResult.clients_created.length} cliente{importResult.clients_created.length !== 1 ? 's' : ''} nuevo{importResult.clients_created.length !== 1 ? 's' : ''} creado{importResult.clients_created.length !== 1 ? 's' : ''} automáticamente:
                          </p>
                          <p className="text-xs text-sky-500 mb-1">Recuerda completar su RUC/NIT y correo en el módulo de Clientes.</p>
                          {importResult.clients_created.map((name, i) => (
                            <p key={i} className="text-xs text-sky-700 font-medium">· {name}</p>
                          ))}
                        </div>
                      )}
                      {importResult.errors?.length > 0 && (
                        <div className="mt-4 text-left bg-white rounded-lg p-3 space-y-1">
                          <p className="text-sm font-semibold text-amber-700">
                            {importResult.errors.length} fila{importResult.errors.length !== 1 ? 's' : ''} no importada{importResult.errors.length !== 1 ? 's' : ''}:
                          </p>
                          {importResult.errors.map((e, i) => (
                            <p key={i} className="text-xs text-amber-600">{e}</p>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between shrink-0">
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                <Download className="w-4 h-4" /> Descargar plantilla
              </button>
              <div className="flex gap-3">
                <button
                  onClick={closeUpload}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  {importResult?.created > 0 ? 'Cerrar' : 'Cancelar'}
                </button>
                {!importResult && previewRows.length > 0 && (
                  <button
                    onClick={handleImport}
                    disabled={importing}
                    className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 disabled:opacity-60 transition-colors"
                  >
                    {importing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        Importando…
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Confirmar importación ({previewRows.length})
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ icon, bg, label, value }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center shrink-0`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-slate-500 font-medium">{label}</p>
          <p className="text-xl font-bold text-slate-800 truncate">{value}</p>
        </div>
      </div>
    </div>
  );
}

// ── Report Modal ─────────────────────────────────────────────────────────────

const CHART_COLORS = [
  '#0ea5e9','#6366f1','#10b981','#f59e0b',
  '#ef4444','#8b5cf6','#ec4899','#14b8a6',
  '#f97316','#84cc16','#06b6d4','#a855f7',
];

const DIMENSIONS = [
  { value: 'client',  label: 'Cliente' },
  { value: 'mes',     label: 'Mes' },
  { value: 'anio',    label: 'Año' },
  { value: 'service', label: 'Servicio' },
];

const METRICS = [
  { value: 'sin_iva', label: 'Facturación sin IVA', currency: true },
  { value: 'con_iva', label: 'Total con IVA',       currency: true },
  { value: 'count',   label: 'N° de Servicios',     currency: false },
];

function BillingReportModal({ records, groupedRecords, onClose }) {
  const [chartType, setChartType] = useState('bar');
  const [dimension, setDimension] = useState('client');
  const [metric,    setMetric]    = useState('sin_iva');

  const isCurrency = METRICS.find(m => m.value === metric)?.currency ?? true;

  const chartData = useMemo(() => {
    if (!records.length) return [];

    if (dimension === 'client') {
      return groupedRecords.map(g => ({
        name:  g.client_name,
        value: metric === 'sin_iva' ? g.facturacion_total_cliente
             : metric === 'con_iva' ? g.facturacion_total_cliente * 1.15
             : g.rows.length,
      })).sort((a, b) => b.value - a.value);
    }

    if (dimension === 'mes') {
      const map = new Map();
      records.forEach(r => {
        if (!map.has(r.mes)) map.set(r.mes, { name: getMesLabel(r.mes), value: 0, _o: r.mes });
        const e = map.get(r.mes);
        e.value += metric === 'count' ? 1
                 : metric === 'sin_iva' ? parseFloat(r.service_amount || 0)
                 : parseFloat(r.total || 0);
      });
      return Array.from(map.values()).sort((a, b) => a._o - b._o);
    }

    if (dimension === 'anio') {
      const map = new Map();
      records.forEach(r => {
        if (!map.has(r.anio)) map.set(r.anio, { name: String(r.anio), value: 0, _o: r.anio });
        const e = map.get(r.anio);
        e.value += metric === 'count' ? 1
                 : metric === 'sin_iva' ? parseFloat(r.service_amount || 0)
                 : parseFloat(r.total || 0);
      });
      return Array.from(map.values()).sort((a, b) => a._o - b._o);
    }

    if (dimension === 'service') {
      const map = new Map();
      records.forEach(r => {
        const k = r.service_name || '(Sin nombre)';
        if (!map.has(k)) map.set(k, { name: k, value: 0 });
        const e = map.get(k);
        e.value += metric === 'count' ? 1
                 : metric === 'sin_iva' ? parseFloat(r.service_amount || 0)
                 : parseFloat(r.total || 0);
      });
      return Array.from(map.values()).sort((a, b) => b.value - a.value).slice(0, 15);
    }

    return [];
  }, [records, groupedRecords, dimension, metric]);

  const pieData = useMemo(() => {
    if (chartData.length <= 9) return chartData;
    const top = chartData.slice(0, 8);
    const rest = chartData.slice(8).reduce((s, d) => s + d.value, 0);
    return [...top, { name: 'Otros', value: parseFloat(rest.toFixed(2)) }];
  }, [chartData]);

  const fmtAxis = (v) => {
    if (!isCurrency) return v;
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
    return `$${v.toFixed(0)}`;
  };

  const CustomTooltip = useCallback(({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xl text-sm max-w-[220px]">
        <p className="font-semibold text-slate-700 mb-1 break-words">{label}</p>
        <p className="font-mono text-sky-600 text-base">
          {isCurrency ? fmtCurrency(payload[0].value) : `${payload[0].value} servicios`}
        </p>
      </div>
    );
  }, [isCurrency]);

  const PieCustomTooltip = useCallback(({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0];
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xl text-sm max-w-[220px]">
        <p className="font-semibold text-slate-700 mb-1 break-words">{d.name}</p>
        <p className="font-mono text-sky-600 text-base">
          {isCurrency ? fmtCurrency(d.value) : `${d.value} servicios`}
        </p>
        <p className="text-slate-400 text-xs mt-0.5">
          {(d.payload.percent * 100).toFixed(1)}% del total
        </p>
      </div>
    );
  }, [isCurrency]);

  const useHorizontal = dimension === 'client' || dimension === 'service';
  const barHeight = useHorizontal
    ? Math.max(320, Math.min(600, chartData.length * 40))
    : 340;

  const chartTitle = `${METRICS.find(m => m.value === metric)?.label} por ${DIMENSIONS.find(d => d.value === dimension)?.label}`;

  const total = chartData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[94vh] flex flex-col">

        {/* ── Modal header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <BarChart2 className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Generar Reportes</h2>
              <p className="text-xs text-slate-500">Visualiza la facturación en gráficos de barra o pastel</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Chart type toggle */}
            <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
              {[
                { v: 'bar', label: 'Barras' },
                { v: 'pie', label: 'Pastel' },
              ].map(({ v, label }) => (
                <button
                  key={v}
                  onClick={() => setChartType(v)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                    chartType === v
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* ── Controls ── */}
        <div className="flex flex-wrap items-center gap-4 px-6 py-3 border-b border-slate-100 bg-slate-50/60 shrink-0">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Agrupar por</label>
            <select
              value={dimension}
              onChange={e => setDimension(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {DIMENSIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Mostrar</label>
            <select
              value={metric}
              onChange={e => setMetric(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {METRICS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-slate-400">{chartTitle}</p>
            <p className="text-sm font-semibold text-slate-700">
              Total: {isCurrency ? fmtCurrency(total) : `${total} servicios`}
            </p>
          </div>
        </div>

        {/* ── Chart area ── */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {records.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
              <BarChart2 className="w-12 h-12 text-slate-200" />
              <p>Sin datos para graficar. Importa registros primero.</p>
            </div>
          ) : chartType === 'bar' ? (
            <ResponsiveContainer width="100%" height={barHeight}>
              {useHorizontal ? (
                <BarChart
                  layout="vertical"
                  data={chartData}
                  margin={{ top: 4, right: 60, left: 8, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tickFormatter={fmtAxis} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={170} tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={28}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 4, right: 20, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f94d' }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={56}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={160}
                    innerRadius={64}
                    dataKey="value"
                    paddingAngle={2}
                    labelLine={false}
                    label={({ percent }) => percent > 0.04 ? `${(percent * 100).toFixed(1)}%` : ''}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieCustomTooltip />} />
                  <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    iconType="circle"
                    iconSize={10}
                    formatter={(value) => <span style={{ fontSize: 12, color: '#475569' }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
              {chartData.length > 9 && (
                <p className="text-xs text-slate-400">
                  Mostrando los 8 mayores · el resto agrupado como "Otros"
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/60">
          <p className="text-xs text-slate-400">
            {chartData.length} {dimension === 'client' ? 'clientes' : dimension === 'mes' ? 'meses' : dimension === 'anio' ? 'años' : 'servicios'} · {records.length} registros totales
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
