"""Excel report generator for monthly billing — CONTROL FACTURAS format.

Data source: ClientService (status=INSTALLED) from the Clients/Services module.
This report is independent of the BillingRecord import module.
"""

import io
from collections import OrderedDict
from decimal import Decimal

from openpyxl import Workbook
from openpyxl.drawing.image import Image as XLImage
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

from .models import MONTH_CHOICES

MONTH_NAMES = dict(MONTH_CHOICES)

# Statuses that represent a billable (recurring) service
BILLABLE_STATUSES = ('INSTALLED',)


def _resolve_logo():
    """Return absolute path to DataCom logo, or None if not found."""
    import os

    candidates = [
        os.path.join(os.path.dirname(__file__), '..', 'frontend', 'public', 'datacom_logo.png'),
        '/var/www/crm-datacom/frontend/public/datacom_logo.png',
    ]
    for path in candidates:
        normalised = os.path.normpath(path)
        if os.path.isfile(normalised):
            return normalised
    return None


def get_report_data(mes, anio):
    """
    Build ordered dict of client → list of service rows from ClientService.

    Filters ClientService where status IN BILLABLE_STATUSES.
    Optionally filters by the service being active during the requested month/year.

    Returns
    -------
    OrderedDict: { client_name: {'records': [...], 'total': Decimal} }
    Each record has: service_label, service_amount, iva_amount, total,
                     observations, factura, credito
    """
    import calendar
    from datetime import date
    from services.models import ClientService

    qs = (
        ClientService.objects
        .select_related('client', 'service')
        .filter(status__in=BILLABLE_STATUSES, client__is_active=True)
        .order_by('client__name', 'service__name', 'id')
    )

    # Filter by month/year period if provided
    if mes and anio:
        last_day = calendar.monthrange(anio, mes)[1]
        period_start = date(anio, mes, 1)
        period_end   = date(anio, mes, last_day)
        qs = qs.filter(start_date__lte=period_end).filter(
            # end_date is null (open-ended) OR end_date >= start of month
            end_date__isnull=True
        ) | qs.filter(
            status__in=BILLABLE_STATUSES,
            client__is_active=True,
            start_date__lte=period_end,
            end_date__gte=period_start,
        )
        # Simpler: just filter start_date <= period_end
        qs = (
            ClientService.objects
            .select_related('client', 'service')
            .filter(status__in=BILLABLE_STATUSES, client__is_active=True)
            .filter(start_date__lte=period_end)
            .filter(
                __import__('django.db.models', fromlist=['Q']).Q(end_date__isnull=True) |
                __import__('django.db.models', fromlist=['Q']).Q(end_date__gte=period_start)
            )
            .order_by('client__name', 'service__name', 'id')
        )

    clients_map = OrderedDict()
    for cs in qs:
        key = cs.client_id
        if key not in clients_map:
            clients_map[key] = {
                'name':    cs.client.name,
                'records': [],
                'total':   Decimal('0'),
            }
        amount = Decimal(str(cs.agreed_price or 0))
        iva    = round(amount * Decimal('0.15'), 2)
        total  = round(amount + iva, 2)
        clients_map[key]['records'].append({
            'service_label':   cs.service.name if cs.service else '',
            'service_amount':  float(amount),
            'iva_amount':      float(iva),
            'total':           float(total),
            'observations':    cs.notes or '',
            'factura':         '',
            'credito':         '',
        })
        clients_map[key]['total'] += amount

    return clients_map


def _thin_border():
    s = Side(style='thin', color='FF000000')
    return Border(left=s, right=s, top=s, bottom=s)


def _money_cell(ws, row, col, value):
    cell = ws.cell(row=row, column=col, value=round(float(value or 0), 2))
    cell.number_format = '#,##0.00'
    return cell


