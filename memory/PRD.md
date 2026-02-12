# Income Tracker Application - Product Requirements Document

## Original Problem Statement
Build an income tracking application with modular income type support. Initial focus on "Business Income", "Job Income", and "Interest Income" modules with full CRUD functionality.

## User Personas
- Users who need to track multiple income sources
- Individuals managing business and employment income
- People who need to monitor recurring payment schedules
- Investors tracking interest income from FDs, loans, P2P lending

## Core Requirements

### Implemented Features

#### Income Type Selection (Home Page)
- Grid of income type cards: Business, Job, Rental, Commission, Interest, Dividend, Other
- Navigation to respective module pages on card click
- Clean, responsive UI with honeycomb background

#### Business Income Module (COMPLETED)
- **My Business Page** (`/my-business`)
  - List all business income entries
  - Display: Business Name, Expected Amount (₹), Frequency, Next Payment Date
  - Empty state with "Add New Business" CTA
  - Click card to edit entry
  
- **Business Income Form** (`/business-income`, `/business-income/:id`)
  - Fields: Business Name, Expected Amount, Frequency
  - Dynamic fields based on frequency selection
  - Full CRUD operations with confirmation dialogs
  - Duplicate entry check

#### Job Income Module (COMPLETED - Feb 12, 2026)
- **My Job Page** (`/my-job`)
  - List all job income entries filtered by type="Job"
  - Display: Company Name, Expected Amount (₹), Frequency, Next Payment Date
  - Empty state with "Add New Job" CTA
  - Click card to edit entry
  
- **Job Income Form** (`/job-income`, `/job-income/:id`)
  - Fields: Company Name, Expected Amount, Frequency
  - Dynamic fields based on frequency selection
  - Full CRUD operations with confirmation dialogs
  - Duplicate entry check

#### Interest Income Module (COMPLETED - Feb 12, 2026)
- **My Interest Income Page** (`/my-interest`)
  - List all interest income entries filtered by type="Interest"
  - Display: Source Name, Principal (₹), Rate (%), Current Amount, End Date, Frequency, Next Payment
  - **Current Amount** highlighted box showing Principal + Interest earned
  - **Matured Badge** (yellow) for entries past end date
  - Empty state with "Add New Interest Income" CTA
  - Click card to edit entry
  
- **Interest Income Form** (`/interest-income`, `/interest-income/:id`)
  - Fields:
    - Interest Source Name (required)
    - Principal Amount (required)
    - Rate of Interest % (required)
    - **Start Date** (required, can be past date - when loan/FD started)
    - **End Date / Maturity** (required, must be after start date)
    - Interest Type: Simple Interest / Compound Interest
    - Compounding Frequency: Monthly/Quarterly/Half-Yearly/Yearly (only for Compound)
    - Income Frequency: Monthly/Quarterly/Half-Yearly/Yearly/Others
    - Date fields based on frequency selection
    - Expected Income (auto-calculated with manual override toggle)
  - **Current Amount Display**: Shows Principal + Accrued Interest
    - Calculates from Start Date to min(today, End Date)
    - Shows "Matured on [date]" when past end date
    - Interest stops accruing after maturity
  - Auto-calculation formula:
    - Simple Interest: P × R × T / 100 (where T is years from start to calc date)
    - Compound Interest: P × (1 + R/(100×n))^(n×T) - P
  - Manual Override toggle allows custom expected income entry
  - Full CRUD operations with confirmation dialogs
  - Duplicate entry check

#### Rental Income Module (UPDATED - Feb 12, 2026)
- **My Rental Page** (`/my-rental`)
  - List all rental income entries filtered by type="Rental"
  - Display: Property Name, Tenant Name (if set), Amount (₹), **Rental Yield % badge**, Frequency, Due Date, Next Due, Security Deposit
  - **Rental Yield badge** shows yield % when linked to asset
  - Linked Asset info displayed on cards
  - Empty state with "Add New Rental" CTA
  - Click card to edit entry
  
- **Rental Income Form** (`/rental-income`, `/rental-income/:id`)
  - **Link to Asset** dropdown (optional - enables Rental Yield calculation)
  - Property Name (auto-fills from selected asset)
  - Tenant Name (optional)
  - **Rental Amount & Security Deposit** side by side
  - Frequency: Monthly/Quarterly/Half-Yearly/Yearly/Others
  - Conditional date fields based on frequency
  - **Rental Yield Display** (dark box) when asset linked
  - Full CRUD operations with confirmation dialogs
  - Duplicate property check

#### Loan/Liability Module (NEW - Feb 12, 2026)
- **My Loans Page** (`/my-loans`)
  - List all loans with payment progress
  - **Total Outstanding summary** card (yellow/amber theme)
  - Display: Loan Name, Lender, Outstanding Amount, EMI, Rate, Start Date
  - **Progress bar** showing repayment progress (%)
  - Empty state with "Add New Loan" CTA
  
