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

    # Parse dates
    try:
        start_date = datetime.strptime(from_date, "%Y-%m-%d") if from_date else datetime.now(timezone.utc).replace(day=1)
        end_date = datetime.strptime(to_date, "%Y-%m-%d") if to_date else datetime.now(timezone.utc)
    except Exception:
        start_date = datetime.now(timezone.utc).replace(day=1)
        end_date = datetime.now(timezone.utc)

    # Fetch relevant data based on report type
    data = {}

    if report_type in ["income", "cashflow", "networth"]:
        data["incomes"] = await db.income_sources.find(user_filter, {"_id": 0}).to_list(1000)

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

    # Generate report
    if format == "excel":
        return await generate_excel_report(report_type, data, user_name, start_date, end_date)
    else:
        return await generate_pdf_report(report_type, data, user_name, start_date, end_date)


async def generate_pdf_report(report_type: str, data: dict, user_name: str, start_date: datetime, end_date: datetime):
    """Generate PDF report using ReportLab"""
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)
    elements = []
    styles = getSampleStyleSheet()

    # Title
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=18, spaceAfter=20)
    report_titles = {
        "income": "Income Report",
        "expense": "Expense Report",
        "cashflow": "Cash Flow Report",
        "loan": "Loan Report",
        "investment": "Investment Report",
        "networth": "Net Worth Report",
        "goal": "Goal Progress Report",
        "asset": "Asset Report",
        "insurance": "Insurance Report"
    }
    elements.append(Paragraph(report_titles.get(report_type, "Financial Report"), title_style))
    elements.append(Paragraph(f"Generated for: {user_name}", styles['Normal']))
    elements.append(Paragraph(f"Period: {start_date.strftime('%d %b %Y')} - {end_date.strftime('%d %b %Y')}", styles['Normal']))
    elements.append(Spacer(1, 20))

    if report_type == "income" and data.get("incomes"):
        elements.append(Paragraph("Income Sources", styles['Heading2']))
        table_data = [["Source", "Type", "Amount", "Frequency"]]
        total = 0
        for inc in data["incomes"]:
            amt = inc.get('expectedAmount', 0) or 0
            total += amt
            table_data.append([
                inc.get('name', 'N/A'),
                inc.get('type', 'N/A').title(),
                f"\u20b9{amt:,.0f}",
                inc.get('frequency', 'Monthly')
            ])
        table_data.append(["Total", "", f"\u20b9{total:,.0f}", ""])
        table = Table(table_data, colWidths=[2*inch, 1.2*inch, 1.2*inch, 1.2*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#10B981')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#D1FAE5')),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#E5E7EB'))
        ]))
        elements.append(table)

    elif report_type == "expense" and data.get("expenses"):
        elements.append(Paragraph("Expense Breakdown", styles['Heading2']))
        table_data = [["Expense", "Category", "Amount", "Frequency"]]
        total = 0
        for exp in data["expenses"]:
            amt = exp.get('expectedAmount', 0) or 0
            total += amt
            table_data.append([
                exp.get('expenseName', 'N/A'),
                exp.get('category', 'N/A'),
                f"\u20b9{amt:,.0f}",
                exp.get('frequency', 'Monthly')
            ])
        table_data.append(["Total", "", f"\u20b9{total:,.0f}", ""])
        table = Table(table_data, colWidths=[2*inch, 1.2*inch, 1.2*inch, 1.2*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#EF4444')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#FEE2E2')),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#E5E7EB'))
        ]))
        elements.append(table)

    elif report_type == "investment" and data.get("investments"):
        elements.append(Paragraph("Investment Portfolio", styles['Heading2']))
        table_data = [["Name", "Category", "Invested", "Current Value", "Gain/Loss"]]
        total_invested = 0
        total_current = 0
        for inv in data["investments"]:
            invested = inv.get('principal', 0) or 0
            current = inv.get('currentValue', 0) or 0
            gain = current - invested
            total_invested += invested
            total_current += current
            table_data.append([
                inv.get('name', 'N/A')[:20],
                inv.get('investmentCategory', 'N/A'),
                f"\u20b9{invested:,.0f}",
                f"\u20b9{current:,.0f}",
                f"\u20b9{gain:,.0f}"
            ])
        table_data.append(["Total", "", f"\u20b9{total_invested:,.0f}", f"\u20b9{total_current:,.0f}", f"\u20b9{total_current - total_invested:,.0f}"])
        table = Table(table_data, colWidths=[1.5*inch, 1*inch, 1*inch, 1.1*inch, 1*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#8B5CF6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#EDE9FE')),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#E5E7EB'))
        ]))
        elements.append(table)

    elif report_type == "loan" and data.get("loans"):
        elements.append(Paragraph("Loan Details", styles['Heading2']))
        table_data = [["Loan Name", "Type", "Outstanding", "EMI", "Interest Rate"]]
        total_outstanding = 0
        for loan in data["loans"]:
            outstanding = loan.get('outstandingAmount', 0) or 0
            total_outstanding += outstanding
            table_data.append([
                loan.get('loanName', 'N/A')[:20],
                loan.get('loanType', 'N/A'),
                f"\u20b9{outstanding:,.0f}",
                f"\u20b9{loan.get('emiAmount', 0):,.0f}",
                f"{loan.get('interestRate', 0)}%"
            ])
        table_data.append(["Total Outstanding", "", f"\u20b9{total_outstanding:,.0f}", "", ""])
        table = Table(table_data, colWidths=[1.4*inch, 1.1*inch, 1.1*inch, 1*inch, 1*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F59E0B')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#FEF3C7')),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#E5E7EB'))
        ]))
        elements.append(table)

    elif report_type == "cashflow":
        incomes = data.get("incomes", [])
        expenses = data.get("expenses", [])
        if incomes:
            elements.append(Paragraph("Income Sources", styles['Heading2']))
            inc_data = [["Source", "Type", "Amount", "Frequency"]]
            inc_total = 0
            for inc in incomes:
                amt = inc.get('expectedAmount', 0) or 0
                inc_total += amt
                inc_data.append([inc.get('name', 'N/A'), inc.get('type', 'N/A').title(), f"\u20b9{amt:,.0f}", inc.get('frequency', 'Monthly')])
            inc_data.append(["Total Income", "", f"\u20b9{inc_total:,.0f}", ""])
            table = Table(inc_data, colWidths=[2*inch, 1.2*inch, 1.2*inch, 1.2*inch])
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#10B981')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#D1FAE5')),
                ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
                ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#E5E7EB'))
            ]))
            elements.append(table)
            elements.append(Spacer(1, 15))

        if expenses:
            elements.append(Paragraph("Expenses", styles['Heading2']))
            exp_data = [["Expense", "Category", "Amount", "Frequency"]]
            exp_total = 0
            for exp in expenses:
                amt = exp.get('expectedAmount', 0) or 0
                exp_total += amt
                exp_data.append([exp.get('expenseName', 'N/A'), exp.get('category', 'N/A'), f"\u20b9{amt:,.0f}", exp.get('frequency', 'Monthly')])
            exp_data.append(["Total Expenses", "", f"\u20b9{exp_total:,.0f}", ""])
            table = Table(exp_data, colWidths=[2*inch, 1.2*inch, 1.2*inch, 1.2*inch])
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#EF4444')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#FEE2E2')),
                ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
                ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#E5E7EB'))
            ]))
            elements.append(table)

    elif report_type == "networth":
        total_assets = sum(a.get('currentValue', 0) or 0 for a in data.get("assets", []))
        total_investments = sum(i.get('currentValue', 0) or 0 for i in data.get("investments", []))
        liquid_balance = sum(a.get('currentBalance', 0) or a.get('balance', 0) or 0 for a in data.get("accounts", []))
        total_loans = sum(ln.get('outstandingAmount', 0) or 0 for ln in data.get("loans", []))
        total_cc = sum(c.get('currentOutstanding', 0) or c.get('outstandingAmount', 0) or 0 for c in data.get("credit_cards", []))
        total_liabilities = total_loans + total_cc
        net_worth = total_assets + total_investments + liquid_balance - total_liabilities

        elements.append(Paragraph("Net Worth Summary", styles['Heading2']))
        summary_data = [
            ["Category", "Amount"],
            ["Total Assets", f"\u20b9{total_assets:,.0f}"],
            ["Total Investments", f"\u20b9{total_investments:,.0f}"],
            ["Liquid Balance (Bank)", f"\u20b9{liquid_balance:,.0f}"],
            ["Total Liabilities", f"\u20b9{total_liabilities:,.0f}"],
            ["Net Worth", f"\u20b9{net_worth:,.0f}"]
        ]
        table = Table(summary_data, colWidths=[3*inch, 2*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3B82F6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#DBEAFE')),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#E5E7EB'))
        ]))
        elements.append(table)

    elif report_type == "goal" and data.get("goals"):
        elements.append(Paragraph("Financial Goals Progress", styles['Heading2']))
        table_data = [["Goal", "Target", "Current", "Progress", "Target Date"]]
        for goal in data["goals"]:
            target = goal.get('targetAmount', 0) or 0
            current = goal.get('currentAmount', 0) or 0
            progress = (current / target * 100) if target > 0 else 0
            target_date = goal.get('targetDate', 'N/A')
            if isinstance(target_date, datetime):
                target_date = target_date.strftime('%d %b %Y')
            table_data.append([
                goal.get('goalName', 'N/A')[:20],
                f"\u20b9{target:,.0f}",
                f"\u20b9{current:,.0f}",
                f"{progress:.0f}%",
                target_date[:10] if target_date else 'N/A'
            ])
        table = Table(table_data, colWidths=[1.5*inch, 1*inch, 1*inch, 0.8*inch, 1.2*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#EC4899')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#E5E7EB'))
        ]))
        elements.append(table)

    elif report_type == "asset" and data.get("assets"):
        elements.append(Paragraph("Asset Report", styles['Heading2']))
        table_data = [["Asset Name", "Type", "Purchase Value", "Current Value"]]
        total = 0
        for a in data["assets"]:
            cv = a.get('currentValue', 0) or 0
            total += cv
            table_data.append([
                a.get('name', a.get('assetName', 'N/A'))[:20],
                a.get('assetType', 'N/A'),
                f"\u20b9{a.get('purchaseValue', 0) or 0:,.0f}",
                f"\u20b9{cv:,.0f}"
            ])
        table_data.append(["Total", "", "", f"\u20b9{total:,.0f}"])
        table = Table(table_data, colWidths=[2*inch, 1.2*inch, 1.2*inch, 1.2*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0EA5E9')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#E0F2FE')),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#E5E7EB'))
        ]))
        elements.append(table)

    elif report_type == "insurance" and data.get("insurances"):
        elements.append(Paragraph("Insurance Report", styles['Heading2']))
        table_data = [["Policy Name", "Type", "Premium", "Sum Assured"]]
        for ins in data["insurances"]:
            table_data.append([
                ins.get('policyName', 'N/A')[:20],
                ins.get('insuranceType', 'N/A'),
                f"\u20b9{ins.get('premiumAmount', 0) or 0:,.0f}",
                f"\u20b9{ins.get('sumAssured', 0) or 0:,.0f}"
            ])
        table = Table(table_data, colWidths=[2*inch, 1.2*inch, 1.2*inch, 1.2*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#DC2626')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#E5E7EB'))
        ]))
        elements.append(table)

    else:
        elements.append(Paragraph("No data available for this report type.", styles['Normal']))

    # Build PDF
    doc.build(elements)
    buffer.seek(0)

    filename = f"{report_type}_report_{datetime.now().strftime('%Y%m%d')}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