def generate_billing_excel(mes, anio):
    """
    Build an xlsx report matching the CONTROL FACTURAS RECURRENTES format.

    Parameters
    ----------
    mes  : int | None  — billing month (1-12) or None for full-year report
    anio : int         — billing year

    Returns
    -------
    (io.BytesIO, str)  — file buffer and month label for file naming.
    """
    mes_label   = MONTH_NAMES.get(mes, '') if mes else ''
    clients_map = get_report_data(mes, anio)

    # ── Workbook / sheet ──────────────────────────────────────────────────
    wb = Workbook()
    ws = wb.active
    ws.title = mes_label if mes_label else str(anio)

    # Column widths: A    B     C     D     E     F     G     H     I
    col_widths = [29.5, 70.0, 17.5, 16.5, 16.5, 25.0, 14.5, 13.0, 13.0]
    for i, w in enumerate(col_widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w

    # Row heights
    ws.row_dimensions[1].height = 12
    ws.row_dimensions[2].height = 42
    ws.row_dimensions[3].height = 12
    ws.row_dimensions[4].height = 26
    ws.row_dimensions[5].height = 8
    ws.row_dimensions[6].height = 32

    # ── Logo ──────────────────────────────────────────────────────────────
    logo_path = _resolve_logo()
    if logo_path:
        try:
            img = XLImage(logo_path)
            img.width  = 160
            img.height = 52
            ws.add_image(img, 'A1')
        except Exception:
            pass

    # ── Title row 4 ───────────────────────────────────────────────────────
    ws.merge_cells('A4:I4')
    title_text = f'FACTURACION MENSUAL RECURRENTE {anio}'
    if mes_label:
        title_text = f'FACTURACION MENSUAL RECURRENTE — {mes_label.upper()} {anio}'
    title            = ws['A4']
    title.value      = title_text
    title.font       = Font(bold=True, size=16, color='1F3864')
    title.alignment  = Alignment(horizontal='center', vertical='center')

    # ── Header row 6 ─────────────────────────────────────────────────────
    HDR_FILL  = PatternFill('solid', fgColor='1F3864')
    HDR_FONT  = Font(bold=True, color='FFFFFF', size=11)
    HDR_ALIGN = Alignment(horizontal='center', vertical='center', wrap_text=True)
    BDR       = _thin_border()

    HEADERS = [
        'Cliente', 'Servicio por Cliente', 'Servicio sin IVA',
        '15% IVA', 'TOTAL', 'Facturacion Total Clientes',
        'OBSERVACIONES', 'FACTURA', 'CREDITO',
    ]
    for col, h in enumerate(HEADERS, 1):
        cell           = ws.cell(row=6, column=col, value=h)
        cell.fill      = HDR_FILL
        cell.font      = HDR_FONT
        cell.alignment = HDR_ALIGN
        cell.border    = BDR

    # ── Shared styles ─────────────────────────────────────────────────────
    RIGHT  = Alignment(horizontal='right',  vertical='center')
    LEFT   = Alignment(horizontal='left',   vertical='center', wrap_text=True)
    CENTER = Alignment(horizontal='center', vertical='center')
    DATA_F = Font(size=11)
    BOLD_F = Font(bold=True, size=11)

    # ── Data rows ─────────────────────────────────────────────────────────
    row_cursor = 7

    for client_data in clients_map.values():
        records      = client_data['records']
        client_name  = client_data['name']
        client_total = float(client_data['total'])
        start_row    = row_cursor

        for i, rec in enumerate(records):
            r = row_cursor
            ws.row_dimensions[r].height = 18

            # A: client name (first row only; merged later)
            if i == 0:
                a           = ws.cell(row=r, column=1, value=client_name)
                a.font      = BOLD_F
                a.alignment = LEFT

            # B: service label
            b           = ws.cell(row=r, column=2, value=rec['service_label'])
            b.font      = DATA_F
            b.alignment = LEFT

            # C: Servicio sin IVA
            c = _money_cell(ws, r, 3, rec['service_amount'])
            c.font = DATA_F; c.alignment = RIGHT; c.border = BDR

            # D: 15% IVA
            d = _money_cell(ws, r, 4, rec['iva_amount'])
            d.font = DATA_F; d.alignment = RIGHT; d.border = BDR

            # E: Total
            e = _money_cell(ws, r, 5, rec['total'])
            e.font = DATA_F; e.alignment = RIGHT; e.border = BDR

            # F: Facturacion Total Clientes (first row only)
            if i == 0:
                f = _money_cell(ws, r, 6, client_total)
                f.font = BOLD_F; f.alignment = RIGHT; f.border = BDR

            # G: Observaciones
            g           = ws.cell(row=r, column=7, value=rec['observations'])
            g.font      = DATA_F; g.alignment = LEFT; g.border = BDR

            # H: Factura
            h_           = ws.cell(row=r, column=8, value=rec['factura'])
            h_.font      = DATA_F; h_.alignment = CENTER; h_.border = BDR

            # I: Crédito
            i_           = ws.cell(row=r, column=9, value=rec['credito'])
            i_.font      = DATA_F; i_.alignment = CENTER; i_.border = BDR

            ws.cell(row=r, column=1).border = BDR
            ws.cell(row=r, column=2).border = BDR

            row_cursor += 1

        # Merge A and F across all service rows of this client
        if len(records) > 1:
            ws.merge_cells(f'A{start_row}:A{row_cursor - 1}')
            ws.cell(row=start_row, column=1).alignment = Alignment(
                horizontal='left', vertical='center', wrap_text=True
            )
            ws.merge_cells(f'F{start_row}:F{row_cursor - 1}')
            ws.cell(row=start_row, column=6).alignment = Alignment(
                horizontal='right', vertical='center'
            )

        # Empty separator row
        ws.row_dimensions[row_cursor].height = 6
        row_cursor += 1

    # ── Totals ────────────────────────────────────────────────────────────
    total_sin_iva = sum(rec['service_amount'] for cd in clients_map.values() for rec in cd['records'])
    total_iva     = sum(rec['iva_amount']     for cd in clients_map.values() for rec in cd['records'])
    total_con_iva = sum(rec['total']          for cd in clients_map.values() for rec in cd['records'])

    YELLOW  = PatternFill('solid', fgColor='FFFF00')
    TOTAL_F = Font(bold=True, size=12)
    GRAND_F = Font(bold=True, size=14)

    def _totals_row(row, label, s_iva, iva, total, font):
        ws.row_dimensions[row].height = 22
        ws.merge_cells(f'A{row}:B{row}')
        lbl = ws.cell(row=row, column=1, value=label)
        lbl.font = font; lbl.alignment = LEFT
        for col in range(1, 10):
            cell = ws.cell(row=row, column=col)
            cell.fill = YELLOW; cell.border = BDR; cell.font = font
        for col, val in [(3, s_iva), (4, iva), (5, total)]:
            m = _money_cell(ws, row, col, val)
            m.fill = YELLOW; m.border = BDR; m.alignment = RIGHT; m.font = font

    _totals_row(row_cursor, 'TOTAL RECURRENTES', total_sin_iva, total_iva, total_con_iva, TOTAL_F)
    row_cursor += 2
    _totals_row(row_cursor, 'TOTAL FACTURACION',  total_sin_iva, total_iva, total_con_iva, GRAND_F)

    # ── Print settings ────────────────────────────────────────────────────
    ws.page_setup.orientation = 'landscape'
    ws.page_setup.fitToPage   = True
    ws.page_setup.fitToWidth  = 1
    ws.page_setup.fitToHeight = 0

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf, mes_label
