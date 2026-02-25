"""Reports routes - PDF/Excel report generation using ReportLab and openpyxl."""
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone
from typing import Optional
from io import BytesIO

router = APIRouter(prefix="/reports", tags=["reports"])

import sys
sys.path.insert(0, '/app/backend')
from database import db
from routes.auth import get_current_user

RUPEE = "\u20b9"
FONT_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def fmt_date(val):
    """Format a date value to readable string."""
    if not val:
        return "-"
    if isinstance(val, str):
        try:
            val = datetime.fromisoformat(val.replace("Z", "+00:00"))
        except Exception:
            return val[:10] if len(val) >= 10 else val
    if isinstance(val, datetime):
        return val.strftime("%d %b %Y, %I:%M %p")
    return str(val)


def fmt_amount(val):
    """Format amount with rupee symbol."""
    if not val:
        return f"{RUPEE}0"
    return f"{RUPEE}{val:,.0f}"


@router.get("/generate/{report_type}")
async def generate_report(
    request: Request,
    report_type: str,
    format: str = "pdf",
    from_date: Optional[str] = None,
    to_date: Optional[str] = None
):
    """Generate and download financial reports"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_id = user.get('user_id')
    user_name = user.get('name', 'User')
    user_filter = {"userId": user_id}

    try:
        start_date = datetime.strptime(from_date, "%Y-%m-%d") if from_date else datetime.now(timezone.utc).replace(day=1)
        end_date = datetime.strptime(to_date, "%Y-%m-%d") if to_date else datetime.now(timezone.utc)
    except Exception:
        start_date = datetime.now(timezone.utc).replace(day=1)
        end_date = datetime.now(timezone.utc)

    data = {}
    if report_type in ["income", "cashflow", "networth"]:
        data["incomes"] = await db.income_sources.find(user_filter, {"_id": 0}).to_list(1000)
        data["other_incomes"] = await db.other_income.find(user_filter, {"_id": 0}).to_list(1000)
    if report_type in ["expense", "cashflow", "networth"]:
        data["expenses"] = await db.expenses.find(user_filter, {"_id": 0}).to_list(1000)
    if report_type in ["loan", "networth"]:
        data["loans"] = await db.loans.find(user_filter, {"_id": 0}).to_list(1000)
    if report_type in ["investment", "networth"]:
        data["investments"] = await db.investments.find(user_filter, {"_id": 0}).to_list(1000)
    if report_type in ["networth"]:
        data["assets"] = await db.assets.find(user_filter, {"_id": 0}).to_list(1000)
        data["accounts"] = await db.accounts.find(user_filter, {"_id": 0}).to_list(1000)
        data["credit_cards"] = await db.credit_cards.find(user_filter, {"_id": 0}).to_list(1000)
    if report_type == "goal":
        data["goals"] = await db.goals.find(user_filter, {"_id": 0}).to_list(1000)
    if report_type == "asset":
        data["assets"] = await db.assets.find(user_filter, {"_id": 0}).to_list(1000)
    if report_type == "insurance":
        data["insurances"] = await db.insurances.find(user_filter, {"_id": 0}).to_list(1000)

    if format == "excel":
        return await generate_excel_report(report_type, data, user_name, start_date, end_date)
    return await generate_pdf_report(report_type, data, user_name, start_date, end_date)


def _register_fonts():
    """Register DejaVu fonts for Unicode support (₹ symbol)."""
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    try:
        pdfmetrics.getFont('DejaVu')
    except Exception:
        pdfmetrics.registerFont(TTFont('DejaVu', FONT_PATH))
        pdfmetrics.registerFont(TTFont('DejaVu-Bold', FONT_BOLD_PATH))


def _make_table(table_data, col_widths, header_color):
    """Create a styled table with consistent formatting."""
    from reportlab.lib import colors
    from reportlab.platypus import Table, TableStyle
    table = Table(table_data, colWidths=col_widths)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor(header_color)),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'DejaVu-Bold'),
        ('FONTNAME', (0, 1), (-1, -1), 'DejaVu'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('TOPPADDING', (0, 0), (-1, 0), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E5E7EB')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F9FAFB')]),
    ]))
    return table


async def generate_pdf_report(report_type, data, user_name, start_date, end_date):
    """Generate PDF report using ReportLab with DejaVu font for ₹ support."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
    from reportlab.lib import colors

    _register_fonts()

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)
    elements = []

    title_style = ParagraphStyle('Title', fontName='DejaVu-Bold', fontSize=16, spaceAfter=6, textColor=colors.HexColor('#111827'))
    sub_style = ParagraphStyle('Sub', fontName='DejaVu', fontSize=9, textColor=colors.HexColor('#6B7280'), spaceAfter=4)
    h2_style = ParagraphStyle('H2', fontName='DejaVu-Bold', fontSize=11, spaceAfter=10, spaceBefore=15, textColor=colors.HexColor('#374151'))

    titles = {
        "income": "Income Report", "expense": "Expense Report", "cashflow": "Cash Flow Report",
        "loan": "Loan Report", "investment": "Investment Report", "networth": "Net Worth Report",
        "goal": "Goal Progress Report", "asset": "Asset Report", "insurance": "Insurance Report"
    }

    elements.append(Paragraph(titles.get(report_type, "Financial Report"), title_style))
    elements.append(Paragraph(f"Generated for: {user_name}", sub_style))
    elements.append(Paragraph(f"Period: {start_date.strftime('%d %b %Y')} - {end_date.strftime('%d %b %Y')}", sub_style))
    elements.append(Spacer(1, 15))

    w = inch  # shorthand

    if report_type == "income" and (data.get("incomes") or data.get("other_incomes")):
        elements.append(Paragraph("Income Sources", h2_style))
        rows = [["Source", "Type", "Amount", "Frequency", "Date Added"]]
        total = 0
        for inc in data.get("incomes", []):
            amt = inc.get('expectedAmount', 0) or 0
            total += amt
            rows.append([
                inc.get('name', 'N/A')[:22],
                inc.get('type', 'N/A').title(),
                fmt_amount(amt),
                inc.get('frequency', 'Monthly'),
                fmt_date(inc.get('createdAt') or inc.get('lastEntryDate'))
            ])
        for oi in data.get("other_incomes", []):
            amt = oi.get('amount', 0) or 0
            total += amt
            cat = oi.get('customCategory') or oi.get('category', 'Other')
            rows.append([
                oi.get('incomeName', 'N/A')[:22],
                cat.title(),
                fmt_amount(amt),
                oi.get('frequency', 'One-time'),
                fmt_date(oi.get('createdAt') or oi.get('dateReceived'))
            ])
        rows.append(["Total", "", fmt_amount(total), "", ""])
        elements.append(_make_table(rows, [1.6*w, 0.9*w, 0.9*w, 0.8*w, 1.3*w], '#10B981'))

    elif report_type == "expense" and data.get("expenses"):
        elements.append(Paragraph("Expense Breakdown", h2_style))
        rows = [["Expense", "Category", "Amount", "Frequency", "Date Added"]]
        total = 0
        for exp in data["expenses"]:
            amt = exp.get('expectedAmount', 0) or 0
            total += amt
            rows.append([
                exp.get('expenseName', 'N/A')[:22],
                exp.get('category', 'N/A'),
                fmt_amount(amt),
                exp.get('frequency', 'Monthly'),
                fmt_date(exp.get('createdAt') or exp.get('lastUpdated'))
            ])
        rows.append(["Total", "", fmt_amount(total), "", ""])
        elements.append(_make_table(rows, [1.6*w, 0.9*w, 0.9*w, 0.8*w, 1.3*w], '#EF4444'))

    elif report_type == "investment" and data.get("investments"):
        elements.append(Paragraph("Investment Portfolio", h2_style))
        rows = [["Name", "Category", "Invested", "Current", "Gain/Loss", "Date Added"]]
        ti, tc = 0, 0
        for inv in data["investments"]:
            invested = inv.get('principal', 0) or 0
            current = inv.get('currentValue', 0) or 0
            ti += invested
            tc += current
            rows.append([
                inv.get('name', 'N/A')[:18],
                inv.get('investmentCategory', 'N/A')[:12],
                fmt_amount(invested),
                fmt_amount(current),
                fmt_amount(current - invested),
                fmt_date(inv.get('createdAt') or inv.get('startDate'))
            ])
        rows.append(["Total", "", fmt_amount(ti), fmt_amount(tc), fmt_amount(tc - ti), ""])
        elements.append(_make_table(rows, [1.2*w, 0.8*w, 0.8*w, 0.8*w, 0.8*w, 1.1*w], '#8B5CF6'))

    elif report_type == "loan" and data.get("loans"):
        elements.append(Paragraph("Loan Details", h2_style))
        rows = [["Loan Name", "Type", "Outstanding", "EMI", "Rate", "Date Added"]]
        total = 0
        for loan in data["loans"]:
            outstanding = loan.get('outstandingAmount', 0) or 0
            total += outstanding
            rows.append([
                loan.get('loanName', 'N/A')[:18],
                loan.get('loanType', 'N/A')[:12],
                fmt_amount(outstanding),
                fmt_amount(loan.get('emiAmount', 0)),
                f"{loan.get('interestRate', 0)}%",
                fmt_date(loan.get('createdAt') or loan.get('startDate'))
            ])
        rows.append(["Total Outstanding", "", fmt_amount(total), "", "", ""])
        elements.append(_make_table(rows, [1.2*w, 0.8*w, 0.9*w, 0.8*w, 0.5*w, 1.1*w], '#F59E0B'))

    elif report_type == "cashflow":
        incomes = data.get("incomes", [])
        other_incomes = data.get("other_incomes", [])
        if incomes or other_incomes:
            elements.append(Paragraph("Income Sources", h2_style))
            rows = [["Source", "Type", "Amount", "Frequency", "Date Added"]]
            inc_total = 0
            for inc in incomes:
                amt = inc.get('expectedAmount', 0) or 0
                inc_total += amt
                rows.append([inc.get('name', 'N/A')[:22], inc.get('type', 'N/A').title(), fmt_amount(amt), inc.get('frequency', 'Monthly'), fmt_date(inc.get('createdAt'))])
            for oi in other_incomes:
                amt = oi.get('amount', 0) or 0
                inc_total += amt
                cat = oi.get('customCategory') or oi.get('category', 'Other')
                rows.append([oi.get('incomeName', 'N/A')[:22], cat.title(), fmt_amount(amt), oi.get('frequency', 'One-time'), fmt_date(oi.get('createdAt') or oi.get('dateReceived'))])
            rows.append(["Total Income", "", fmt_amount(inc_total), "", ""])
            elements.append(_make_table(rows, [1.6*w, 0.9*w, 0.9*w, 0.8*w, 1.3*w], '#10B981'))
            elements.append(Spacer(1, 12))

        if expenses:
            elements.append(Paragraph("Expenses", h2_style))
            rows = [["Expense", "Category", "Amount", "Frequency", "Date Added"]]
            exp_total = 0
            for exp in expenses:
                amt = exp.get('expectedAmount', 0) or 0
                exp_total += amt
                rows.append([exp.get('expenseName', 'N/A')[:22], exp.get('category', 'N/A'), fmt_amount(amt), exp.get('frequency', 'Monthly'), fmt_date(exp.get('createdAt'))])
            rows.append(["Total Expenses", "", fmt_amount(exp_total), "", ""])
            elements.append(_make_table(rows, [1.6*w, 0.9*w, 0.9*w, 0.8*w, 1.3*w], '#EF4444'))

    elif report_type == "networth":
        total_assets = sum(a.get('currentValue', 0) or 0 for a in data.get("assets", []))
        total_investments = sum(i.get('currentValue', 0) or 0 for i in data.get("investments", []))
        liquid_balance = sum(a.get('currentBalance', 0) or a.get('balance', 0) or 0 for a in data.get("accounts", []))
        total_loans = sum(ln.get('outstandingAmount', 0) or 0 for ln in data.get("loans", []))
        total_cc = sum(c.get('currentOutstanding', 0) or c.get('outstandingAmount', 0) or 0 for c in data.get("credit_cards", []))
        net_worth = total_assets + total_investments + liquid_balance - total_loans - total_cc

        elements.append(Paragraph("Net Worth Summary", h2_style))
        rows = [
            ["Category", "Amount"],
            ["Total Assets", fmt_amount(total_assets)],
            ["Total Investments", fmt_amount(total_investments)],
            ["Liquid Balance (Bank)", fmt_amount(liquid_balance)],
            ["Total Liabilities", fmt_amount(total_loans + total_cc)],
            ["Net Worth", fmt_amount(net_worth)]
        ]
        elements.append(_make_table(rows, [3*w, 2*w], '#3B82F6'))

    elif report_type == "goal" and data.get("goals"):
        elements.append(Paragraph("Financial Goals Progress", h2_style))
        rows = [["Goal", "Target", "Current", "Progress", "Target Date", "Created"]]
        for goal in data["goals"]:
            target = goal.get('targetAmount', 0) or 0
            current = goal.get('currentAmount', 0) or 0
            progress = (current / target * 100) if target > 0 else 0
            td = goal.get('targetDate', 'N/A')
            if isinstance(td, datetime):
                td = td.strftime('%d %b %Y')
            rows.append([
                goal.get('goalName', 'N/A')[:18], fmt_amount(target), fmt_amount(current),
                f"{progress:.0f}%", str(td)[:10] if td else '-', fmt_date(goal.get('createdAt'))
            ])
        elements.append(_make_table(rows, [1.2*w, 0.8*w, 0.8*w, 0.6*w, 0.9*w, 1.1*w], '#EC4899'))

    elif report_type == "asset" and data.get("assets"):
        elements.append(Paragraph("Asset Report", h2_style))
        rows = [["Asset Name", "Type", "Purchase Value", "Current Value", "Date Added"]]
        total = 0
        for a in data["assets"]:
            cv = a.get('currentValue', 0) or 0
            total += cv
            rows.append([
                a.get('name', a.get('assetName', 'N/A'))[:20], a.get('assetType', 'N/A'),
                fmt_amount(a.get('purchaseValue', 0)), fmt_amount(cv), fmt_date(a.get('createdAt'))
            ])
        rows.append(["Total", "", "", fmt_amount(total), ""])
        elements.append(_make_table(rows, [1.5*w, 0.9*w, 1*w, 1*w, 1.1*w], '#0EA5E9'))

    elif report_type == "insurance" and data.get("insurances"):
        elements.append(Paragraph("Insurance Report", h2_style))
        rows = [["Policy Name", "Type", "Premium", "Sum Assured", "Date Added"]]
        for ins in data["insurances"]:
            rows.append([
                ins.get('policyName', 'N/A')[:20], ins.get('insuranceType', 'N/A'),
                fmt_amount(ins.get('premiumAmount', 0)), fmt_amount(ins.get('sumAssured', 0)),
                fmt_date(ins.get('createdAt'))
            ])
        elements.append(_make_table(rows, [1.5*w, 0.9*w, 1*w, 1*w, 1.1*w], '#DC2626'))
    else:
        elements.append(Paragraph("No data available for this report type.", sub_style))

    doc.build(elements)
    buffer.seek(0)
    filename = f"{report_type}_report_{datetime.now().strftime('%Y%m%d')}.pdf"
    return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={filename}"})


