# Income Tracker Application - Product Requirements Document

## Original Problem Statement
Build an income tracking application with modular income type support. Initial focus on "Business Income" and "Job Income" modules with full CRUD functionality.

## User Personas
- Users who need to track multiple income sources
- Individuals managing business and employment income
- People who need to monitor recurring payment schedules

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
  - Fields: Company Name (replaces Business Name), Expected Amount, Frequency
  - Dynamic fields based on frequency selection:
    - Daily: No additional fields
    - Weekly: Day selector
    - Monthly: Date picker
    - Quarterly: Quarter → Month → Date cascade
    - Half-Yearly: Half → Month → Date cascade
    - Yearly: Month → Date selectors
    - Others: Custom frequency text + date
  - Full CRUD operations with confirmation dialogs
  - Duplicate entry check

### Frequency Options
All modules support: Daily, Weekly, Monthly, Quarterly, Half-Yearly, Yearly, Others

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
  "type": "Business|Job",
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
  "createdAt": "ISO datetime string"
}
```

## Testing Status
- Backend API: 100% pass (12/12 tests)
- Frontend UI: 100% pass (12/12 tests)
- Test file: `/app/backend/tests/test_job_income_api.py`
- Report: `/app/test_reports/iteration_1.json`

## Backlog / Future Tasks

### P1 - High Priority
- None currently

### P2 - Medium Priority
- Refactor Business/Job components into single reusable component
- Add Rental, Commission, Interest, Dividend income modules
- Dashboard/Summary view of all income sources

### P3 - Low Priority
- Data export functionality
- Income analytics/charts
- Mobile app version

## Known Issues
None currently.

## Changelog
- **Feb 12, 2026**: Completed Job Income module implementation and testing
- Initial: Project setup with Business Income module
