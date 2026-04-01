"""Excel report generator for monthly billing — CONTROL FACTURAS format."""

import io
from collections import OrderedDict
from decimal import Decimal

from openpyxl import Workbook
from openpyxl.drawing.image import Image as XLImage
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

from .models import MONTH_CHOICES, BillingRecord

MONTH_NAMES = dict(MONTH_CHOICES)

LOGO_PATH = None  # resolved lazily below


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


def _thin_border():
    s = Side(style='thin', color='FF000000')
    return Border(left=s, right=s, top=s, bottom=s)


def _set_money(ws, row, col, value, extra_styles=None):
    cell = ws.cell(row=row, column=col, value=float(value) if value else 0.0)
    cell.number_format = '#,##0.00'
    if extra_styles:
        for attr, val in extra_styles.items():
            setattr(cell, attr, val)
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
    io.BytesIO  ready to stream as HTTP response.
    """
    qs = (
        BillingRecord.objects
        .select_related('client', 'service_catalog')
        .filter(anio=anio)
    )
    if mes:
        qs = qs.filter(mes=mes)
    qs = qs.order_by('client__name', 'id')

    # ── Group by client (preserving order) ──────────────────────────────
    clients_map = OrderedDict()
    for r in qs:
        key = r.client_id
        if key not in clients_map:
            clients_map[key] = {
                'name': r.client.name,
                'records': [],
                'total': Decimal('0'),
            }
        clients_map[key]['records'].append(r)
        clients_map[key]['total'] += r.service_amount or Decimal('0')

    # ── Workbook setup ───────────────────────────────────────────────────
    wb = Workbook()
    ws = wb.active
    mes_label = MONTH_NAMES.get(mes, '') if mes else ''
    ws.title = mes_label if mes_label else str(anio)

    # Column widths  A    B     C     D     E     F     G     H     I
    col_widths = [29.5, 70.0, 17.5, 16.5, 16.5, 25.0, 14.5, 13.0, 13.0]
    for i, w in enumerate(col_widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w

    # Row heights
    ws.row_dimensions[1].height = 12
    ws.row_dimensions[2].height = 42  # logo area
    ws.row_dimensions[3].height = 12
    ws.row_dimensions[4].height = 26
    ws.row_dimensions[5].height = 8
    ws.row_dimensions[6].height = 32

    # ── Logo (rows 1-3) ──────────────────────────────────────────────────
    logo_path = _resolve_logo()
    if logo_path:
        try:
            img = XLImage(logo_path)
            img.width = 160
            img.height = 52
            ws.add_image(img, 'A1')
        except Exception:
            pass  # logo optional — never break the report

    # ── Row 4: Title ─────────────────────────────────────────────────────
    ws.merge_cells('A4:I4')
    title = ws['A4']
    title.value = f'FACTURACION MENSUAL RECURRENTE {anio}'
    title.font = Font(bold=True, size=16, color='1F3864')
    title.alignment = Alignment(horizontal='center', vertical='center')

    # ── Row 6: Headers ───────────────────────────────────────────────────
    HDR_FILL = PatternFill('solid', fgColor='1F3864')
    HDR_FONT = Font(bold=True, color='FFFFFF', size=11)
    HDR_ALIGN = Alignment(horizontal='center', vertical='center', wrap_text=True)
    BDR = _thin_border()

    HEADERS = [
        'Cliente',
        'Servicio por Cliente',
        'Servicio sin IVA',
        '15% IVA',
        'TOTAL',
        'Facturacion Total Clientes',
        'OBSERVACIONES',
        'FACTURA',
        'CREDITO',
    ]
    for col, h in enumerate(HEADERS, 1):
        cell = ws.cell(row=6, column=col, value=h)
        cell.fill = HDR_FILL
        cell.font = HDR_FONT
        cell.alignment = HDR_ALIGN
        cell.border = BDR

    # ── Shared style objects ─────────────────────────────────────────────
    RIGHT   = Alignment(horizontal='right',  vertical='center')
    LEFT    = Alignment(horizontal='left',   vertical='center', wrap_text=True)
    CENTER  = Alignment(horizontal='center', vertical='center')
    DATA_F  = Font(size=11)
    BOLD_F  = Font(bold=True, size=11)

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

            # A: client name (first occurrence only; merged later)
            if i == 0:
                a = ws.cell(row=r, column=1, value=client_name)
                a.font = BOLD_F
                a.alignment = LEFT

            # B: service label
            svc = (
                rec.service_catalog.name
                if rec.service_catalog
                else (rec.service_label or '')
            )
            b = ws.cell(row=r, column=2, value=svc)
            b.font = DATA_F
            b.alignment = LEFT

            # C-E: amounts
            _set_money(ws, r, 3, rec.service_amount)
            ws.cell(row=r, column=3).font = DATA_F
            ws.cell(row=r, column=3).alignment = RIGHT

            _set_money(ws, r, 4, rec.iva_amount)
            ws.cell(row=r, column=4).font = DATA_F
            ws.cell(row=r, column=4).alignment = RIGHT

            _set_money(ws, r, 5, rec.total)
            ws.cell(row=r, column=5).font = DATA_F
            ws.cell(row=r, column=5).alignment = RIGHT

            # F: facturacion total cliente (first row only)
            if i == 0:
                f = _set_money(ws, r, 6, client_total)
                f.font = BOLD_F
                f.alignment = RIGHT

            # G-I: text fields
            for col_idx, val in [
                (7, rec.observations or ''),
                (8, rec.factura or ''),
                (9, rec.credito or ''),
            ]:
                cell = ws.cell(row=r, column=col_idx, value=val)
                cell.font = DATA_F
                cell.alignment = CENTER if col_idx in (8, 9) else LEFT

            # Borders
            for col in range(1, 10):
                ws.cell(row=r, column=col).border = BDR

            row_cursor += 1

        # Merge column A across all service rows for this client
        if len(records) > 1:
            ws.merge_cells(f'A{start_row}:A{row_cursor - 1}')
            ws.cell(row=start_row, column=1).alignment = Alignment(
                horizontal='left', vertical='center', wrap_text=True
            )
            # Merge column F (total cliente) too
            ws.merge_cells(f'F{start_row}:F{row_cursor - 1}')
            ws.cell(row=start_row, column=6).alignment = Alignment(
                horizontal='right', vertical='center'
            )

        # Empty separator row between clients
        ws.row_dimensions[row_cursor].height = 7
        row_cursor += 1

    # ── Grand totals ─────────────────────────────────────────────────────
    total_sin_iva = sum(
        float(r.service_amount or 0)
        for cd in clients_map.values() for r in cd['records']
    )
    total_iva = sum(
        float(r.iva_amount or 0)
        for cd in clients_map.values() for r in cd['records']
    )
    total_con_iva = sum(
        float(r.total or 0)
        for cd in clients_map.values() for r in cd['records']
    )

    YELLOW = PatternFill('solid', fgColor='FFFF00')
    TOTAL_F = Font(bold=True, size=12)
    GRAND_F = Font(bold=True, size=14)

    def _total_row(row, label, s_iva, iva, total, font):
        ws.row_dimensions[row].height = 22
        ws.merge_cells(f'A{row}:B{row}')
        label_cell = ws.cell(row=row, column=1, value=label)
        label_cell.font = font
        label_cell.alignment = LEFT
        label_cell.fill = YELLOW
        label_cell.border = BDR

        for col in range(2, 10):
            cell = ws.cell(row=row, column=col)
            cell.fill = YELLOW
            cell.border = BDR
            cell.font = font

        for col, val in [(3, s_iva), (4, iva), (5, total)]:
            _set_money(ws, row, col, val)
            ws.cell(row=row, column=col).fill = YELLOW
            ws.cell(row=row, column=col).border = BDR
            ws.cell(row=row, column=col).alignment = RIGHT
            ws.cell(row=row, column=col).font = font

    _total_row(row_cursor, 'TOTAL RECURRENTES', total_sin_iva, total_iva, total_con_iva, TOTAL_F)
    row_cursor += 2  # skip one row

    _total_row(row_cursor, 'TOTAL FACTURACION', total_sin_iva, total_iva, total_con_iva, GRAND_F)

    # ── Print settings ────────────────────────────────────────────────────
    ws.page_setup.orientation = 'landscape'
    ws.page_setup.fitToPage  = True
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf, mes_label