- **Loan Form** (`/loan`, `/loan/:id`)
  - Loan Name (required)
  - Lender Name (optional)
  - Principal Amount (required)
  - Interest Rate % (required)
  - Tenure in Months (required)
  - **EMI Auto-Calculation** (displayed in dark box when all inputs provided)
  - Start Date (required)
  - Outstanding Amount (required)
  - Full CRUD operations with confirmation dialogs

#### Asset Module (NEW - Feb 12, 2026)
- **My Assets Page** (`/my-assets`)
  - List all assets with type icons
  - **Summary cards**: Total Asset Value, Net Worth (after loan deduction)
  - **Asset Allocation** breakdown by type (%)
  - Display: Asset Type badge, Name, Value, Loan Outstanding (if financed), Net Value, Appreciation %
  - Empty state with "Add New Asset" CTA
  - Click card to edit entry
  
- **Asset Form** (`/asset`, `/asset/:id`)
  - Asset Type dropdown: Residential Property, Commercial Property, Land, Vehicle, Equipment, Other
  - Asset Name (required)
  - Current Market Value (required)
  - **Purchase Information** (optional) - Date and Value
  - **Appreciation %** calculated when purchase info provided
  - **Is Financed toggle** - shows loan dropdown when enabled
  - Linked Loan dropdown (lists available loans)
  - "Add New Loan" quick link
  - Full CRUD operations with confirmation dialogs

### Frequency Options
All modules support: Monthly, Quarterly, Half-Yearly, Yearly, Others
Business/Job also support: Daily, Weekly

### Next Payment Date Calculation
- Daily: Current date
- Weekly: Next occurrence of selected day
- Monthly: Same day next month (or current if not passed)
- Quarterly: Next quarter date in cycle
- Half-Yearly: 6 months from selected date
- Yearly: Same date next year
- Others: Custom date as provided

## Technical Architecture

### Frontend (React)
- `/app/frontend/src/App.js` - Main router with all routes
- `/app/frontend/src/BusinessIncome.js` - Business income form
- `/app/frontend/src/MyBusiness.js` - Business list page
- `/app/frontend/src/JobIncome.js` - Job income form
- `/app/frontend/src/MyJob.js` - Job list page
- `/app/frontend/src/InterestIncome.js` - Interest income form with auto-calculation
- `/app/frontend/src/MyInterest.js` - Interest list page

### Backend (FastAPI)
- `/app/backend/server.py` - All API endpoints
- MongoDB collection: `income_sources`

### API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/income | Create income entry |
| GET | /api/income | List all income entries |
| GET | /api/income/{id} | Get single entry |
| PUT | /api/income/{id} | Update entry |
| DELETE | /api/income/{id} | Delete entry |

### Database Schema (income_sources collection)
```json
{
  "id": "uuid string",
  "type": "Business|Job|Interest|Rental",
  "name": "string",
  "expectedAmount": "number",
  "frequency": "string",
  "selectedDay": "string|null",
  "selectedDate": "string|null",
  "selectedQuarter": "string|null",
  "selectedHalf": "string|null",
  "selectedMonth": "string|null",
  "customFrequency": "string|null",
  "customDate": "string|null",
  "principal": "number|null (Interest only)",
  "rate": "number|null (Interest only)",
  "interestType": "string|null (Interest only)",
  "compoundingFrequency": "string|null (Interest only)",
  "manualOverride": "boolean|null (Interest only)",
  "startDate": "string|null (Interest only - loan/FD start)",
  "endDate": "string|null (Interest only - maturity date)",
  "currentAmount": "number|null (Interest only - auto-calculated)",
  "tenantName": "string|null (Rental only)",
  "createdAt": "ISO datetime string"
}
```

## Testing Status
- Job Module: Backend 100%, Frontend 100% (iteration_1.json)
- Interest Module: Backend 100%, Frontend 100% (iteration_2.json)
- Test files: `/app/backend/tests/`

## Backlog / Future Tasks

### P1 - High Priority
- None currently

### P2 - Medium Priority
- Add Commission and Dividend income modules
- Refactor all income components into single reusable component
- Dashboard/Summary view of all income sources

### P3 - Low Priority
- Data export functionality
- Income analytics/charts
- Mobile app version

## Known Issues
None currently.

## Changelog
- **Feb 12, 2026**: Added Rental Income module with 3 pages (My Rental, Rental Income form, Edit/Delete)
  - Property Name, Tenant Name (optional), Rental Amount, Frequency, Date fields
  - Full CRUD with confirmation dialogs
- **Feb 12, 2026**: Added Start Date, End Date, and Current Amount to Interest Income module
  - Start Date: Can be past date (when loan/FD started)
  - End Date: Maturity date (interest stops calculating after this)
  - Current Amount: Auto-calculated Principal + Accrued Interest
  - Matured badge for entries past end date
- **Feb 12, 2026**: Completed Interest Income module with auto-calculation and manual override
- **Feb 12, 2026**: Completed Job Income module implementation and testing
- Initial: Project setup with Business Income module