async def generate_excel_report(report_type, data, user_name, start_date, end_date):
    """Generate Excel report with timestamps."""
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Border, Side

    wb = Workbook()
    ws = wb.active
    hf_font = Font(bold=True, color="FFFFFF")
    border = Border(left=Side(style='thin'), right=Side(style='thin'), top=Side(style='thin'), bottom=Side(style='thin'))

    titles = {
        "income": "Income Report", "expense": "Expense Report", "cashflow": "Cash Flow Report",
        "loan": "Loan Report", "investment": "Investment Report", "networth": "Net Worth Report",
        "goal": "Goal Progress Report", "asset": "Asset Report", "insurance": "Insurance Report"
    }
    ws.title = titles.get(report_type, "Report")
    ws['A1'] = titles.get(report_type, "Financial Report")
    ws['A1'].font = Font(bold=True, size=14)
    ws['A2'] = f"Generated for: {user_name}"
    ws['A3'] = f"Period: {start_date.strftime('%d %b %Y')} - {end_date.strftime('%d %b %Y')}"
    row = 5

    def write_header(headers, color):
        nonlocal row
        fill = PatternFill(start_color=color, end_color=color, fill_type="solid")
        for col, h in enumerate(headers, 1):
            cell = ws.cell(row=row, column=col, value=h)
            cell.font = hf_font
            cell.fill = fill
            cell.border = border
        row += 1

    def write_row(values):
        nonlocal row
        for col, v in enumerate(values, 1):
            ws.cell(row=row, column=col, value=v).border = border
        row += 1

    def write_total(col_idx, val, label="Total"):
        ws.cell(row=row, column=1, value=label).font = Font(bold=True)
        ws.cell(row=row, column=col_idx, value=val).font = Font(bold=True)

    if report_type == "income" and (data.get("incomes") or data.get("other_incomes")):
        write_header(["Source", "Type", "Amount", "Frequency", "Date Added"], "10B981")
        total = 0
        for inc in data.get("incomes", []):
            amt = inc.get('expectedAmount', 0) or 0
            total += amt
            write_row([inc.get('name', 'N/A'), inc.get('type', 'N/A').title(), amt, inc.get('frequency', 'Monthly'), fmt_date(inc.get('createdAt') or inc.get('lastEntryDate'))])
        for oi in data.get("other_incomes", []):
            amt = oi.get('amount', 0) or 0
            total += amt
            cat = oi.get('customCategory') or oi.get('category', 'Other')
            write_row([oi.get('incomeName', 'N/A'), cat.title(), amt, oi.get('frequency', 'One-time'), fmt_date(oi.get('createdAt') or oi.get('dateReceived'))])
        write_total(3, total)

    elif report_type == "expense" and data.get("expenses"):
        write_header(["Expense", "Category", "Amount", "Frequency", "Date Added"], "EF4444")
        total = 0
        for exp in data["expenses"]:
            amt = exp.get('expectedAmount', 0) or 0
            total += amt
            write_row([exp.get('expenseName', 'N/A'), exp.get('category', 'N/A'), amt, exp.get('frequency', 'Monthly'), fmt_date(exp.get('createdAt') or exp.get('lastUpdated'))])
        write_total(3, total)

    elif report_type == "investment" and data.get("investments"):
        write_header(["Name", "Category", "Invested", "Current Value", "Gain/Loss", "Date Added"], "8B5CF6")
        ti, tc = 0, 0
        for inv in data["investments"]:
            invested = inv.get('principal', 0) or 0
            current = inv.get('currentValue', 0) or 0
            ti += invested
            tc += current
            write_row([inv.get('name', 'N/A'), inv.get('investmentCategory', 'N/A'), invested, current, current - invested, fmt_date(inv.get('createdAt') or inv.get('startDate'))])
        ws.cell(row=row, column=1, value="Total").font = Font(bold=True)
        ws.cell(row=row, column=3, value=ti).font = Font(bold=True)
        ws.cell(row=row, column=4, value=tc).font = Font(bold=True)
        ws.cell(row=row, column=5, value=tc - ti).font = Font(bold=True)

    elif report_type == "loan" and data.get("loans"):
        write_header(["Loan Name", "Type", "Outstanding", "EMI", "Interest Rate", "Date Added"], "F59E0B")
        total = 0
        for loan in data["loans"]:
            outstanding = loan.get('outstandingAmount', 0) or 0
            total += outstanding
            write_row([loan.get('loanName', 'N/A'), loan.get('loanType', 'N/A'), outstanding, loan.get('emiAmount', 0), f"{loan.get('interestRate', 0)}%", fmt_date(loan.get('createdAt') or loan.get('startDate'))])
        write_total(3, total, "Total Outstanding")

    elif report_type == "networth":
        total_assets = sum(a.get('currentValue', 0) or 0 for a in data.get("assets", []))
        total_investments = sum(i.get('currentValue', 0) or 0 for i in data.get("investments", []))
        liquid = sum(a.get('currentBalance', 0) or a.get('balance', 0) or 0 for a in data.get("accounts", []))
        total_loans = sum(ln.get('outstandingAmount', 0) or 0 for ln in data.get("loans", []))
        total_cc = sum(c.get('currentOutstanding', 0) or c.get('outstandingAmount', 0) or 0 for c in data.get("credit_cards", []))
        nw = total_assets + total_investments + liquid - total_loans - total_cc
        write_header(["Category", "Amount"], "3B82F6")
        for item, val in [("Total Assets", total_assets), ("Total Investments", total_investments), ("Liquid Balance", liquid), ("Loans Outstanding", -total_loans), ("Credit Card Due", -total_cc), ("Net Worth", nw)]:
            write_row([item, val])
        ws.cell(row=row-1, column=1).font = Font(bold=True)
        ws.cell(row=row-1, column=2).font = Font(bold=True)

    elif report_type == "goal" and data.get("goals"):
        write_header(["Goal", "Target", "Current", "Progress %", "Target Date", "Created"], "EC4899")
        for goal in data["goals"]:
            target = goal.get('targetAmount', 0) or 0
            current = goal.get('currentAmount', 0) or 0
            progress = (current / target * 100) if target > 0 else 0
            td = goal.get('targetDate', 'N/A')
            if isinstance(td, datetime):
                td = td.strftime('%d %b %Y')
            write_row([goal.get('goalName', 'N/A'), target, current, f"{progress:.0f}%", str(td)[:10] if td else '-', fmt_date(goal.get('createdAt'))])

    elif report_type == "asset" and data.get("assets"):
        write_header(["Asset Name", "Type", "Purchase Value", "Current Value", "Date Added"], "0EA5E9")
        total = 0
        for a in data["assets"]:
            cv = a.get('currentValue', 0) or 0
            total += cv
            write_row([a.get('name', a.get('assetName', 'N/A')), a.get('assetType', 'N/A'), a.get('purchaseValue', 0) or 0, cv, fmt_date(a.get('createdAt'))])
        write_total(4, total)

    elif report_type == "insurance" and data.get("insurances"):
        write_header(["Policy Name", "Type", "Premium", "Sum Assured", "Date Added"], "DC2626")
        for ins in data["insurances"]:
            write_row([ins.get('policyName', 'N/A'), ins.get('insuranceType', 'N/A'), ins.get('premiumAmount', 0) or 0, ins.get('sumAssured', 0) or 0, fmt_date(ins.get('createdAt'))])

    elif report_type == "cashflow":
        incomes = data.get("incomes", [])
        other_incomes = data.get("other_incomes", [])
        expenses = data.get("expenses", [])
        if incomes or other_incomes:
            write_header(["Source", "Type", "Amount", "Frequency", "Date Added"], "10B981")
            it = 0
            for inc in incomes:
                amt = inc.get('expectedAmount', 0) or 0
                it += amt
                write_row([inc.get('name', 'N/A'), inc.get('type', 'N/A').title(), amt, inc.get('frequency', 'Monthly'), fmt_date(inc.get('createdAt'))])
            for oi in other_incomes:
                amt = oi.get('amount', 0) or 0
                it += amt
                cat = oi.get('customCategory') or oi.get('category', 'Other')
                write_row([oi.get('incomeName', 'N/A'), cat.title(), amt, oi.get('frequency', 'One-time'), fmt_date(oi.get('createdAt') or oi.get('dateReceived'))])
            write_total(3, it, "Total Income")
            row += 2
        if expenses:
            write_header(["Expense", "Category", "Amount", "Frequency", "Date Added"], "EF4444")
            et = 0
            for exp in expenses:
                amt = exp.get('expectedAmount', 0) or 0
                et += amt
                write_row([exp.get('expenseName', 'N/A'), exp.get('category', 'N/A'), amt, exp.get('frequency', 'Monthly'), fmt_date(exp.get('createdAt'))])
            write_total(3, et, "Total Expenses")

    for col in ws.columns:
        max_len = 0
        column = col[0].column_letter
        for cell in col:
            try:
                if len(str(cell.value)) > max_len:
                    max_len = len(str(cell.value))
            except Exception:
                pass
        ws.column_dimensions[column].width = min(max_len + 2, 30)

    buffer = BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    filename = f"{report_type}_report_{datetime.now().strftime('%Y%m%d')}.xlsx"
    return StreamingResponse(buffer, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": f"attachment; filename={filename}"})
