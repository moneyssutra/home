# Moneyssutra - Future Roadmap & Architecture Plan

## Current State (As of Feb 15, 2026)
- User-based data model (all data tied directly to user)
- Email/Password + Google OAuth authentication
- Single user per account
- Basic session-based auth with cookies

---

## PHASE 1: LOGIN ARCHITECTURE (MVP)

### 1.1 Mobile OTP Login (Priority: HIGH)
**Recommended for India market**

```
Flow:
User enters Mobile Number
→ Send OTP (via SMS provider)
→ Enter OTP
→ Verify
→ Create/Login User
```

**Requirements:**
- SMS Provider integration (Twilio/MSG91)
- OTP generation & verification
- Rate limiting (max 3 OTPs per 10 mins)
- OTP expiry (5 minutes)

### 1.2 PIN Lock (4-digit)
**Quick access security**

```
Flow:
After first login → Set 4-digit PIN
Next time → Enter PIN or Biometric
```

**Database:**
```json
{
  "userId": "string",
  "pinHash": "bcrypt_hash",
  "biometricEnabled": false,
  "deviceId": "string",
  "lastActive": "datetime"
}
```

### 1.3 Password Rules
- Min 8 characters
- 1 uppercase
- 1 number
- 1 special character

### 1.4 Session Management
- Access Token (short expiry: 15 mins)
- Refresh Token (long expiry: 7 days)
- Token rotation on refresh

---

## PHASE 2: WORKSPACE ARCHITECTURE

### 2.1 User Roles (Personal vs Business)

**Workspace-based model:**
```
User
  ├── Workspace 1 (Personal)
  ├── Workspace 2 (Business)
  └── Workspace 3 (Side Hustle)
```

**Database Structure:**

```sql
-- User Table
users {
  id,
  name,
  email,
  mobile,
  passwordHash,
  isVerified,
  createdAt,
  lastLoginAt
}

-- Workspace Table
workspaces {
  id,
  workspaceName,
  type: "Personal" | "Business",
  ownerUserId,
  createdAt
}

-- All modules link to workspaceId
income_sources {
  id,
  workspaceId,  -- NEW: Required field
  ...existing_fields
}
```

### 2.2 Multi-User Access (Family Sharing)

**Roles:**
| Role | Add | Edit | Delete | View | Invite |
|------|-----|------|--------|------|--------|
| Owner | ✅ | ✅ | ✅ | ✅ | ✅ |
| Admin | ✅ | ✅ | ❌ | ✅ | ❌ |
| Editor | ✅ | ✅ | ❌ | ✅ | ❌ |
| Viewer | ❌ | ❌ | ❌ | ✅ | ❌ |

**Use Cases:**
- Husband & Wife shared finances
- Family financial view
- Accountant access (Viewer)
- Business partner access

**Database:**
```sql
workspace_members {
  id,
  workspaceId,
  userId,
  role: "owner" | "admin" | "editor" | "viewer",
  invitedAt,
  acceptedAt
}
```

**Security Rule:**
```python
# All queries must include:
WHERE workspaceId = current_workspace_id
# Never userId-based access directly
```

---

## PHASE 3: DATA ENCRYPTION ARCHITECTURE

### Layer 1: Encryption in Transit
- HTTPS (TLS 1.2 or 1.3)
- No plain HTTP

### Layer 2: Encryption at Rest
- AES-256 encryption for sensitive fields:
  - Account Numbers
  - Loan numbers
  - Insurance policy numbers
  - PAN (if added)

### Layer 3: Password Security
- bcrypt hashing for passwords
- PIN also hashed
- Never store plain text

### Layer 4: Token Security
- JWT Access Token
- Refresh Token rotation
- Tokens must expire

### Layer 5: Field-Level Encryption
**Highly sensitive fields:**
- Account Balance
- Investment Principal
- Loan Outstanding

### Layer 6: Device Security
- Store Device ID
- Track last login time
- Alert on new device login

### Layer 7: Role-Based Data Isolation
```python
# All queries must check:
WHERE workspaceId = X AND user_has_permission(role, action)
```

### Layer 8: Backup Security
- Encrypted backups
- Secure cloud storage
- Restricted access

---

## PHASE 4: COMMERCIAL SCALE

### 4.1 Social Logins
- Google Login ✅ (Done)
- Apple Login
- Facebook Login

### 4.2 Advanced Features
- Multi-device sync
- Session management dashboard
- 2FA (TOTP)
- Device binding
- Risk-based authentication

---

## PHASE 5: FINTECH COMPLIANCE (Future)

### RBI / Account Aggregator Ready
- Explicit consent logs
- Data retention policies
- Privacy policy compliance
- Audit trails

---

## MIGRATION PLAN

### Step 1: Create New Tables
```sql
CREATE TABLE workspaces (...);
CREATE TABLE workspace_members (...);
CREATE TABLE security_settings (...);
```

### Step 2: Migrate Existing Users
```python
# For each existing user:
# 1. Create default "Personal" workspace
# 2. Add user as owner of workspace
# 3. Update all their data with workspaceId
```

### Step 3: Update All APIs
- Add workspaceId to all CRUD operations
- Add permission checks
- Update response models

### Step 4: Update Frontend
- Add workspace selector
- Show current workspace in header
- Add workspace settings page
- Add invite/member management

---

## IMPLEMENTATION PRIORITY

| Priority | Feature | Effort | Impact |
|----------|---------|--------|--------|
| P0 | Mobile OTP Login | Medium | High |
| P0 | PIN Lock | Low | High |
| P1 | Workspace Model | High | High |
| P1 | bcrypt Password Hashing | Low | High |
| P2 | Multi-User Access | Medium | Medium |
| P2 | Field Encryption | Medium | High |
| P3 | 2FA | Medium | Medium |
| P3 | Device Tracking | Low | Medium |

---

## CURRENT BACKLOG

### Immediate Tasks
- [ ] Expense Transaction Module
- [ ] Backend Refactoring (server.py → modular)
- [ ] Goal Detail UI overlap fix verification

### Upcoming Features
- [ ] Data export functionality
- [ ] AI Smart Insights on Dashboard
- [ ] Backend scheduler for auto expense deductions
- [ ] Loan amortization schedule view

---

*Last Updated: Feb 15, 2026*
