# SOT — USER FLOW
## PT. Bhimasena Adhirajasa Radhika

### 1. Public Flow
```text
Landing
 ├─ About → Company information
 ├─ Services → Service detail → CTA
 ├─ Portfolio/Clients → Client proof
 ├─ FAQ → Answers
 └─ Contact/Request → Contact form → Confirmation
```

Primary conversion:
```text
Landing → Service/Value Proposition → CTA Konsultasi → Contact Form → Success
```

### 2. Authentication Flow
```text
Login
 → Validate credentials
 → Load user + role
 → Route to role dashboard
 → Session active
 → Logout → Login
```

Failure:
```text
Invalid credentials → Inline error → Retry
Unauthorized route → 403 state
Expired session → Login
```

### 3. Direktur Flow
```text
Dashboard
 → Executive Summary
 → Users/Roles
 → Clients/Sites
 → Workforce
 → Reports
 → Activity/Audit
```

### 4. HRD Flow
```text
Dashboard
 → Employees
   → Search/filter
   → Create/edit
   → Employee detail
 → Placement
 → Attendance summary
 → HR report
```

### 5. Finance Flow
```text
Dashboard
 → Billing
 → Invoice detail
 → Payment/receivable status
 → Finance report
```

### 6. Marketing Flow
```text
Dashboard
 → Leads
 → Lead detail
 → Pipeline status
 → Proposal/activity
 → Marketing report
```

### 7. Operasional Flow
```text
Dashboard
 → Clients/Sites
 → Placement
 → Site/workforce monitoring
 → Attendance/issue
 → Operational report
```

### 8. Standard CRUD Flow
```text
List → Search/Filter → Add/Edit → Validate → Save → Success toast
                         └──────────────→ Error → Fix → Retry
```

### 9. Global UX States
Every data screen must support:
- Loading skeleton
- Empty state
- Error state + retry
- Success feedback
- Confirmation for destructive actions
