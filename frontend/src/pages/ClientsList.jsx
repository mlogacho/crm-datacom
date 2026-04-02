import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Search, Filter, MoreVertical, Building2, Smartphone, MonitorSmartphone, Trash2, Upload, ClipboardList, Server, FileText, Download, FileDown } from 'lucide-react';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DATACOM_LOGO } from '../assets/logoBase64';

export default function ClientsList() {
    const location = useLocation();
    const [clients, setClients] = useState([]);

    // Filtros combinados
    const [filters, setFilters] = useState({
        search: '',
        type: '', // This will now represent service catalog ID
        status: '',
        region: '',
        segment: '',
        service_location: '',
        account_manager: location.state?.filterManager || ''
    });

    const [services, setServices] = useState([]);
    const [accountManagers, setAccountManagers] = useState([]);

    const [isReportLoading, setIsReportLoading] = useState(false);
    const [reportMes, setReportMes] = useState(new Date().getMonth() + 1);
    const [reportAnio, setReportAnio] = useState(new Date().getFullYear());

    const MONTH_OPTIONS = [
        { value: 1, label: 'Enero' },
        { value: 2, label: 'Febrero' },
        { value: 3, label: 'Marzo' },
        { value: 4, label: 'Abril' },
        { value: 5, label: 'Mayo' },
        { value: 6, label: 'Junio' },
        { value: 7, label: 'Julio' },
        { value: 8, label: 'Agosto' },
        { value: 9, label: 'Septiembre' },
        { value: 10, label: 'Octubre' },
        { value: 11, label: 'Noviembre' },
        { value: 12, label: 'Diciembre' },
    ];
    const YEAR_OPTIONS = Array.from({ length: 5 }, (_, index) => new Date().getFullYear() - 2 + index);

    const [isIdFilterModalOpen, setIsIdFilterModalOpen] = useState(false); // Probablemente no se usa aquí pero mantengo orden
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [editingClient, setEditingClient] = useState(null);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [statusClient, setStatusClient] = useState(null);
    const [statusFormData, setStatusFormData] = useState({ state: 'FIRST_MEETING', reason: '', evidence: null, nrc: '', mrc: '', custom_date: '' });

    // History Modal State
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [historyClient, setHistoryClient] = useState(null);

    // Active Status Modal State
    const [isActiveStatusModalOpen, setIsActiveStatusModalOpen] = useState(false);
    const [activeStatusClient, setActiveStatusClient] = useState(null);
    const [activeStatusFormData, setActiveStatusFormData] = useState({
        state: 'BACKLOG',
        sub_state: 'FIRST_MEETING',
        reason: '',
        evidence: null,
        nrc: '',
        mrc: '',
        bandwidth: '',
        service_location: '',
        custom_date: new Date().toISOString().slice(0, 16)
    });
    // Services Modal State
    const [isServicesModalOpen, setIsServicesModalOpen] = useState(false);
    const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
    const [servicesClient, setServicesClient] = useState(null);
    const [clientServicesList, setClientServicesList] = useState([]);
    const [newServiceFormData, setNewServiceFormData] = useState({
        service: '',
        agreed_price: '',
        nrc: '',
        start_date: new Date().toISOString().split('T')[0],
        status: 'PROSPECTING',
        bandwidth: '',
        service_location: '',
        notes: ''
    });

    // Update Service Modal State
    const [isUpdateServiceModalOpen, setIsUpdateServiceModalOpen] = useState(false);
    const [editingService, setEditingService] = useState(null);
    const [updateServiceFormData, setUpdateServiceFormData] = useState({
        status: '',
        agreed_price: '',
        nrc: '',
        bandwidth: '',
        service_location: '',
        notes: '',
        new_note: ''
    });

    // Work Order Modal State
    const [isWorkOrderModalOpen, setIsWorkOrderModalOpen] = useState(false);
    const [workOrderFormData, setWorkOrderFormData] = useState({
        order_number: '',
        client_name: '',
        service_name: '',
        service_location: '',
        login: '',
        estimated_date: '',
        observations: ''
    });



    // Form state (usado para Nuevo y para Editar)
    const initialFormState = {
        name: '',
        legal_name: '',
        tax_id_type: 'RUC',
        tax_id: '',
        client_type_new: '', // Changed from type
        email: '',
        phone: '',
        address: '',
        region: '',
        city: '',
        segment: '',
        service_location: '',
        account_manager: '', // stores User.id or ''
        is_active: true,
        classification: 'PROSPECT'
    };
    const [formData, setFormData] = useState(initialFormState);

    useEffect(() => {
        fetchClients();
        fetchServices();
        fetchAccountManagers();
    }, []);

    useEffect(() => {
        if (location.state?.globalSearch !== undefined) {
            setFilters(prev => ({ ...prev, search: location.state.globalSearch }));
        }
    }, [location.state?.globalSearch]);

    const fetchAccountManagers = async () => {
        try {
            const response = await axios.get('/api/core/account-managers/');
            setAccountManagers(response.data);
        } catch (error) {
            console.error('Error fetching account managers:', error);
        }
    };

    const fetchServices = async () => {
        try {
            const response = await axios.get('/api/services/catalog/');
            const data = response.data.results || response.data;
            const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
            setServices(sorted);
        } catch (error) {
            console.error('Error fetching services:', error);
        }
    };

    const fetchClients = async () => {
        try {
            const response = await axios.get('/api/clients/clients/');
            const dataList = response.data.results ? response.data.results : response.data;
            const mappedClients = dataList.map(client => ({
                id: client.id,
                name: client.name,
                legal_name: client.legal_name,
                tax_id: client.tax_id,
                client_type_new: client.client_type_new,
                classification: client.classification,
                prospect_status: client.prospect_status,
                active_status: client.active_status,
                status_history: client.status_history,
                status: client.is_active ? 'Activo' : 'Inactivo',
                is_active: client.is_active,
                email: client.email,
                phone: client.phone,
                address: client.address,
                region: client.region || '',
                city: client.city || '',
                segment: client.segment || '',
                service_location: client.service_location || '',
                account_manager: client.account_manager ?? '',
                account_manager_name: client.account_manager_name || '',
                assigned_services: client.assigned_services || [],
                total_services_count: client.total_services_count || 0,
                total_mrc: client.total_mrc || 0,
                total_nrc: client.total_nrc || 0
            }));
            setClients(mappedClients);
        } catch (error) {
            console.error('Error fetching clients:', error);
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const translateStatus = (status) => {
        if (!status) return status;
        const statusTranslations = {
            'PROSPECTING': 'Prospección',
            'CONTACTED': 'Contactado',
            'FIRST_MEETING': 'Primera Cita',
            'OFFERED': 'Ofertado',
            'FOLLOW_UP': 'Seguimiento',
            'CLOSING_MEETING': 'Cita de Cierre',
            'DEMO': 'Demo',
            'CONTRACT_SIGNED': 'Firma de Contrato',
            'BACKLOG': 'Backlog',
            'INSTALLED': 'Instalado',
            'BILLED': 'Facturado',
            'NEW_SERVICE': 'Servicio Nuevo',
            'DOWN_GRADE': 'Down Grade',
            'UP_GRADE': 'Up Grade',
            'LOST': 'Negocio Perdido'
        };

        if (status.includes(' - ')) {
            const parts = status.split(' - ');
            const main = statusTranslations[parts[0]] || parts[0];
            const sub = statusTranslations[parts[1]] || parts[1];
            return `${main} - ${sub}`;
        }
        return statusTranslations[status] || status;
    };

    const formatManagerName = (name) => {
        if (!name) return 'N/A';
        return name.split(' ').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
    };

    const escapeCsvValue = (value) => {
        const raw = value == null ? '' : String(value);
        return `"${raw.replace(/"/g, '""')}"`;
    };

    const downloadCsv = (rows, filename) => {
        const headers = ['CLIENTE','SERVICIO','SERVICIO SIN IVA','OBSERVACIONES','FACTURA','CRÉDITO','MES','AÑO'];
        const csvLines = [headers.join(';')];

        rows.forEach(row => {
            csvLines.push([
                escapeCsvValue(row.client_name),
                escapeCsvValue(row.service_name),
                escapeCsvValue(row.service_amount),
                escapeCsvValue(row.observations),
                escapeCsvValue(row.factura),
                escapeCsvValue(row.credito),
                escapeCsvValue(row.mes),
                escapeCsvValue(row.anio),
            ].join(';'));
        });

        const blob = new Blob([csvLines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // ── Excel report export (backend) ────────────────────────────────────
    const downloadExcelReport = () => {
        const params = new URLSearchParams();
        params.set('mes',  reportMes);
        params.set('anio', reportAnio);
        const a = document.createElement('a');
        a.href = `/api/billing/report/export/?${params.toString()}`;
        a.download = '';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    // ── PDF report export (client-side jsPDF) ────────────────────────────
    const downloadPdfReport = async () => {
        // Brand colors: Azul Datacom #001e41, Celeste #00d4ea, Gris #E8E8E8
        const AZUL_DC    = [0, 30, 65];
        const WHITE      = [255, 255, 255];
        const BLACK      = [0, 0, 0];
        const GRIS       = [232, 232, 232];

        let reportData;
        try {
            const res = await axios.get(`/api/billing/report/data/?mes=${reportMes}&anio=${reportAnio}`);
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

        const titleText = `FACTURACION MENSUAL RECURRENTE ${String(reportData.anio)}`;
        const yearLabel = String(reportData.anio);
        const pageW = doc.internal.pageSize.width;  // 297mm
        let startY = 28;

        // Titulo pagina 1
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(...AZUL_DC);
        doc.text(titleText, pageW / 2, 24, { align: 'center' });

        const fmt = n => `$${Number(n).toLocaleString('es-EC', { minimumFractionDigits: 2 })}`;
        const body = [];
        reportData.clients.forEach(client => {
            client.records.forEach((rec, idx) => {
                body.push([
                    idx === 0 ? client.name : '',
                    rec.service_label || '',
                    fmt(rec.service_amount), fmt(rec.iva_amount), fmt(rec.total),
                    idx === 0 ? fmt(client.total) : '',
                    rec.observations || '', rec.factura || '', rec.credito || '',
                ]);
            });
            body.push(['', '', '', '', '', '', '', '', '']);
        });
        body.push(['TOTAL RECURRENTES', '', fmt(reportData.grand_sin_iva), fmt(reportData.grand_iva), fmt(reportData.grand_total), '', '', '', '']);
        body.push(['__ADICIONALES__', '', '', '', '', '', '', '', '']);
        const adds = reportData.additionals || [];
        adds.forEach(a => {
            body.push([a.client_name || '', a.service_label || '', fmt(a.service_amount), fmt(a.iva_amount), fmt(a.total), '', a.observations || '', a.factura || '', a.credito || '']);
        });
        body.push(['TOTAL ADICIONALES', '', fmt(reportData.add_sin_iva || 0), fmt(reportData.add_iva || 0), fmt(reportData.add_total || 0), '', '', '', '']);
        body.push(['', '', '', '', '', '', '', '', '']);
        body.push(['TOTAL FACTURACIÓN', '', fmt(reportData.total_facturacion_sin_iva), fmt(reportData.total_facturacion_iva), fmt(reportData.total_facturacion), '', '', '', '']);

        autoTable(doc, {
            startY,
            head: [['Cliente', 'Servicio por Cliente', 'Servicio sin IVA', '15% IVA', 'TOTAL', 'Facturacion Total Clientes', 'OBSERVACIONES', 'FACTURA', 'CRÉDITO']],
            body,
            styles: { font: 'helvetica', fontSize: 7, cellPadding: 1.5, lineWidth: 0, overflow: 'linebreak', textColor: BLACK },
            headStyles: { fillColor: AZUL_DC, textColor: WHITE, fontStyle: 'bold', halign: 'center', fontSize: 7.5 },
            columnStyles: {
                0: { cellWidth: 28, fontStyle: 'bold' }, 1: { cellWidth: 55 },
                2: { cellWidth: 18, halign: 'right' }, 3: { cellWidth: 16, halign: 'right' },
                4: { cellWidth: 18, halign: 'right' }, 5: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
                6: { cellWidth: 45 }, 7: { cellWidth: 18, halign: 'center' }, 8: { cellWidth: 18, halign: 'center' },
            },
            didParseCell(data) {
                const row = data.row.raw;
                const isTotal = row[0] === 'TOTAL RECURRENTES';
                const isAddH  = row[0] === '__ADICIONALES__';
                const isAddT  = row[0] === 'TOTAL ADICIONALES';
                const isGrand = row[0] === 'TOTAL FACTURACIÓN';
                const isSep   = row.every(c => c === '');
                if (isTotal || isAddT) { data.cell.styles.fillColor = WHITE; data.cell.styles.textColor = AZUL_DC; data.cell.styles.fontStyle = 'bold'; data.cell.styles.fontSize = 8; }
                if (isGrand) { data.cell.styles.fillColor = WHITE; data.cell.styles.textColor = AZUL_DC; data.cell.styles.fontStyle = 'bold'; data.cell.styles.fontSize = 9; }
                if (isAddH) {
                    data.cell.styles.fillColor = GRIS; data.cell.styles.fontStyle = 'bold'; data.cell.styles.fontSize = 8; data.cell.styles.halign = 'center';
                    data.cell.text = data.column.index === 0 ? ['ADICIONALES NO RECURRENTES'] : [''];
                }
                if (isSep) { data.cell.styles.minCellHeight = 2; data.cell.styles.fillColor = WHITE; data.cell.styles.lineWidth = 0; }
                // Client name cells: Azul Datacom background + white text
                if (data.column.index === 0 && !isTotal && !isAddH && !isAddT && !isGrand && !isSep && row[0] !== '') {
                    data.cell.styles.fillColor = AZUL_DC;
                    data.cell.styles.textColor = WHITE;
                }
            },
            margin: { left: 8, right: 8, top: 28 },
        });

        // ── Summary: per-client totals ─────────────────────────────────
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

        // ── Añadir logo y titulo en TODAS las paginas (post-render) ──
        const totalPages = doc.getNumberOfPages();
        for (let p = 1; p <= totalPages; p++) {
            doc.setPage(p);
            // Fondo blanco para que el PNG RGBA se vea nítido
            doc.setFillColor(255, 255, 255);
            doc.rect(8, 3, 55, 22, 'F');
            doc.addImage(DATACOM_LOGO, 'PNG', 8, 3, 55, 22);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(13);
            doc.setTextColor(0, 30, 65);
            doc.text(titleText, pageW / 2, 24, { align: 'center' });
        }
        doc.setPage(totalPages);

        doc.save(mesLabel ? `Facturacion_${mesLabel}_${yearLabel}.pdf` : `Facturacion_${yearLabel}.pdf`);
    };

    const handleExportMonthlyReport = async () => {
        setIsReportLoading(true);
        try {
            const res = await axios.get('/api/billing/records/', {
                params: {
                    mes: reportMes,
                    anio: reportAnio,
                }
            });
            const rows = res.data.results ? res.data.results : res.data;
            if (!rows || rows.length === 0) {
                alert(`No hay registros de facturación para ${reportMes}/${reportAnio}.`);
                setIsReportLoading(false);
                return;
            }
            const filename = `CONTROL_FACTURAS_RECURRENTES_${reportAnio}_${String(reportMes).padStart(2, '0')}.csv`;
            downloadCsv(rows, filename);
        } catch (error) {
            console.error('Error generating report:', error);
            alert('Ocurrió un error al generar el reporte. Verifica la conexión y vuelve a intentarlo.');
        } finally {
            setIsReportLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const isNumeric = /^\d+$/.test(formData.tax_id);
        if (!isNumeric && formData.tax_id_type !== 'OTRO') {
            alert('El documento de identidad debe contener solo números si es RUC o Cédula.');
            return;
        }

        try {
            const payload = {
                ...formData,
                name: formData.name.trim() === '' ? formData.legal_name : formData.name,
                account_manager: formData.account_manager ? Number(formData.account_manager) : null
            };
            delete payload.tax_id_type;

            await axios.post('/api/clients/clients/', payload);
            fetchClients();
            setIsModalOpen(false);
            setFormData(initialFormState);
            alert('¡Cliente registrado exitosamente!');
        } catch (error) {
            console.error('Error creating client:', error);
            const errorMsg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
            alert(`Error al crear el cliente: ${errorMsg}`);
        }
    };

    const openEditModal = (client) => {
        setEditingClient(client);
        setFormData({
            ...initialFormState,
            name: client.name,
            legal_name: client.legal_name || '',
            tax_id_type: 'RUC', // fallback genérico
            tax_id: client.tax_id,
            client_type_new: client.client_type_new || '',
            email: client.email,
            phone: client.phone || '',
            address: client.address || '',
            region: client.region || '',
            city: client.city || '',
            segment: client.segment || '',
            service_location: client.service_location || '',
            account_manager: client.account_manager ? String(client.account_manager) : '',
            is_active: client.is_active,
            classification: client.classification || 'PROSPECT'
        });
        setIsEditModalOpen(true);
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                name: formData.name.trim() === '' ? formData.legal_name : formData.name,
                account_manager: formData.account_manager ? Number(formData.account_manager) : null
            };
            delete payload.tax_id_type;

            await axios.patch(`/api/clients/clients/${editingClient.id}/`, payload);
            fetchClients();
            setIsEditModalOpen(false);
            setEditingClient(null);
            setFormData(initialFormState);
            alert('¡Cliente actualizado exitosamente!');
        } catch (error) {
            console.error('Error updating client:', error);
            alert('Error al actualizar el cliente.');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('¿Estás seguro que deseas eliminar permanentemente este cliente?')) {
            try {
                await axios.delete(`/api/clients/clients/${id}/`);
                setClients(clients.filter(client => client.id !== id));
            } catch (error) {
                console.error('Error deleting client:', error);
                alert('Error al eliminar el cliente.');
            }
        }
    };

    const handleStatusFormChange = (e) => {
        const { name, value, files } = e.target;
        setStatusFormData(prev => ({
            ...prev,
            [name]: files ? files[0] : value
        }));
    };

    const handleStatusSubmit = async (e) => {
        e.preventDefault();

        if (statusFormData.state === 'OFFERED') {
            if (!statusFormData.nrc && !statusFormData.mrc) {
                alert('Al seleccionar el estado "OFERTADO", debes ingresar obligatoriamente al menos el valor de NRC o MRC.');
                return;
            }
        }

        const data = new FormData();
        data.append('status', statusFormData.state);
        data.append('reason', statusFormData.reason);
        if (statusFormData.evidence) {
            data.append('evidence', statusFormData.evidence);
        }
        if (statusFormData.custom_date) {
            data.append('custom_date', statusFormData.custom_date);
        }
        if (statusFormData.state === 'OFFERED') {
            if (statusFormData.nrc) data.append('nrc', statusFormData.nrc);
            if (statusFormData.mrc) data.append('mrc', statusFormData.mrc);
        }

        try {
            await axios.post(`/api/clients/clients/${statusClient.id}/update_prospect_status/`, data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            fetchClients();
            setIsStatusModalOpen(false);
            setStatusClient(null);
            setStatusFormData({ state: 'FIRST_MEETING', reason: '', evidence: null, nrc: '', mrc: '', custom_date: '' });
            alert('¡Estado de prospecto actualizado!');
        } catch (error) {
            console.error('Error updating prospect status:', error);
            alert('Error al actualizar el estado de prospecto.');
        }
    };

    const handleActiveStatusFormChange = (e) => {
        const { name, value, files } = e.target;
        setActiveStatusFormData(prev => ({
            ...prev,
            [name]: files ? files[0] : value
        }));
    };

    // --- Service Management Functions ---
    const fetchClientServices = async (clientId) => {
        try {
            const res = await axios.get(`/api/services/client-services/?client=${clientId}`);
            setClientServicesList(res.data.results || res.data);
        } catch (error) {
            console.error("Error fetching client services:", error);
        }
    };

    const handleServiceSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                client: servicesClient.id,
                service: newServiceFormData.service,
                agreed_price: newServiceFormData.agreed_price,
                nrc: newServiceFormData.nrc || 0,
                start_date: newServiceFormData.start_date,
                status: newServiceFormData.status,
                bandwidth: newServiceFormData.bandwidth,
                service_location: newServiceFormData.service_location,
                notes: newServiceFormData.notes
            };
            await axios.post('/api/services/client-services/', payload);
            setNewServiceFormData({
                service: '',
                agreed_price: '',
                nrc: '',
                start_date: new Date().toISOString().split('T')[0],
                status: 'PROSPECTING',
                bandwidth: '',
                service_location: '',
                notes: ''
            });
            fetchClientServices(servicesClient.id);
            alert("Servicio asociado correctamente.");
        } catch (error) {
            console.error("Error adding service:", error);
            alert("Error al asociar el servicio.");
        }
    };

    const deleteClientService = async (serviceId) => {
        if (window.confirm("¿Seguro que deseas desvincular este servicio del cliente?")) {
            try {
                await axios.delete(`/api/services/client-services/${serviceId}/`);
                fetchClientServices(servicesClient.id);
            } catch (error) {
                console.error("Error deleting client service:", error);
                alert("Error al eliminar la vinculación.");
            }
        }
    };

    const handleUpdateServiceSubmit = async (e) => {
        e.preventDefault();
        try {
            const now = new Date();
            const timestamp = now.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });

            let updatedNotes = updateServiceFormData.notes || '';
            if (updateServiceFormData.new_note && updateServiceFormData.new_note.trim() !== '') {
                const separator = updatedNotes ? "\n---\n" : "";
                updatedNotes = `${updatedNotes}${separator}[${timestamp}]: ${updateServiceFormData.new_note}`;
            }

            const payload = {
                status: updateServiceFormData.status,
                agreed_price: updateServiceFormData.agreed_price,
                nrc: updateServiceFormData.nrc || 0,
                bandwidth: updateServiceFormData.bandwidth,
                service_location: updateServiceFormData.service_location,
                notes: updatedNotes
            };

            await axios.patch(`/api/services/client-services/${editingService.id}/`, payload);
            fetchClientServices(servicesClient.id);

            if (updateServiceFormData.status === 'BACKLOG') {
                try {
                    const seqRes = await axios.get('/api/services/work-orders/next_sequence/');
                    const { next_order_number, next_login_sequence } = seqRes.data;

                    const clientInitials = servicesClient.name
                        .split(' ')
                        .filter(w => w.length > 0)
                        .map(w => w[0])
                        .join('')
                        .toUpperCase();

                    const location = updateServiceFormData.service_location || 'SIN_UBICACION';
                    const serviceName = services.find(s => s.id === editingService.service)?.name || 'SERV';
                    const formattedLogin = `${clientInitials}_${location.replace(/\s+/g, '_')}_${serviceName.replace(/\s+/g, '_')}_${next_login_sequence}`;

                    setWorkOrderFormData({
                        order_number: `Orden de Instalación #${next_order_number}`,
                        client_name: servicesClient.name,
                        service_name: serviceName,
                        service_location: updateServiceFormData.service_location,
                        login: formattedLogin,
                        estimated_date: editingService.work_order ? editingService.work_order.estimated_date?.slice(0, 16) : '',
                        observations: editingService.work_order ? editingService.work_order.observations : ''
                    });

                    setIsUpdateServiceModalOpen(false);
                    setIsWorkOrderModalOpen(true);
                } catch (err) {
                    console.error("Error preparing Work Order:", err);
                    alert("Error al preparar la Orden de Trabajo.");
                }
            } else {
                // If not backlog, log change to history normally
                const historyPayload = new FormData();
                historyPayload.append('status', updateServiceFormData.status);
                historyPayload.append('reason', `Actualización de servicio: ${services.find(s => s.id === editingService.service)?.name || 'N/A'}. ${updateServiceFormData.new_note || ''}`);
                historyPayload.append('mrc', updateServiceFormData.agreed_price);
                historyPayload.append('nrc', updateServiceFormData.nrc || 0);

                await axios.post(`/api/clients/clients/${servicesClient.id}/update_active_status/`, historyPayload);
                fetchClients(); // Refresh client data to show updated history later

                setIsUpdateServiceModalOpen(false);
                alert("Servicio actualizado correctamente.");
            }
        } catch (error) {
            console.error("Error updating service:", error);
            alert("Error al actualizar el servicio.");
        }
    };

    const handleWorkOrderSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                client_service: editingService.id,
                order_number: workOrderFormData.order_number,
                login: workOrderFormData.login,
                estimated_date: workOrderFormData.estimated_date,
                observations: workOrderFormData.observations
            };

            await axios.post('/api/services/work-orders/', payload);

            fetchClients();
            setIsWorkOrderModalOpen(false);
            setIsUpdateServiceModalOpen(false);
            alert("Orden de Trabajo guardada con éxito y registrada en el historial.");
        } catch (error) {
            console.error("Error saving work order:", error);
            alert("Error al guardar la Orden de Trabajo.");
        }
    };


    const handleActiveStatusSubmit = async (e) => {
        e.preventDefault();

        if (activeStatusFormData.state === 'NEW_SERVICE' && activeStatusFormData.sub_state === 'OFFERED') {
            if (!activeStatusFormData.nrc && !activeStatusFormData.mrc) {
                alert('Al seleccionar el estado "OFERTADO", debes ingresar obligatoriamente al menos el valor de NRC o MRC.');
                return;
            }
        }

        const data = new FormData();
        data.append('status', activeStatusFormData.state);
        if (activeStatusFormData.state === 'NEW_SERVICE') {
            data.append('sub_status', activeStatusFormData.sub_state);
        }
        data.append('reason', activeStatusFormData.reason);
        if (activeStatusFormData.evidence) {
            data.append('evidence', activeStatusFormData.evidence);
        }
        if (activeStatusFormData.custom_date) {
            data.append('custom_date', activeStatusFormData.custom_date);
        }

        // Include financial fields for BACKLOG as well as NEW_SERVICE - OFFERED
        if ((activeStatusFormData.state === 'NEW_SERVICE' && activeStatusFormData.sub_state === 'OFFERED') || activeStatusFormData.state === 'BACKLOG') {
            if (activeStatusFormData.nrc) data.append('nrc', activeStatusFormData.nrc);
            if (activeStatusFormData.mrc) data.append('mrc', activeStatusFormData.mrc);
        }

        try {
            await axios.post(`/api/clients/clients/${activeStatusClient.id}/update_active_status/`, data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // If BACKLOG, we also need to handle the service level update to trigger the Work Order
            if (activeStatusFormData.state === 'BACKLOG') {
                try {
                    // Try to find an existing service for this client or create the primary one
                    const servicesRes = await axios.get(`/api/services/client-services/?client=${activeStatusClient.id}`);
                    let targetService = servicesRes.data.results?.[0] || servicesRes.data?.[0];

                    if (!targetService && activeStatusClient.client_type_new) {
                        // Create service
                        const createRes = await axios.post('/api/services/client-services/', {
                            client: activeStatusClient.id,
                            service: activeStatusClient.client_type_new,
                            agreed_price: activeStatusFormData.mrc || 0,
                            nrc: activeStatusFormData.nrc || 0,
                            start_date: new Date().toISOString().split('T')[0],
                            status: 'BACKLOG',
                            bandwidth: activeStatusFormData.bandwidth,
                            service_location: activeStatusFormData.service_location,
                            notes: activeStatusFormData.reason
                        });
                        targetService = createRes.data;
                    } else if (targetService) {
                        // Update existing service
                        const patchRes = await axios.patch(`/api/services/client-services/${targetService.id}/`, {
                            status: 'BACKLOG',
                            agreed_price: activeStatusFormData.mrc || targetService.agreed_price,
                            nrc: activeStatusFormData.nrc || targetService.nrc,
                            bandwidth: activeStatusFormData.bandwidth || targetService.bandwidth,
                            service_location: activeStatusFormData.service_location || targetService.service_location,
                            notes: `${targetService.notes || ''}\n[${new Date().toLocaleString()}]: Cambio de estado cliente a BACKLOG. ${activeStatusFormData.reason}`
                        });
                        targetService = patchRes.data;
                    }

                    if (targetService) {
                        setEditingService(targetService);

                        const seqRes = await axios.get('/api/services/work-orders/next_sequence/');
                        const { next_order_number, next_login_sequence } = seqRes.data;

                        const clientInitials = activeStatusClient.name
                            .split(' ')
                            .filter(w => w.length > 0)
                            .map(w => w[0])
                            .join('')
                            .toUpperCase();

                        const location = activeStatusFormData.service_location || targetService.service_location || 'SIN_UBICACION';
                        const sName = services.find(s => s.id === targetService.service)?.name || 'SERV';
                        const formattedLogin = `${clientInitials}_${location.replace(/\s+/g, '_')}_${sName.replace(/\s+/g, '_')}_${next_login_sequence}`;

                        setWorkOrderFormData({
                            order_number: `Orden de Instalación #${next_order_number}`,
                            client_name: activeStatusClient.name,
                            service_name: sName,
                            service_location: location,
                            login: formattedLogin,
                            estimated_date: targetService.work_order ? targetService.work_order.estimated_date?.slice(0, 16) : '',
                            observations: targetService.work_order ? targetService.work_order.observations : ''
                        });

                        setIsActiveStatusModalOpen(false);
                        setIsWorkOrderModalOpen(true);
                        fetchClients();
                        return;
                    }
                } catch (err) {
                    console.error("Error triggering WO from client status:", err);
                }
            }

            fetchClients();
            setIsActiveStatusModalOpen(false);
            setActiveStatusClient(null);
            setActiveStatusFormData({
                state: 'BACKLOG',
                sub_state: 'FIRST_MEETING',
                reason: '',
                evidence: null,
                nrc: '',
                mrc: '',
                bandwidth: '',
                service_location: '',
                custom_date: new Date().toISOString().slice(0, 16)
            });
            alert('¡Estado de cliente actualizado!');
        } catch (error) {
            console.error('Error updating active status:', error);
            alert('Error al actualizar el estado.');
        }
    };

    const handleImportSubmit = async (e) => {
        e.preventDefault();
        if (!importFile) {
            alert("Por favor selecciona un archivo CSV.");
            return;
        }

        const importFormData = new FormData();
        importFormData.append('file', importFile);

        try {
            const response = await axios.post('/api/clients/import/', importFormData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            fetchClients();
            setIsImportModalOpen(false);
            setImportFile(null);
            alert(`¡Importación exitosa!\nClientes procesados/creados: ${response.data.clients_imported}\nServicios migrados: ${response.data.services_imported}`);
        } catch (error) {
            console.error('Error importing clients:', error);
            const errorMsg = error.response?.data?.error ? error.response.data.error : error.message;
            alert(`Error durante la importación: ${errorMsg}`);
        }
    };

    const getClientIcon = (type) => {
        switch (type) {
            case 'HOUSING': return <Building2 className="w-5 h-5 text-blue-500" />;
            case 'TELECOM': return <Smartphone className="w-5 h-5 text-emerald-500" />;
            case 'APP_DEV': return <MonitorSmartphone className="w-5 h-5 text-purple-500" />;
            default: return <Building2 className="w-5 h-5 text-slate-500" />;
        }
    };

    const getStatusBadge = (status) => {
        const isActivo = status === 'Activo';
        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isActivo ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                {status}
            </span>
        );
    };

    const getDetailedStatusBadge = (status, classification) => {
        const bgColors = {
            'PROSPECTING': 'bg-blue-100 text-blue-800',
            'CONTACTED': 'bg-indigo-100 text-indigo-800',
            'FIRST_MEETING': 'bg-purple-100 text-purple-800',
            'OFFERED': 'bg-yellow-100 text-yellow-800',
            'FOLLOW_UP': 'bg-orange-100 text-orange-800',
            'CLOSING_MEETING': 'bg-pink-100 text-pink-800',
            'DEMO': 'bg-cyan-100 text-cyan-800',
            'CONTRACT_SIGNED': 'bg-emerald-100 text-emerald-800',
            'BACKLOG': 'bg-emerald-100 text-emerald-800',
            'INSTALLED': 'bg-emerald-100 text-emerald-800',
            'BILLED': 'bg-green-100 text-green-800',
            'NEW_SERVICE': 'bg-blue-50 text-blue-700',
            'DOWN_GRADE': 'bg-amber-100 text-amber-800',
            'UP_GRADE': 'bg-violet-100 text-violet-800',
            'LOST': 'bg-red-100 text-red-800',
        };

        const colorClass = bgColors[status] || (classification === 'PROSPECT' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800');
        const defaultLabel = classification === 'PROSPECT' ? 'PROSPECTO' : 'ACTIVO';
        const labelText = translateStatus(status) || defaultLabel;

        return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border border-current/20 uppercase ${colorClass}`}>
                {labelText}
            </span>
        );
    };

    // Extraer valores únicos para los dropdowns de filtros
    const uniqueRegions = [...new Set(clients.map(c => c.region).filter(Boolean))];
    const uniqueSegments = [...new Set(clients.map(c => c.segment).filter(Boolean))];
    const uniqueServiceLocations = [...new Set(clients.map(c => c.service_location).filter(Boolean))];
    const uniqueManagers = [...new Set(clients.map(c => c.account_manager_name).filter(Boolean))];

    const filteredClients = clients.filter(client => {
        const matchSearch = String(client.name || '').toLowerCase().includes(filters.search.toLowerCase()) ||
            String(client.legal_name || '').toLowerCase().includes(filters.search.toLowerCase()) ||
            String(client.email || '').toLowerCase().includes(filters.search.toLowerCase()) ||
            String(client.tax_id || '').includes(filters.search);

        const matchType = filters.type === '' || client.type === filters.type;
        const matchStatus = filters.status === '' || client.status === filters.status;
        const matchRegion = filters.region === '' || client.region === filters.region;
        const matchSegment = filters.segment === '' || client.segment === filters.segment;
        const matchServiceLocation = filters.service_location === '' || client.service_location === filters.service_location;
        const matchManager = filters.account_manager === '' || client.account_manager_name === filters.account_manager;

        return matchSearch && matchType && matchStatus && matchRegion && matchSegment && matchServiceLocation && matchManager;
    });

    const FormFields = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2 bg-slate-50 p-4 rounded-lg border border-slate-200 shadow-sm">
                <label className="block text-sm font-bold leading-6 text-slate-900 mb-2">Clasificación del Cliente <span className="text-red-500">*</span></label>
                <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="classification" value="PROSPECT" checked={formData.classification === 'PROSPECT'} onChange={handleInputChange} className="w-4 h-4 text-primary-600 border-slate-300 focus:ring-primary-500" />
                        <span className="text-sm font-medium text-slate-700">Prospecto</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="classification" value="ACTIVE" checked={formData.classification === 'ACTIVE'} onChange={handleInputChange} className="w-4 h-4 text-primary-600 border-slate-300 focus:ring-primary-500" />
                        <span className="text-sm font-medium text-slate-700">Cliente Activo</span>
                    </label>
                </div>
            </div>

            <div className="space-y-4 md:col-span-2 mt-2">
                <h4 className="text-sm font-semibold text-slate-900 border-b border-slate-200 pb-2">Información Fiscal</h4>
            </div>

            <div>
                <label className="block text-sm font-medium leading-6 text-slate-900">Documento <span className="text-red-500">*</span></label>
                <div className="mt-1 flex gap-2">
                    <select name="tax_id_type" value={formData.tax_id_type} onChange={handleInputChange} className="input-field bg-white w-1/3">
                        <option value="RUC">RUC</option>
                        <option value="CEDULA">Cédula</option>
                        <option value="OTRO">Otro</option>
                    </select>
                    <input type="text" name="tax_id" required value={formData.tax_id} onChange={handleInputChange} className="input-field w-2/3" placeholder="ID" />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium leading-6 text-slate-900">Servicio <span className="text-red-500">*</span></label>
                <div className="mt-1">
                    <select name="client_type_new" value={formData.client_type_new} onChange={handleInputChange} className="input-field bg-white">
                        <option value="">Seleccione un Servicio...</option>
                        {services.map(s => (
                            <option key={s.id} value={s.id}>
                                {s.internal_code ? `[${s.internal_code}] ` : ''}{s.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="md:col-span-2">
                <label className="block text-sm font-medium leading-6 text-slate-900">Razón Social <span className="text-red-500">*</span></label>
                <input type="text" name="legal_name" required value={formData.legal_name} onChange={handleInputChange} className="mt-1 input-field" placeholder="Nombre legal de la compañía" />
            </div>

            <div className="md:col-span-2">
                <label className="block text-sm font-medium leading-6 text-slate-900">Nombre Comercial</label>
                <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="mt-1 input-field" placeholder="Nombre con el que se le conoce" />
            </div>

            <div className="space-y-4 md:col-span-2 mt-2">
                <h4 className="text-sm font-semibold text-slate-900 border-b border-slate-200 pb-2">Datos del Servicio</h4>
            </div>

            <div>
                <label className="block text-sm font-medium leading-6 text-slate-900">Región</label>
                <select name="region" value={formData.region} onChange={handleInputChange} className="mt-1 input-field bg-white">
                    <option value="">-- Seleccionar --</option>
                    <option value="R1">R1</option>
                    <option value="R2">R2</option>
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium leading-6 text-slate-900">Ciudad</label>
                <select name="city" value={formData.city} onChange={handleInputChange} className="mt-1 input-field bg-white">
                    <option value="">-- Seleccionar --</option>
                    <option value="QUITO">QUITO</option>
                    <option value="CUENCA">CUENCA</option>
                    <option value="MANTA">MANTA</option>
                    <option value="AMBATO">AMBATO</option>
                    <option value="MACHALA">MACHALA</option>
                    <option value="SANTO DOMINGO">SANTO DOMINGO</option>
                    <option value="ESMERALDAS">ESMERALDAS</option>
                    <option value="TULCAN">TULCAN</option>
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium leading-6 text-slate-900">Segmento</label>
                <select name="segment" value={formData.segment} onChange={handleInputChange} className="mt-1 input-field bg-white">
                    <option value="">-- Seleccionar --</option>
                    <option value="GOBIERNO">GOBIERNO</option>
                    <option value="COMERCIO">COMERCIO</option>
                    <option value="AGRICULTURA">AGRICULTURA</option>
                    <option value="GANADERÍA Y PESCA">GANADERÍA Y PESCA</option>
                    <option value="CONSTRUCCIÓN">CONSTRUCCIÓN</option>
                    <option value="INDUSTRIA">INDUSTRIA</option>
                    <option value="PETRÓLEO Y MINERÍA">PETRÓLEO Y MINERÍA</option>
                    <option value="SEGURIDAD">SEGURIDAD</option>
                    <option value="SECTOR FINANCIERO">SECTOR FINANCIERO</option>
                    <option value="SERVICIOS">SERVICIOS</option>
                    <option value="TRANSPORTE Y LOGÍSTICA">TRANSPORTE Y LOGÍSTICA</option>
                    <option value="TURISMO Y ALIMENTACIÓN">TURISMO Y ALIMENTACIÓN</option>
                    <option value="EDUCACIÓN">EDUCACIÓN</option>
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium leading-6 text-slate-900">Ubicación del Servicio</label>
                <input type="text" name="service_location" value={formData.service_location} onChange={handleInputChange} className="mt-1 input-field" placeholder="Ej. Planta Sur, Oficina Central" />
            </div>

            <div>
                <label className="block text-sm font-medium leading-6 text-slate-900">Gerente de Cuenta</label>
                <select name="account_manager" value={formData.account_manager} onChange={handleInputChange} className="mt-1 input-field bg-white">
                    <option value="">Seleccione un Gerente...</option>
                    {accountManagers.map(mgr => (
                        <option key={mgr.id} value={mgr.id}>{mgr.full_name}</option>
                    ))}
                    {!accountManagers.find(m => String(m.id) === String(formData.account_manager)) && formData.account_manager && (
                        <option value={formData.account_manager}>ID #{formData.account_manager}</option>
                    )}
                </select>
            </div>

            <div className="col-span-1 md:col-span-2 flex items-center gap-2 mt-2">
                <input type="checkbox" id="is_active" name="is_active" checked={formData.is_active} onChange={handleInputChange} className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500" />
                {/* v2 */}<label htmlFor="is_active" className="text-sm font-medium text-slate-900">Cuenta Activa</label>
            </div>

            <div className="space-y-4 md:col-span-2 mt-2">
                <h4 className="text-sm font-semibold text-slate-900 border-b border-slate-200 pb-2">Contacto Básico</h4>
            </div>

            <div>
                <label className="block text-sm font-medium leading-6 text-slate-900">Correo Electrónico <span className="text-red-500">*</span></label>
                <input type="email" name="email" required value={formData.email} onChange={handleInputChange} className="mt-1 input-field" placeholder="contacto@empresa.com" />
            </div>

            <div>
                <label className="block text-sm font-medium leading-6 text-slate-900">Teléfonos</label>
                <input type="text" name="phone" value={formData.phone} onChange={handleInputChange} className="mt-1 input-field" placeholder="Varios números separados por coma" />
            </div>

            <div className="md:col-span-2">
                <label className="block text-sm font-medium leading-6 text-slate-900">Dirección Física</label>
                <input type="text" name="address" value={formData.address} onChange={handleInputChange} className="mt-1 input-field" placeholder="Dirección completa" />
            </div>
        </div>
    );

    return (
        <div className="animate-fade-in">
            <div className="sm:flex sm:items-center sm:justify-between mb-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-slate-900">Directorio de Clientes</h1>
                    <p className="mt-2 text-sm text-slate-600">Gestiona toda la cartera de clientes de DATACOM S.A.</p>
                </div>
                <div className="mt-4 sm:mt-0 flex items-center gap-3 flex-wrap">
                    <div className="flex flex-wrap items-center gap-3">
                        <label className="text-xs font-semibold text-slate-500">Mes</label>
                        <select
                            className="input-field bg-white text-sm py-2"
                            value={reportMes}
                            onChange={(e) => setReportMes(Number(e.target.value))}
                        >
                            {MONTH_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <label className="text-xs font-semibold text-slate-500">Año</label>
                        <select
                            className="input-field bg-white text-sm py-2"
                            value={reportAnio}
                            onChange={(e) => setReportAnio(Number(e.target.value))}
                        >
                            {YEAR_OPTIONS.map(option => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>
                    </div>
                    <button
                        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
                        onClick={downloadExcelReport}
                        title="Descargar reporte Excel del período seleccionado"
                    >
                        <FileDown className="w-4 h-4" />
                        <span>Descargar Excel</span>
                    </button>
                    <button
                        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                        onClick={downloadPdfReport}
                        title="Descargar reporte PDF del período seleccionado"
                    >
                        <FileText className="w-4 h-4" />
                        <span>Descargar PDF</span>
                    </button>
                    <button
                        className="btn-outline flex items-center gap-2"
                        onClick={() => setIsImportModalOpen(true)}
                    >
                        <Upload className="w-4 h-4" />
                        <span>Migrar Excel/CSV</span>
                    </button>
                    <button
                        className="btn-primary flex items-center gap-2"
                        onClick={() => {
                            setFormData(initialFormState);
                            setIsModalOpen(true);
                        }}
                    >
                        <Plus className="w-4 h-4" />
                        <span>Nuevo Cliente</span>
                    </button>
                </div>
            </div>

            <div className="card mb-6">
                {/* Filtros Avanzados Bar */}
                <div className="p-4 border-b border-slate-200 bg-slate-50/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
                        <div className="lg:col-span-2">
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Buscar (Nombre, Correo, RUC)</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Search className="h-4 w-4 text-slate-400" />
                                </div>
                                <input
                                    type="text"
                                    name="search"
                                    list="client-suggestions"
                                    className="input-field pl-9 text-sm py-2"
                                    placeholder="Buscar clientes..."
                                    value={filters.search}
                                    onChange={handleFilterChange}
                                />
                                <datalist id="client-suggestions">
                                    {[...new Set(clients.map(c => c.name).filter(Boolean))].sort().map((name, idx) => (
                                        <option key={idx} value={name} />
                                    ))}
                                </datalist>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Servicio</label>
                            <select name="type" value={filters.type} onChange={handleFilterChange} className="input-field bg-white text-sm py-2 px-3">
                                <option value="">Todos</option>
                                {services.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.internal_code ? `[${s.internal_code}] ` : ''}{s.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Estado</label>
                            <select name="status" value={filters.status} onChange={handleFilterChange} className="input-field bg-white text-sm py-2 px-3">
                                <option value="">Todos</option>
                                <option value="Activo">Activos</option>
                                <option value="Inactivo">Inactivos</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Segmento</label>
                            <select name="segment" value={filters.segment} onChange={handleFilterChange} className="input-field bg-white text-sm py-2 px-3">
                                <option value="">Todos</option>
                                {uniqueSegments.map(seg => <option key={seg} value={seg}>{seg}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Gerente de Cuenta</label>
                            <select name="account_manager" value={filters.account_manager} onChange={handleFilterChange} className="input-field bg-white text-sm py-2 px-3">
                                <option value="">Todos</option>
                                {uniqueManagers.map(mgr => <option key={mgr} value={mgr}>{mgr}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">CLIENTE</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">SERVICIO & ESTADO</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">DETALLES OPERATIVOS</th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">SERVICIOS TOTALES</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">TOTAL MENSUAL (MRC)</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">TOTAL UNICO (NRC)</th>
                                <th scope="col" className="relative px-6 py-3 tracking-wider"><span className="sr-only">Acciones</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {filteredClients.map((client) => (
                                <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-lg bg-slate-100 border border-slate-200">
                                                {/* Use a generic icon for now or map based on some property */}
                                                <Building2 className="w-5 h-5 text-blue-500" />
                                            </div>
                                            <div className="ml-4">
                                                <div
                                                    className="text-sm font-bold text-slate-900 cursor-pointer hover:text-indigo-600 transition-colors"
                                                    onClick={() => {
                                                        setServicesClient(client);
                                                        fetchClientServices(client.id);
                                                        setIsSummaryModalOpen(true);
                                                    }}
                                                    title="Ver Resumen de Servicios"
                                                >{client.name}</div>
                                                <div className="text-xs text-slate-500">{client.legal_name || client.tax_id}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="space-y-3">
                                            {client.assigned_services && client.assigned_services.length > 0 ? (
                                                client.assigned_services.length === 1 ? (
                                                    <div>
                                                        <div className="text-sm font-bold text-slate-900 mb-1">{client.assigned_services[0].service_name}</div>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <div className="text-sm font-bold text-slate-900 mb-1">{client.assigned_services[0].service_name}</div>
                                                        <button
                                                            onClick={() => {
                                                                setServicesClient(client);
                                                                fetchClientServices(client.id);
                                                                setIsSummaryModalOpen(true);
                                                            }}
                                                            className="text-[11px] font-extrabold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 group transition-all"
                                                        >
                                                            <span>VER TODOS LOS SERVICIOS ({client.assigned_services.length})</span>
                                                            <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                )
                                            ) : (
                                                <div className="text-sm font-bold text-slate-900 mb-1">
                                                    {services.find(s => s.id === client.client_type_new)?.name || 'S/N'}
                                                </div>
                                            )}
                                            <div className="flex flex-col gap-1 items-start mt-1">
                                                <div className="flex gap-1">
                                                    {(() => {
                                                        const history = client.status_history;
                                                        if (history && history.length > 0) {
                                                            const lastStatus = history[history.length - 1].status;
                                                            return getDetailedStatusBadge(lastStatus, client.classification);
                                                        }
                                                        return client.classification === 'PROSPECT'
                                                            ? getDetailedStatusBadge(client.prospect_status, 'PROSPECT')
                                                            : getDetailedStatusBadge(client.active_status, 'ACTIVE');
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-slate-900"><span className="font-semibold text-slate-500">G:</span> {formatManagerName(client.account_manager_name)}</div>
                                        <div className="text-xs text-slate-500 mt-1">{client.region} {client.region && client.city ? '-' : ''} {client.city}</div>
                                        <div className="text-xs text-slate-500">{client.segment}{client.service_location && ` | ${client.service_location}`}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <div className="text-lg font-black text-slate-900">{client.total_services_count}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <div className="text-sm font-bold text-emerald-600">${Number(client.total_mrc || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <div className="text-sm font-bold text-blue-600">${Number(client.total_nrc || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end gap-3">
                                            {client.classification === 'PROSPECT' && (
                                                <>
                                                    <button
                                                        onClick={() => {
                                                            const now = new Date();
                                                            const localDateTime = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
                                                            setStatusClient(client);
                                                            setStatusFormData(prev => ({ ...prev, custom_date: localDateTime }));
                                                            setIsStatusModalOpen(true);
                                                        }}
                                                        className="text-amber-500 hover:text-amber-600 transition-colors"
                                                        title="Gestionar Estado de Prospecto"
                                                    >
                                                        <ClipboardList className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setHistoryClient(client);
                                                            setIsHistoryModalOpen(true);
                                                        }}
                                                        className="text-indigo-500 hover:text-indigo-600 transition-colors"
                                                        title="Ver Historial de Prospecto"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                                        </svg>
                                                    </button>
                                                </>
                                            )}
                                            {client.classification === 'ACTIVE' && (
                                                <>
                                                    <button
                                                        onClick={() => {
                                                            const now = new Date();
                                                            const localDateTime = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
                                                            setActiveStatusClient(client);
                                                            setActiveStatusFormData(prev => ({ ...prev, custom_date: localDateTime }));
                                                            setIsActiveStatusModalOpen(true);
                                                        }}
                                                        className="text-blue-500 hover:text-blue-600 transition-colors"
                                                        title="Gestionar Estado de Activo"
                                                    >
                                                        <ClipboardList className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setHistoryClient(client);
                                                            setIsHistoryModalOpen(true);
                                                        }}
                                                        className="text-indigo-500 hover:text-indigo-600 transition-colors"
                                                        title="Ver Historial del Cliente"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                                        </svg>
                                                    </button>
                                                </>
                                            )}
                                            <button
                                                onClick={() => {
                                                    setServicesClient(client);
                                                    fetchClientServices(client.id);
                                                    setIsServicesModalOpen(true);
                                                }}
                                                className="text-indigo-600 hover:text-indigo-700 transition-colors"
                                                title="Gestionar Servicios"
                                            >
                                                <Server className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setServicesClient(client);
                                                    fetchClientServices(client.id);
                                                    setIsSummaryModalOpen(true);
                                                }}
                                                className="text-emerald-600 hover:text-emerald-700 transition-colors"
                                                title="Ver Resumen de Servicios"
                                            >
                                                <FileText className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => openEditModal(client)}
                                                className="text-slate-400 hover:text-blue-500 transition-colors"
                                                title="Editar Cliente"
                                            >
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(client.id)}
                                                className="text-slate-400 hover:text-red-500 transition-colors"
                                                title="Eliminar Cliente"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredClients.length === 0 && (
                                <tr>
                                    <td colSpan="7" className="px-6 py-8 text-center text-sm text-slate-500">
                                        No se encontraron clientes que coincidan con los filtros.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-slate-200 sm:px-6">
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm text-slate-700">
                                Mostrando <span className="font-medium">{filteredClients.length > 0 ? 1 : 0}</span> a <span className="font-medium">{filteredClients.length}</span> de <span className="font-medium">{filteredClients.length}</span> resultados filtrados
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal de Nuevo Cliente */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"></div>

                    <div className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-y-auto max-h-[90vh] animate-slide-up">
                        <div className="sticky top-0 z-10 px-6 py-4 border-b border-slate-200 bg-white flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-900">Registrar Nuevo Cliente</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <span className="sr-only">Cerrar</span>
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6">
                            {FormFields()}

                            <div className="mt-8 flex items-center justify-end gap-x-4 border-t border-slate-100 pt-6">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="text-sm font-semibold leading-6 text-slate-900 hover:text-slate-700">
                                    Cancelar
                                </button>
                                <button type="submit" className="btn-primary space-x-2">
                                    <Plus className="w-4 h-4 inline" />
                                    <span>Registrar Cliente</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Editar Cliente */}
            {isEditModalOpen && editingClient && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"></div>

                    <div className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-y-auto max-h-[90vh] animate-slide-up">
                        <div className="sticky top-0 z-10 px-6 py-4 border-b border-slate-200 bg-white flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-900">Actualizar Expediente del Cliente</h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <span className="sr-only">Cerrar</span>
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleEditSubmit} className="p-6">
                            {FormFields()}

                            <div className="mt-8 flex items-center justify-end gap-x-4 border-t border-slate-100 pt-6">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="text-sm font-semibold leading-6 text-slate-900 hover:text-slate-700">
                                    Cancelar
                                </button>
                                <button type="submit" className="btn-primary space-x-2 text-white bg-blue-600 hover:bg-blue-700">
                                    <svg className="w-4 h-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span>Guardar Cambios</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Importación CSV */}
            {isImportModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"></div>

                    <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-slide-up">
                        <div className="px-6 py-5 border-b border-slate-200 bg-white flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-100">
                                    <FileText className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900">Migrar Base de Datos Actual (CSV)</h3>
                                    <p className="text-sm text-slate-500">Sube un archivo de Excel (.xlsx) o CSV y revisa la carga antes de confirmar</p>
                                </div>
                            </div>
                            <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <span className="sr-only">Cerrar</span>
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleImportSubmit} className="p-6">
                            <div className="mb-6">
                                <div className="relative group">
                                    <div className="flex justify-center rounded-xl border-2 border-dashed border-slate-200 px-6 py-10 group-hover:border-blue-400 transition-all bg-slate-50/50 group-hover:bg-blue-50/30">
                                        <div className="text-center">
                                            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4 border border-blue-100">
                                                <Upload className="h-6 w-6 text-blue-500" />
                                            </div>
                                            <div className="flex text-sm leading-6 text-slate-600 justify-center">
                                                <label htmlFor="file-upload" className="relative cursor-pointer font-bold text-blue-600 focus-within:outline-none hover:text-blue-700">
                                                    <span>Arrastra tu archivo aquí</span>
                                                    <span className="font-normal text-slate-500 ml-1">o haz clic para seleccionar</span>
                                                    <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".csv,.xlsx,.xls" onChange={(e) => setImportFile(e.target.files[0])} />
                                                </label>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-2">
                                                Formatos aceptados: .xlsx · .xls · .csv
                                            </p>
                                            {importFile && (
                                                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-sm font-medium animate-pulse">
                                                    <FileText className="w-4 h-4" />
                                                    {importFile.name}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50/80 rounded-xl p-5 border border-slate-100 mb-6">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Columnas del archivo:</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[11px] font-bold text-slate-700 shadow-sm">CLIENTE *</span>
                                        <span className="text-[11px] text-slate-500">Nombre o razón social (requerido)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[11px] font-bold text-slate-700 shadow-sm">CEDULA/RUC *</span>
                                        <span className="text-[11px] text-slate-500">Identificación fiscal</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[11px] font-bold text-slate-700 shadow-sm">ESTADO *</span>
                                        <span className="text-[11px] text-slate-500">Activo, Inactivo, Prospecto</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[11px] font-bold text-slate-700 shadow-sm">GERENTE DE CUENTA</span>
                                        <span className="text-[11px] text-slate-500">Nombre del responsable</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[11px] font-bold text-slate-700 shadow-sm">REGION / CIUDAD</span>
                                        <span className="text-[11px] text-slate-500">Ubicación geográfica</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[11px] font-bold text-slate-700 shadow-sm">SEGMENTO</span>
                                        <span className="text-[11px] text-slate-500">Estratificación comercial</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[11px] font-bold text-slate-700 shadow-sm">MRC / NRC</span>
                                        <span className="text-[11px] text-slate-500">Valores financieros</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[11px] font-bold text-slate-700 shadow-sm">SERVICIO</span>
                                        <span className="text-[11px] text-slate-500">Nombre del producto</span>
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-4 italic">
                                    Las columnas <strong>EMAIL, TELEFONO</strong> y <strong>DIRECCION</strong> también serán importadas si existen.
                                </p>
                            </div>

                            <div className="flex items-center justify-between pt-2">
                                <button
                                    type="button"
                                    onClick={() => {/* Lógica para descargar plantilla */}}
                                    className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm font-medium transition-colors"
                                >
                                    <Download className="w-4 h-4" />
                                    <span>Descargar plantilla</span>
                                </button>

                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsImportModalOpen(false)}
                                        className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                                            importFile
                                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700'
                                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                        }`}
                                        disabled={!importFile}
                                    >
                                        <Upload className="w-4 h-4" />
                                        <span>Iniciar Migración</span>
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Estado de Prospecto */}
            {isStatusModalOpen && statusClient && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"></div>

                    <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-slide-up">
                        <div className="px-6 py-4 border-b border-slate-200 bg-amber-50 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-amber-900">Actualizar Estado: {statusClient.name}</h3>
                            <button onClick={() => setIsStatusModalOpen(false)} className="text-amber-400 hover:text-amber-600">
                                <span className="sr-only">Cerrar</span>
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleStatusSubmit} className="p-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium leading-6 text-slate-900">Fecha y Hora de la Acción <span className="text-red-500">*</span></label>
                                    <input type="datetime-local" name="custom_date" value={statusFormData.custom_date} onChange={handleStatusFormChange} required className="mt-1 input-field" />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium leading-6 text-slate-900">Nuevo Estado de Prospecto <span className="text-red-500">*</span></label>
                                    <select name="state" value={statusFormData.state} onChange={handleStatusFormChange} required className="mt-1 input-field bg-white">
                                        <option value="FIRST_MEETING">Primera Cita</option>
                                        <option value="CONTACTED">Contactado</option>
                                        <option value="OFFERED">Ofertado</option>
                                        <option value="FOLLOW_UP">Seguimiento</option>
                                        <option value="CLOSING_MEETING">Cita Cierre</option>
                                        <option value="ADJUDICATED">Adjudicado</option>
                                        <option value="TDR_ELABORATION">Elaboración de TDR</option>
                                        <option value="CONTRACT_SIGNED">Firma de Contrato</option>
                                        <option value="LOST_DEAL">Negocio Perdido</option>
                                    </select>
                                </div>

                                {statusFormData.state === 'OFFERED' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                                        <div className="md:col-span-2">
                                            <p className="text-xs font-semibold text-blue-800 mb-2">Ingresa al menos uno de los valores financieros para la oferta:</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium leading-6 text-slate-900">NRC ($)</label>
                                            <input type="number" step="0.01" min="0" name="nrc" value={statusFormData.nrc} onChange={handleStatusFormChange} className="mt-1 input-field" placeholder="0.00" />
                                            <p className="text-[10px] text-slate-500 mt-1">Non Recurring Charge</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium leading-6 text-slate-900">MRC ($)</label>
                                            <input type="number" step="0.01" min="0" name="mrc" value={statusFormData.mrc} onChange={handleStatusFormChange} className="mt-1 input-field" placeholder="0.00" />
                                            <p className="text-[10px] text-slate-500 mt-1">Monthly Recurring Charge</p>
                                        </div>
                                        {statusFormData.mrc && (
                                            <div className="md:col-span-2 mt-2 p-3 bg-white border border-slate-200 rounded text-center">
                                                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Valor Anual Proyectado (MRC x 12):</span>
                                                <div className="text-lg font-bold text-emerald-600 mt-1">
                                                    ${(parseFloat(statusFormData.mrc) * 12).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium leading-6 text-slate-900">Razón / Comentarios <span className="text-red-500">*</span></label>
                                    <textarea name="reason" value={statusFormData.reason} onChange={handleStatusFormChange} required rows="3" className="mt-1 input-field" placeholder="Describe la razón de este cambio de estado..."></textarea>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium leading-6 text-slate-900">Evidencia (Opcional)</label>
                                    <input type="file" name="evidence" onChange={handleStatusFormChange} className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100" />
                                </div>
                            </div>

                            <div className="mt-8 flex items-center justify-end gap-x-4 border-t border-slate-100 pt-6">
                                <button type="button" onClick={() => setIsStatusModalOpen(false)} className="text-sm font-semibold leading-6 text-slate-900 hover:text-slate-700">
                                    Cancelar
                                </button>
                                <button type="submit" className="btn-primary bg-amber-600 hover:bg-amber-700 text-white">
                                    Guardar Estado
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Historial de Prospecto */}
            {isHistoryModalOpen && historyClient && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"></div>

                    <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-y-auto max-h-[90vh] animate-slide-up">
                        <div className="sticky top-0 z-10 px-6 py-4 border-b border-slate-200 bg-indigo-50 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-indigo-900">Historial de Estados: {historyClient.name}</h3>
                            <button onClick={() => setIsHistoryModalOpen(false)} className="text-indigo-400 hover:text-indigo-600">
                                <span className="sr-only">Cerrar</span>
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-6">
                            {historyClient.status_history && historyClient.status_history.length > 0 ? (
                                <div className="space-y-6">
                                    {historyClient.status_history.map((record, index) => (
                                        <div key={index} className="relative pl-6 pb-6 border-l-2 border-indigo-200 last:border-0 last:pb-0">
                                            <div className="absolute w-3 h-3 bg-indigo-500 rounded-full -left-[7px] top-1 ring-4 ring-white"></div>
                                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 shadow-sm">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">
                                                        {translateStatus(record.status)}
                                                    </span>
                                                    <div className="text-right">
                                                        <div className="text-xs font-semibold text-slate-800" title="Fecha Registrada (Custom)">
                                                            Ocurrido: {new Date(record.custom_date || record.created_at).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 mt-0.5" title="Fecha del Sistema (Creación)">
                                                            Registrado: {new Date(record.created_at).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                                                        </div>
                                                    </div>
                                                </div>

                                                <p className="text-sm text-slate-700 mt-2">{record.reason}</p>

                                                {(record.nrc || record.mrc) && (
                                                    <div className="mt-3 pt-3 border-t border-slate-200 flex flex-wrap gap-4">
                                                        {record.nrc && <span className="text-xs font-medium bg-emerald-50 text-emerald-700 px-2 py-1 rounded">NRC: ${record.nrc}</span>}
                                                        {record.mrc && <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-1 rounded">MRC: ${record.mrc}</span>}
                                                        {record.mrc && <span className="text-xs font-medium bg-purple-50 text-purple-700 px-2 py-1 rounded">Anual: ${(parseFloat(record.mrc) * 12).toFixed(2)}</span>}
                                                    </div>
                                                )}

                                                {record.evidence && (
                                                    <div className="mt-3">
                                                        <a href={record.evidence} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium">
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                                                            </svg>
                                                            Ver Evidencia Adjunta
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-slate-500">No hay historial de estados registrado para este cliente.</p>
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
                            <button onClick={() => setIsHistoryModalOpen(false)} className="btn-primary">
                                Cerrar Historial
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Estado de Cliente Activo */}
            {isActiveStatusModalOpen && activeStatusClient && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"></div>

                    <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-slide-up">
                        <div className="px-6 py-4 border-b border-slate-200 bg-blue-50 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-blue-900">Actualizar Estado: {activeStatusClient.name}</h3>
                            <button onClick={() => setIsActiveStatusModalOpen(false)} className="text-blue-400 hover:text-blue-600">
                                <span className="sr-only">Cerrar</span>
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleActiveStatusSubmit} className="p-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium leading-6 text-slate-900">Fecha y Hora de la Acción <span className="text-red-500">*</span></label>
                                    <input type="datetime-local" name="custom_date" value={activeStatusFormData.custom_date} onChange={handleActiveStatusFormChange} required className="mt-1 input-field" />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium leading-6 text-slate-900">Estado de Cliente Activo <span className="text-red-500">*</span></label>
                                    <select name="state" value={activeStatusFormData.state} onChange={handleActiveStatusFormChange} required className="mt-1 input-field bg-white">
                                        <option value="PROSPECTING">Prospección</option>
                                        <option value="CONTACTED">Contactado</option>
                                        <option value="FIRST_MEETING">Primera Cita</option>
                                        <option value="OFFERED">Ofertado</option>
                                        <option value="FOLLOW_UP">Seguimiento</option>
                                        <option value="CLOSING_MEETING">Cita de Cierre</option>
                                        <option value="DEMO">Demo</option>
                                        <option value="CONTRACT_SIGNED">Firma de Contrato</option>
                                        <option value="BACKLOG">Backlog</option>
                                        <option value="INSTALLED">Instalado</option>
                                        <option value="BILLED">Facturado</option>
                                        <option value="NEW_SERVICE">Servicio Nuevo</option>
                                        <option value="DOWN_GRADE">Down Grade</option>
                                        <option value="UP_GRADE">Up Grade</option>
                                        <option value="LOST">Negocio Perdido</option>
                                    </select>
                                </div>

                                {activeStatusFormData.state === 'BACKLOG' && (
                                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium leading-6 text-slate-900">MRC ($) *</label>
                                                <input type="number" step="0.01" min="0" name="mrc" value={activeStatusFormData.mrc || ''} onChange={handleActiveStatusFormChange} className="mt-1 input-field border-blue-200" placeholder="0.00" required />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium leading-6 text-slate-900">NRC ($)</label>
                                                <input type="number" step="0.01" min="0" name="nrc" value={activeStatusFormData.nrc || ''} onChange={handleActiveStatusFormChange} className="mt-1 input-field border-blue-200" placeholder="0.00" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium leading-6 text-slate-900">Velocidad (Mbps)</label>
                                                <input type="text" name="bandwidth" value={activeStatusFormData.bandwidth || ''} onChange={handleActiveStatusFormChange} className="mt-1 input-field border-blue-200" placeholder="e.g. 100" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium leading-6 text-slate-900">Ubicación</label>
                                                <input type="text" name="service_location" value={activeStatusFormData.service_location || ''} onChange={handleActiveStatusFormChange} className="mt-1 input-field border-blue-200" placeholder="Ubicación del servicio..." />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeStatusFormData.state === 'NEW_SERVICE' && (
                                    <div className="p-4 bg-orange-50 border border-orange-100 rounded-lg space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium leading-6 text-slate-900">Sub-Estado del Servicio Nuevo <span className="text-red-500">*</span></label>
                                            <select name="sub_state" value={activeStatusFormData.sub_state} onChange={handleActiveStatusFormChange} required className="mt-1 input-field bg-white border-orange-200 focus:ring-orange-500 focus:border-orange-500">
                                                <option value="FIRST_MEETING">Primera Cita</option>
                                                <option value="CONTACTED">Contactado</option>
                                                <option value="OFFERED">Ofertado</option>
                                                <option value="FOLLOW_UP">Seguimiento</option>
                                                <option value="CLOSING_MEETING">Cita Cierre</option>
                                                <option value="ADJUDICATED">Adjudicado</option>
                                                <option value="TDR_ELABORATION">Elaboración de TDR</option>
                                                <option value="CONTRACT_SIGNED">Firma de Contrato</option>
                                                <option value="LOST_DEAL">Negocio Perdido</option>
                                            </select>
                                        </div>

                                        {activeStatusFormData.sub_state === 'OFFERED' && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="md:col-span-2">
                                                    <p className="text-xs font-semibold text-orange-800 mb-1">Ingresa al menos uno de los valores financieros para la oferta:</p>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium leading-6 text-slate-900">NRC ($)</label>
                                                    <input type="number" step="0.01" min="0" name="nrc" value={activeStatusFormData.nrc || ''} onChange={handleActiveStatusFormChange} className="mt-1 input-field border-orange-200" placeholder="0.00" />
                                                    <p className="text-[10px] text-slate-500 mt-1">Non Recurring Charge</p>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium leading-6 text-slate-900">MRC ($)</label>
                                                    <input type="number" step="0.01" min="0" name="mrc" value={activeStatusFormData.mrc || ''} onChange={handleActiveStatusFormChange} className="mt-1 input-field border-orange-200" placeholder="0.00" />
                                                    <p className="text-[10px] text-slate-500 mt-1">Monthly Recurring Charge</p>
                                                </div>
                                                {activeStatusFormData.mrc && (
                                                    <div className="md:col-span-2 mt-2 p-3 bg-white border border-orange-200 rounded text-center">
                                                        <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Valor Anual Proyectado (MRC x 12):</span>
                                                        <div className="text-lg font-bold text-emerald-600 mt-1">
                                                            ${(parseFloat(activeStatusFormData.mrc) * 12).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium leading-6 text-slate-900">Razón / Comentarios <span className="text-red-500">*</span></label>
                                    <textarea name="reason" value={activeStatusFormData.reason} onChange={handleActiveStatusFormChange} required rows="3" className="mt-1 input-field" placeholder="Describe la razón de este cambio de estado..."></textarea>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium leading-6 text-slate-900">Evidencia (Opcional)</label>
                                    <input type="file" name="evidence" onChange={handleActiveStatusFormChange} className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100" />
                                </div>
                            </div>

                            <div className="mt-8 flex items-center justify-end gap-x-4 border-t border-slate-100 pt-6">
                                <button type="button" onClick={() => setIsActiveStatusModalOpen(false)} className="text-sm font-semibold leading-6 text-slate-900 hover:text-slate-700">
                                    Cancelar
                                </button>
                                <button type="submit" className="btn-primary bg-blue-600 hover:bg-blue-700 text-white">
                                    Guardar Estado
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Modal de Gestión de Servicios */}
            {isServicesModalOpen && servicesClient && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"></div>
                    <div className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">Servicios Contratados: {servicesClient.name}</h3>
                                <p className="text-sm text-slate-500">Gestiona los múltiples servicios asociados a este cliente.</p>
                            </div>
                            <button onClick={() => setIsServicesModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <span className="sr-only">Cerrar</span>
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-1 border-r border-slate-100 pr-0 lg:pr-6">
                                <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <Plus className="w-5 h-5 text-primary-600" /> Vincular Nuevo Servicio
                                </h4>
                                <form onSubmit={handleServiceSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Servicio *</label>
                                        <select
                                            required
                                            value={newServiceFormData.service}
                                            onChange={e => setNewServiceFormData({ ...newServiceFormData, service: e.target.value })}
                                            className="mt-1 input-field w-full bg-white"
                                        >
                                            <option value="">-- Seleccionar --</option>
                                            {services.map(s => (
                                                <option key={s.id} value={s.id}>
                                                    {s.internal_code ? `[${s.internal_code}] ` : ''}{s.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">MRC ($) *</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                required
                                                value={newServiceFormData.agreed_price}
                                                onChange={e => setNewServiceFormData({ ...newServiceFormData, agreed_price: e.target.value })}
                                                className="input-field w-full"
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">NRC ($)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={newServiceFormData.nrc}
                                                onChange={e => setNewServiceFormData({ ...newServiceFormData, nrc: e.target.value })}
                                                className="input-field w-full"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Estado Inicial *</label>
                                        <select
                                            required
                                            value={newServiceFormData.status}
                                            onChange={e => setNewServiceFormData({ ...newServiceFormData, status: e.target.value })}
                                            className="input-field w-full bg-white"
                                        >
                                            <option value="PROSPECTING">Prospección</option>
                                            <option value="INSTALLED">Instalado / Activo</option>
                                            <option value="BACKLOG">Backlog</option>
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Velocidad (Mbps)</label>
                                            <input
                                                type="text"
                                                value={newServiceFormData.bandwidth}
                                                onChange={e => setNewServiceFormData({ ...newServiceFormData, bandwidth: e.target.value })}
                                                className="input-field w-full"
                                                placeholder="e.g. 50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Ubicación del Servicio</label>
                                            <input
                                                type="text"
                                                value={newServiceFormData.service_location}
                                                onChange={e => setNewServiceFormData({ ...newServiceFormData, service_location: e.target.value })}
                                                className="input-field w-full"
                                                placeholder="Dirección..."
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Observaciones</label>
                                        <textarea
                                            value={newServiceFormData.notes}
                                            onChange={e => setNewServiceFormData({ ...newServiceFormData, notes: e.target.value })}
                                            className="input-field w-full"
                                            rows={2}
                                            placeholder="Notas adicionales..."
                                        />
                                    </div>
                                    <button type="submit" className="btn-primary w-full py-2.5">
                                        Vincular Servicio
                                    </button>
                                </form>
                            </div>

                            <div className="lg:col-span-2">
                                <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <Server className="w-5 h-5 text-indigo-600" /> Servicios Actuales
                                </h4>
                                {clientServicesList.length > 0 ? (
                                    <div className="space-y-3">
                                        {clientServicesList.map(item => {
                                            const serviceName = services.find(s => s.id === item.service)?.name || 'Servicio Desconocido';
                                            return (
                                                <div key={item.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors group">
                                                    <div
                                                        className="flex-1 cursor-pointer"
                                                        onClick={() => {
                                                            setEditingService(item);
                                                            setUpdateServiceFormData({
                                                                status: item.status,
                                                                agreed_price: item.agreed_price,
                                                                nrc: item.nrc || '',
                                                                bandwidth: item.bandwidth || '',
                                                                service_location: item.service_location || '',
                                                                notes: item.notes || '',
                                                                new_note: ''
                                                            });
                                                            setIsUpdateServiceModalOpen(true);
                                                        }}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <div className="font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">{serviceName}</div>
                                                            <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                            </svg>
                                                        </div>
                                                        <div className="flex flex-wrap gap-4 mt-1">
                                                            <div className="text-xs text-slate-500"><span className="font-semibold text-slate-700">MRC:</span> ${item.agreed_price}</div>
                                                            <div className="text-xs text-slate-500"><span className="font-semibold text-slate-700">Estado:</span> {translateStatus(item.status)}</div>
                                                            {item.bandwidth && <div className="text-xs text-slate-500"><span className="font-semibold text-slate-700">Vel:</span> {item.bandwidth} Mbps</div>}
                                                            {item.service_location && <div className="text-xs text-slate-500"><span className="font-semibold text-slate-700">Loc:</span> {item.service_location}</div>}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => deleteClientService(item.id)}
                                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-2"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                                        <Server className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                        <p className="text-slate-500">Este cliente aún no tiene servicios específicos vinculados.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
                            <button onClick={() => setIsServicesModalOpen(false)} className="btn-secondary">
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {isSummaryModalOpen && servicesClient && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsSummaryModalOpen(false)}></div>
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-slide-up">
                        <div className="px-6 py-4 bg-emerald-600 text-white flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold">Resumen de Servicios</h3>
                                <p className="text-emerald-100 text-sm tracking-wide uppercase font-semibold">{servicesClient.name}</p>
                            </div>
                            <button onClick={() => setIsSummaryModalOpen(false)} className="hover:bg-emerald-700 p-2 rounded-full transition-colors">
                                <Plus className="w-6 h-6 rotate-45" />
                            </button>
                        </div>

                        <div className="p-6 max-h-[70vh] overflow-y-auto">
                            <div className="space-y-4">
                                {clientServicesList.length > 0 ? (
                                    <>
                                        <table className="min-w-full divide-y divide-slate-200 border border-slate-100 rounded-lg overflow-hidden">
                                            <thead className="bg-slate-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Servicio</th>
                                                    <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Ubicación del Servicio</th>
                                                    <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase">Estado</th>
                                                    <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase">MRC</th>
                                                    <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase">NRC</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 bg-white">
                                                {clientServicesList.map(item => {
                                                    const sName = services.find(s => s.id === item.service)?.name || 'N/A';
                                                    return (
                                                        <tr key={item.id} className="hover:bg-slate-50/50">
                                                            <td
                                                                className="px-4 py-3 text-sm font-medium text-slate-800 cursor-pointer hover:text-indigo-600 transition-colors flex items-center gap-2 group"
                                                                onClick={() => {
                                                                    setEditingService(item);
                                                                    setUpdateServiceFormData({
                                                                        status: item.status,
                                                                        agreed_price: item.agreed_price,
                                                                        nrc: item.nrc,
                                                                        bandwidth: item.bandwidth || '',
                                                                        service_location: item.service_location || '',
                                                                        notes: item.notes || '',
                                                                        new_note: ''
                                                                    });
                                                                    setIsUpdateServiceModalOpen(true);
                                                                }}
                                                            >
                                                                <span>{sName}</span>
                                                                <svg className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                                </svg>
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-slate-600 truncate max-w-[150px]" title={item.service_location}>{item.service_location || 'S/N'}</td>
                                                            <td className="px-4 py-3 text-center">
                                                                {getDetailedStatusBadge(item.status)}
                                                            </td>
                                                            <td className="px-4 py-3 text-right text-sm font-bold text-slate-900">${Number(item.agreed_price || 0).toFixed(2)}</td>
                                                            <td className="px-4 py-3 text-right text-sm font-medium text-slate-500">${Number(item.nrc || 0).toFixed(2)}</td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>

                                        <div className="mt-6 p-4 bg-slate-900 rounded-xl text-white shadow-lg flex justify-between items-center">
                                            <div className="flex flex-wrap gap-8">
                                                <div>
                                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Servicios Totales</p>
                                                    <p className="text-2xl font-black text-white">
                                                        {clientServicesList.length}
                                                    </p>
                                                </div>
                                                <div className="border-l border-slate-700 pl-8">
                                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Total Mensual (MRC)</p>
                                                    <p className="text-2xl font-black text-emerald-400">
                                                        ${clientServicesList.reduce((acc, curr) => acc + Number(curr.agreed_price || 0), 0).toFixed(2)}
                                                    </p>
                                                </div>
                                                <div className="border-l border-slate-700 pl-8">
                                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Total Único (NRC)</p>
                                                    <p className="text-2xl font-black text-blue-400">
                                                        ${clientServicesList.reduce((acc, curr) => acc + Number(curr.nrc || 0), 0).toFixed(2)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className={`px-3 py-1 rounded-full text-[10px] font-bold inline-block uppercase ${servicesClient.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-500'}`}>
                                                    {servicesClient.is_active ? 'Cliente Activo' : 'Cliente Inactivo'}
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                                        <p className="text-slate-500">No hay servicios asociados a este cliente.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                            <button onClick={() => setIsSummaryModalOpen(false)} className="px-4 py-2 bg-slate-800 text-white rounded-lg font-bold text-sm hover:bg-slate-900 transition-colors">
                                Cerrar Resumen
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {isUpdateServiceModalOpen && editingService && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsUpdateServiceModalOpen(false)}></div>
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up">
                        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-slate-800">Actualizar Servicio v2.0</h3>
                            <button onClick={() => setIsUpdateServiceModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2">
                                <Plus className="w-6 h-6 rotate-45" />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateServiceSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Estado Actual en Embudo</label>
                                <select
                                    value={updateServiceFormData.status}
                                    onChange={e => setUpdateServiceFormData({ ...updateServiceFormData, status: e.target.value })}
                                    className="input-field w-full bg-white"
                                    required
                                >
                                    <option value="BACKLOG">Backlog</option>
                                    <option value="INSTALLED">Instalado</option>
                                    <option value="PROSPECTING">Prospección</option>
                                    <option value="CONTACTED">Contactado</option>
                                    <option value="FIRST_MEETING">Primera Cita</option>
                                    <option value="OFFERED">Ofertado</option>
                                    <option value="FOLLOW_UP">Seguimiento</option>
                                    <option value="CLOSING_MEETING">Cita de Cierre</option>
                                    <option value="DEMO">Demo</option>
                                    <option value="CONTRACT_SIGNED">Firma de Contrato</option>
                                    <option value="LOST">Negocio Perdido</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Monto MRC ($)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={updateServiceFormData.agreed_price}
                                        onChange={e => setUpdateServiceFormData({ ...updateServiceFormData, agreed_price: e.target.value })}
                                        className="input-field w-full"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Monto NRC ($)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={updateServiceFormData.nrc}
                                        onChange={e => setUpdateServiceFormData({ ...updateServiceFormData, nrc: e.target.value })}
                                        className="input-field w-full"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Velocidad (Mbps)</label>
                                    <input
                                        type="text"
                                        value={updateServiceFormData.bandwidth}
                                        onChange={e => setUpdateServiceFormData({ ...updateServiceFormData, bandwidth: e.target.value })}
                                        className="input-field w-full"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Ubicación</label>
                                    <input
                                        type="text"
                                        value={updateServiceFormData.service_location}
                                        onChange={e => setUpdateServiceFormData({ ...updateServiceFormData, service_location: e.target.value })}
                                        className="input-field w-full"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Historial de Observaciones</label>
                                <div className="mb-2 p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 text-[11px] text-slate-600 max-h-32 overflow-y-auto whitespace-pre-wrap shadow-inner">
                                    {updateServiceFormData.notes || "No hay notas previas en el sistema."}
                                </div>
                                <textarea
                                    value={updateServiceFormData.new_note}
                                    onChange={e => setUpdateServiceFormData({ ...updateServiceFormData, new_note: e.target.value })}
                                    className="input-field w-full border-indigo-200 focus:ring-indigo-500 focus:border-indigo-500"
                                    rows={3}
                                    placeholder="Agrega una nueva nota que se guardará con fecha y hora..."
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsUpdateServiceModalOpen(false)}
                                    className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-800"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                                >
                                    Guardar Cambios
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Work Order Modal */}
            {isWorkOrderModalOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsWorkOrderModalOpen(false)}></div>
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-slide-up border border-slate-200">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{workOrderFormData.order_number}</h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Generación de Orden de Trabajo</p>
                            </div>
                            <button onClick={() => setIsWorkOrderModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 transition-colors">
                                <Plus className="w-6 h-6 rotate-45" />
                            </button>
                        </div>

                        <form onSubmit={handleWorkOrderSubmit} className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre del Cliente</label>
                                    <div className="p-3 bg-slate-50 rounded-lg text-sm font-bold text-slate-700 border border-slate-100 italic">
                                        {workOrderFormData.client_name}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Servicio</label>
                                    <div className="p-3 bg-slate-50 rounded-lg text-sm font-bold text-slate-700 border border-slate-100">
                                        {workOrderFormData.service_name}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ubicación del Servicio</label>
                                    <div className="p-3 bg-slate-50 rounded-lg text-sm font-bold text-slate-700 border border-slate-100">
                                        {workOrderFormData.service_location || 'S/N'}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Login Sugerido</label>
                                    <input
                                        type="text"
                                        value={workOrderFormData.login}
                                        onChange={e => setWorkOrderFormData({ ...workOrderFormData, login: e.target.value })}
                                        className="w-full p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-sm font-mono font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha y Hora Estimada Instalación</label>
                                    <input
                                        type="datetime-local"
                                        value={workOrderFormData.estimated_date}
                                        onChange={e => setWorkOrderFormData({ ...workOrderFormData, estimated_date: e.target.value })}
                                        className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Observaciones</label>
                                <textarea
                                    value={workOrderFormData.observations}
                                    onChange={e => setWorkOrderFormData({ ...workOrderFormData, observations: e.target.value })}
                                    className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                    rows={3}
                                    placeholder="Detalles adicionales para la cuadrilla técnica..."
                                />
                            </div>

                            <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-50">
                                <button
                                    type="button"
                                    onClick={() => setIsWorkOrderModalOpen(false)}
                                    className="px-6 py-2 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    Descartar
                                </button>
                                <button
                                    type="submit"
                                    className="px-10 py-3 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-200 flex items-center gap-2"
                                >
                                    <span>Guardar Orden de Trabajo</span>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

