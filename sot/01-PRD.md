# SOT — PRD
## PT. Bhimasena Adhirajasa Radhika

### 1. Product Summary
A responsive corporate landing page + internal operations management dashboard for an outsourcing company whose core business is supplying and managing client-deployed manpower.

**Primary users:** Public visitor, Direktur, HRD, Finance, Marketing, Operasional.  
**Frontend:** HTML, Tailwind CSS, React + Vite.  
**SOT rule:** This document set is the product contract. UI, API and implementation must not introduce features outside it without updating the SOT first.

### 2. Business Services
1. Pengamanan / Security
2. Ekspedisi Kurir
3. Man Power
4. Cleaning Service
5. Parkir
6. Loss Prevention

### 3. Product Scope
#### A. Landing Page
- Hero + primary CTA
- Company profile / value proposition
- 6 service cards
- Why Bhimasena / operational advantages
- Client/workforce statistics
- Operational process
- Portfolio/client section
- Testimonials
- FAQ
- Contact CTA
- Footer with company/contact/social information
- Responsive mobile-first layout

#### B. Internal Dashboard
Common:
- Login/logout
- Role-based navigation
- Dashboard summary
- Notifications/activity
- Profile
- Search/filter/table patterns

Direktur:
- Executive overview
- User/role management
- Workforce/client/service overview
- Reports and audit/activity

HRD:
- Employee/master manpower
- Placement/client assignment
- Attendance summary
- Employment status
- Basic HR reports

Finance:
- Billing/invoice summary
- Payroll-related operational summary
- Receivable/payable status
- Finance reports

Marketing:
- Leads/prospects
- Client pipeline
- Service proposal tracking
- Marketing activity summary

Operasional:
- Client/site management
- Workforce placement
- Attendance/operational issues
- Service/site monitoring
- Operational reports

### 4. Core Data Domains
- users
- roles
- employees
- clients
- sites
- services
- placements
- attendance
- invoices
- leads
- activities
- notifications

### 5. Non-Functional Requirements
- Responsive: mobile, tablet, desktop
- Accessible semantic HTML and keyboard-friendly controls
- Consistent loading, empty, error and success states
- Reusable components
- API-ready frontend; no hardcoded business logic in UI
- Secure route/role guards on dashboard
- Performance-first assets and lazy loading where appropriate
- Indonesian as default UI language

### 6. Success Criteria
- Visitor understands company/services within one scroll.
- Visitor can reach contact/quotation CTA quickly.
- Staff can find daily operational information from dashboard.
- Role-based users only see authorized modules.
- UI remains consistent because tokens/components are centralized.

### 7. Out of Scope
No payroll engine, accounting engine, biometric device integration, WhatsApp automation backend, mobile native app, or advanced BI engine in the initial project unless added to this SOT.
