"""Reports routes - PDF/Excel report generation."""
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone
from typing import Optional
import io

router = APIRouter(prefix="/reports", tags=["reports"])

# Import shared dependencies
import sys
sys.path.insert(0, '/app/backend')
from database import db
from routes.auth import get_current_user


def format_indian_amount(amount):
    """Format amount in Indian number system"""
    if not amount:
        return "0"
    amount = float(amount)
    if amount >= 10000000:
        return f"₹{amount/10000000:.2f} Cr"
    elif amount >= 100000:
        return f"₹{amount/100000:.2f} L"
    elif amount >= 1000:
        return f"₹{amount/1000:.1f}K"
    return f"₹{amount:.0f}"


@router.get("/generate/{report_type}")
async def generate_report(
    report_type: str,
    request: Request,
    format: str = "pdf",
    from_date: Optional[str] = None,
    to_date: Optional[str] = None
):
    """Generate and download report in PDF or Excel format"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_id = user.get('user_id')
    user_filter = {"userId": user_id}
    
    # Date range filter
    date_filter = {}
    if from_date:
        date_filter["$gte"] = from_date
    if to_date:
        date_filter["$lte"] = to_date
    
    # Fetch data based on report type
    if report_type == "income":
        data = await db.income_sources.find(user_filter, {"_id": 0}).to_list(1000)
        title = "Income Report"
        columns = ["Source Name", "Category", "Amount", "Frequency"]
        rows = [[d.get('sourceName', ''), d.get('category', ''), format_indian_amount(d.get('expectedAmount', 0)), d.get('frequency', '')] for d in data]
    elif report_type == "expense":
        data = await db.expenses.find(user_filter, {"_id": 0}).to_list(1000)
        title = "Expense Report"
        columns = ["Expense Name", "Category", "Amount", "Frequency"]
        rows = [[d.get('expenseName', ''), d.get('category', ''), format_indian_amount(d.get('expectedAmount', 0)), d.get('frequency', '')] for d in data]
    elif report_type == "cashflow":
        incomes = await db.income_sources.find(user_filter, {"_id": 0}).to_list(1000)
        expenses = await db.expenses.find(user_filter, {"_id": 0}).to_list(1000)
        title = "Cash Flow Report"
        columns = ["Type", "Name", "Category", "Amount", "Frequency"]
        rows = []
        for d in incomes:
            rows.append(["Income", d.get('sourceName', ''), d.get('category', ''), format_indian_amount(d.get('expectedAmount', 0)), d.get('frequency', '')])
        for d in expenses:
            rows.append(["Expense", d.get('expenseName', ''), d.get('category', ''), format_indian_amount(d.get('expectedAmount', 0)), d.get('frequency', '')])
        data = incomes + expenses
    elif report_type == "investment":
        data = await db.investments.find(user_filter, {"_id": 0}).to_list(1000)
        title = "Investment Report"
        columns = ["Name", "Category", "Invested", "Current Value", "Returns"]
        rows = []
        for d in data:
            invested = d.get('amountInvested', 0)
            current = d.get('currentValue', 0)
            returns = current - invested
            rows.append([d.get('investmentName', ''), d.get('category', ''), format_indian_amount(invested), format_indian_amount(current), format_indian_amount(returns)])
    elif report_type == "networth":
        import asyncio
        assets, investments, accounts, loans, credit_cards = await asyncio.gather(
            db.assets.find(user_filter, {"_id": 0}).to_list(1000),
            db.investments.find(user_filter, {"_id": 0}).to_list(1000),
            db.accounts.find(user_filter, {"_id": 0}).to_list(1000),
            db.loans.find(user_filter, {"_id": 0}).to_list(1000),
            db.credit_cards.find(user_filter, {"_id": 0}).to_list(1000)
        )
        title = "Net Worth Report"
        columns = ["Category", "Item", "Value"]
        rows = []
        for a in assets:
            rows.append(["Asset", a.get('assetName', ''), format_indian_amount(a.get('currentValue', 0))])
        for i in investments:
            rows.append(["Investment", i.get('investmentName', ''), format_indian_amount(i.get('currentValue', 0))])
        for acc in accounts:
            rows.append(["Account", acc.get('accountName', ''), format_indian_amount(acc.get('currentBalance', 0))])
        for l in loans:
            rows.append(["Loan", l.get('loanName', ''), f"-{format_indian_amount(l.get('outstandingAmount', 0))}"])
        for c in credit_cards:
            rows.append(["Credit Card", c.get('cardName', ''), f"-{format_indian_amount(c.get('currentOutstanding', 0))}"])
        data = assets + investments + accounts + loans + credit_cards
    elif report_type == "goal":
        data = await db.goals.find(user_filter, {"_id": 0}).to_list(1000)
        title = "Goals Report"
        columns = ["Goal Name", "Target", "Current", "Progress %", "Target Date"]
        rows = []
        for d in data:
            target = d.get('targetAmount', 0)
            current = d.get('currentAmount', 0)
            progress = (current / target * 100) if target > 0 else 0
            rows.append([d.get('goalName', ''), format_indian_amount(target), format_indian_amount(current), f"{progress:.1f}%", d.get('targetDate', '')])
    elif report_type == "loan":
        data = await db.loans.find(user_filter, {"_id": 0}).to_list(1000)
        title = "Loan Report"
        columns = ["Loan Name", "Type", "Principal", "Outstanding", "EMI", "Interest Rate"]
        rows = []
        for d in data:
            rows.append([d.get('loanName', ''), d.get('loanType', ''), format_indian_amount(d.get('principalAmount', 0)), format_indian_amount(d.get('outstandingAmount', 0)), format_indian_amount(d.get('emiAmount', 0)), f"{d.get('interestRate', 0)}%"])
    elif report_type == "asset":
        data = await db.assets.find(user_filter, {"_id": 0}).to_list(1000)
        title = "Asset Report"
        columns = ["Asset Name", "Type", "Purchase Value", "Current Value", "Location"]
        rows = []
        for d in data:
            rows.append([d.get('assetName', ''), d.get('assetType', ''), format_indian_amount(d.get('purchaseValue', 0)), format_indian_amount(d.get('currentValue', 0)), d.get('location', '')])
    else:
        raise HTTPException(status_code=400, detail=f"Unknown report type: {report_type}")
    
    # Generate report
    if format == "excel":
        return await generate_excel_report(title, columns, rows, report_type)
    else:
        return await generate_pdf_report(title, columns, rows, report_type, user.get('name', 'User'))


async def generate_pdf_report(title: str, columns: list, rows: list, report_type: str, user_name: str):
    """Generate PDF report"""
    from fpdf import FPDF
    
    pdf = FPDF()
    pdf.add_page()
    
    # Title
    pdf.set_font("Arial", "B", 16)
    pdf.cell(0, 10, title, ln=True, align="C")
    
    # Metadata
    pdf.set_font("Arial", "", 10)
    pdf.cell(0, 8, f"Generated for: {user_name}", ln=True)
    pdf.cell(0, 8, f"Date: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}", ln=True)
    pdf.ln(5)
    
    # Table header
    pdf.set_font("Arial", "B", 10)
    col_width = 190 / len(columns)
    for col in columns:
        pdf.cell(col_width, 10, col[:20], 1, 0, "C")
    pdf.ln()
    
    # Table rows
    pdf.set_font("Arial", "", 9)
    for row in rows[:50]:  # Limit to 50 rows for PDF
        for cell in row:
            pdf.cell(col_width, 8, str(cell)[:25], 1, 0, "L")
        pdf.ln()
    
    if len(rows) > 50:
        pdf.ln(5)
        pdf.set_font("Arial", "I", 9)
        pdf.cell(0, 8, f"... and {len(rows) - 50} more rows. Download Excel for complete data.", ln=True)
    
    # Summary
    pdf.ln(10)
    pdf.set_font("Arial", "B", 11)
    pdf.cell(0, 10, f"Total Items: {len(rows)}", ln=True)
    
    # Output
    pdf_output = io.BytesIO()
    pdf_output.write(pdf.output(dest='S').encode('latin-1'))
    pdf_output.seek(0)
    
    filename = f"{report_type}_report_{datetime.now().strftime('%Y%m%d')}.pdf"
    return StreamingResponse(
        pdf_output,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


async def generate_excel_report(title: str, columns: list, rows: list, report_type: str):
    """Generate Excel report"""
    try:
        import openpyxl
        from openpyxl.styles import Font, PatternFill, Alignment
    except ImportError:
        raise HTTPException(status_code=500, detail="Excel generation not available")
    
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = title[:31]  # Excel sheet name limit
    
    # Title
    ws.merge_cells('A1:E1')
    ws['A1'] = title
    ws['A1'].font = Font(bold=True, size=14)
    ws['A1'].alignment = Alignment(horizontal='center')
    
    # Metadata
    ws['A2'] = f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}"
    ws['A2'].font = Font(italic=True, size=10)
    
    # Headers
    header_fill = PatternFill(start_color="4A90D9", end_color="4A90D9", fill_type="solid")
    for col_idx, col_name in enumerate(columns, 1):
        cell = ws.cell(row=4, column=col_idx, value=col_name)
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal='center')
    
    # Data rows
    for row_idx, row_data in enumerate(rows, 5):
        for col_idx, cell_value in enumerate(row_data, 1):
            ws.cell(row=row_idx, column=col_idx, value=cell_value)
    
    # Auto-adjust column widths
    for col_idx in range(1, len(columns) + 1):
        ws.column_dimensions[openpyxl.utils.get_column_letter(col_idx)].width = 18
    
    # Output
    excel_output = io.BytesIO()
    wb.save(excel_output)
    excel_output.seek(0)
    
    filename = f"{report_type}_report_{datetime.now().strftime('%Y%m%d')}.xlsx"
    return StreamingResponse(
        excel_output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