async def generate_excel_report(report_type: str, data: dict, user_name: str, start_date: datetime, end_date: datetime):
    """Generate Excel report using openpyxl"""
    from openpyxl import Workbook
    from openpyxl.styles import Font, Alignment, PatternFill, Border, Side

    wb = Workbook()
    ws = wb.active

    header_font = Font(bold=True, color="FFFFFF")
    border = Border(
        left=Side(style='thin'), right=Side(style='thin'),
        top=Side(style='thin'), bottom=Side(style='thin')
    )

    report_titles = {
        "income": "Income Report", "expense": "Expense Report",
        "cashflow": "Cash Flow Report", "loan": "Loan Report",
        "investment": "Investment Report", "networth": "Net Worth Report",
        "goal": "Goal Progress Report", "asset": "Asset Report",
        "insurance": "Insurance Report"
    }

    ws.title = report_titles.get(report_type, "Report")
    ws['A1'] = report_titles.get(report_type, "Financial Report")
    ws['A1'].font = Font(bold=True, size=14)
    ws['A2'] = f"Generated for: {user_name}"
    ws['A3'] = f"Period: {start_date.strftime('%d %b %Y')} - {end_date.strftime('%d %b %Y')}"

    row = 5

    def write_header(headers, fill_color):
        nonlocal row
        hf = PatternFill(start_color=fill_color, end_color=fill_color, fill_type="solid")
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=row, column=col, value=header)
            cell.font = header_font
            cell.fill = hf
            cell.border = border
        row += 1

    if report_type == "income" and data.get("incomes"):
        write_header(["Source", "Type", "Amount", "Frequency"], "10B981")
        total = 0
        for inc in data["incomes"]:
            amt = inc.get('expectedAmount', 0) or 0
            total += amt
            ws.cell(row=row, column=1, value=inc.get('name', 'N/A')).border = border
            ws.cell(row=row, column=2, value=inc.get('type', 'N/A').title()).border = border
            ws.cell(row=row, column=3, value=amt).border = border
            ws.cell(row=row, column=4, value=inc.get('frequency', 'Monthly')).border = border
            row += 1
        ws.cell(row=row, column=1, value="Total").font = Font(bold=True)
        ws.cell(row=row, column=3, value=total).font = Font(bold=True)

    elif report_type == "expense" and data.get("expenses"):
        write_header(["Expense", "Category", "Amount", "Frequency"], "EF4444")
        total = 0
        for exp in data["expenses"]:
            amt = exp.get('expectedAmount', 0) or 0
            total += amt
            ws.cell(row=row, column=1, value=exp.get('expenseName', 'N/A')).border = border
            ws.cell(row=row, column=2, value=exp.get('category', 'N/A')).border = border
            ws.cell(row=row, column=3, value=amt).border = border
            ws.cell(row=row, column=4, value=exp.get('frequency', 'Monthly')).border = border
            row += 1
        ws.cell(row=row, column=1, value="Total").font = Font(bold=True)
        ws.cell(row=row, column=3, value=total).font = Font(bold=True)

    elif report_type == "investment" and data.get("investments"):
        write_header(["Name", "Category", "Invested", "Current Value", "Gain/Loss"], "8B5CF6")
        total_invested = 0
        total_current = 0
        for inv in data["investments"]:
            invested = inv.get('principal', 0) or 0
            current = inv.get('currentValue', 0) or 0
            total_invested += invested
            total_current += current
            ws.cell(row=row, column=1, value=inv.get('name', 'N/A')).border = border
            ws.cell(row=row, column=2, value=inv.get('investmentCategory', 'N/A')).border = border
            ws.cell(row=row, column=3, value=invested).border = border
            ws.cell(row=row, column=4, value=current).border = border
            ws.cell(row=row, column=5, value=current - invested).border = border
            row += 1
        ws.cell(row=row, column=1, value="Total").font = Font(bold=True)
        ws.cell(row=row, column=3, value=total_invested).font = Font(bold=True)
        ws.cell(row=row, column=4, value=total_current).font = Font(bold=True)
        ws.cell(row=row, column=5, value=total_current - total_invested).font = Font(bold=True)

    elif report_type == "loan" and data.get("loans"):
        write_header(["Loan Name", "Type", "Outstanding", "EMI", "Interest Rate"], "F59E0B")
        total = 0
        for loan in data["loans"]:
            outstanding = loan.get('outstandingAmount', 0) or 0
            total += outstanding
            ws.cell(row=row, column=1, value=loan.get('loanName', 'N/A')).border = border
            ws.cell(row=row, column=2, value=loan.get('loanType', 'N/A')).border = border
            ws.cell(row=row, column=3, value=outstanding).border = border
            ws.cell(row=row, column=4, value=loan.get('emiAmount', 0)).border = border
            ws.cell(row=row, column=5, value=f"{loan.get('interestRate', 0)}%").border = border
            row += 1
        ws.cell(row=row, column=1, value="Total Outstanding").font = Font(bold=True)
        ws.cell(row=row, column=3, value=total).font = Font(bold=True)

    elif report_type == "networth":
        total_assets = sum(a.get('currentValue', 0) or 0 for a in data.get("assets", []))
        total_investments = sum(i.get('currentValue', 0) or 0 for i in data.get("investments", []))
        liquid_balance = sum(a.get('currentBalance', 0) or a.get('balance', 0) or 0 for a in data.get("accounts", []))
        total_loans = sum(ln.get('outstandingAmount', 0) or 0 for ln in data.get("loans", []))
        total_cc = sum(c.get('currentOutstanding', 0) or c.get('outstandingAmount', 0) or 0 for c in data.get("credit_cards", []))
        net_worth = total_assets + total_investments + liquid_balance - total_loans - total_cc
        write_header(["Category", "Amount"], "3B82F6")
        items = [
            ("Total Assets", total_assets), ("Total Investments", total_investments),
            ("Liquid Balance", liquid_balance), ("Loans Outstanding", -total_loans),
            ("Credit Card Due", -total_cc), ("Net Worth", net_worth)
        ]
        for item, value in items:
            ws.cell(row=row, column=1, value=item).border = border
            ws.cell(row=row, column=2, value=value).border = border
            row += 1
        ws.cell(row=row-1, column=1).font = Font(bold=True)
        ws.cell(row=row-1, column=2).font = Font(bold=True)

    elif report_type == "goal" and data.get("goals"):
        write_header(["Goal", "Target", "Current", "Progress %", "Target Date"], "EC4899")
        for goal in data["goals"]:
            target = goal.get('targetAmount', 0) or 0
            current = goal.get('currentAmount', 0) or 0
            progress = (current / target * 100) if target > 0 else 0
            target_date = goal.get('targetDate', 'N/A')
            if isinstance(target_date, datetime):
                target_date = target_date.strftime('%d %b %Y')
            ws.cell(row=row, column=1, value=goal.get('goalName', 'N/A')).border = border
            ws.cell(row=row, column=2, value=target).border = border
            ws.cell(row=row, column=3, value=current).border = border
            ws.cell(row=row, column=4, value=f"{progress:.0f}%").border = border
            ws.cell(row=row, column=5, value=str(target_date)[:10] if target_date else 'N/A').border = border
            row += 1

    elif report_type == "asset" and data.get("assets"):
        write_header(["Asset Name", "Type", "Purchase Value", "Current Value"], "0EA5E9")
        total = 0
        for a in data["assets"]:
            cv = a.get('currentValue', 0) or 0
            total += cv
            ws.cell(row=row, column=1, value=a.get('name', a.get('assetName', 'N/A'))).border = border
            ws.cell(row=row, column=2, value=a.get('assetType', 'N/A')).border = border
            ws.cell(row=row, column=3, value=a.get('purchaseValue', 0) or 0).border = border
            ws.cell(row=row, column=4, value=cv).border = border
            row += 1
        ws.cell(row=row, column=1, value="Total").font = Font(bold=True)
        ws.cell(row=row, column=4, value=total).font = Font(bold=True)

    elif report_type == "insurance" and data.get("insurances"):
        write_header(["Policy Name", "Type", "Premium", "Sum Assured"], "DC2626")
        for ins in data["insurances"]:
            ws.cell(row=row, column=1, value=ins.get('policyName', 'N/A')).border = border
            ws.cell(row=row, column=2, value=ins.get('insuranceType', 'N/A')).border = border
            ws.cell(row=row, column=3, value=ins.get('premiumAmount', 0) or 0).border = border
            ws.cell(row=row, column=4, value=ins.get('sumAssured', 0) or 0).border = border
            row += 1

    elif report_type == "cashflow":
        incomes = data.get("incomes", [])
        expenses = data.get("expenses", [])
        if incomes:
            write_header(["Source", "Type", "Amount", "Frequency"], "10B981")
            inc_total = 0
            for inc in incomes:
                amt = inc.get('expectedAmount', 0) or 0
                inc_total += amt
                ws.cell(row=row, column=1, value=inc.get('name', 'N/A')).border = border
                ws.cell(row=row, column=2, value=inc.get('type', 'N/A').title()).border = border
                ws.cell(row=row, column=3, value=amt).border = border
                ws.cell(row=row, column=4, value=inc.get('frequency', 'Monthly')).border = border
                row += 1
            ws.cell(row=row, column=1, value="Total Income").font = Font(bold=True)
            ws.cell(row=row, column=3, value=inc_total).font = Font(bold=True)
            row += 2
        if expenses:
            write_header(["Expense", "Category", "Amount", "Frequency"], "EF4444")
            exp_total = 0
            for exp in expenses:
                amt = exp.get('expectedAmount', 0) or 0
                exp_total += amt
                ws.cell(row=row, column=1, value=exp.get('expenseName', 'N/A')).border = border
                ws.cell(row=row, column=2, value=exp.get('category', 'N/A')).border = border
                ws.cell(row=row, column=3, value=amt).border = border
                ws.cell(row=row, column=4, value=exp.get('frequency', 'Monthly')).border = border
                row += 1
            ws.cell(row=row, column=1, value="Total Expenses").font = Font(bold=True)
            ws.cell(row=row, column=3, value=exp_total).font = Font(bold=True)

    # Auto-adjust column widths
    for col in ws.columns:
        max_length = 0
        column = col[0].column_letter
        for cell in col:
            try:
                if len(str(cell.value)) > max_length:
                    max_length = len(str(cell.value))
            except Exception:
                pass
        ws.column_dimensions[column].width = min(max_length + 2, 30)

    buffer = BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    filename = f"{report_type}_report_{datetime.now().strftime('%Y%m%d')}.xlsx"
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
