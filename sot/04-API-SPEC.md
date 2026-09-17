# SOT — API SPEC
## PT. Bhimasena Adhirajasa Radhika

### 1. API Contract
Base URL:
`/api/v1`

JSON request/response. Authentication uses Bearer token/session according to backend implementation.

Standard response:
```json
{
  "success": true,
  "message": "OK",
  "data": {},
  "meta": {}
}
```

Error:
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {}
}
```

### 2. Authentication
| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/auth/login` | Login |
| POST | `/auth/logout` | Logout |
| GET | `/auth/me` | Current user |

### 3. Users & Roles
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/users` | List users |
| POST | `/users` | Create user |
| GET | `/users/:id` | Detail |
| PATCH | `/users/:id` | Update |
| DELETE | `/users/:id` | Delete |
| GET | `/roles` | List roles |

Roles: `direktur`, `hrd`, `finance`, `marketing`, `operasional`.

### 4. Master Data
| Resource | Endpoints |
|---|---|
| Employees | `GET/POST /employees`, `GET/PATCH/DELETE /employees/:id` |
| Clients | `GET/POST /clients`, `GET/PATCH/DELETE /clients/:id` |
| Sites | `GET/POST /sites`, `GET/PATCH/DELETE /sites/:id` |
| Services | `GET/POST /services`, `GET/PATCH/DELETE /services/:id` |
| Placements | `GET/POST /placements`, `GET/PATCH/DELETE /placements/:id` |

### 5. Operational Data
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/attendance` | Attendance list/filter |
| POST | `/attendance` | Record attendance |
| GET | `/dashboard/summary` | Role-aware KPI summary |
| GET | `/activities` | Activity/audit feed |
| GET | `/notifications` | Notifications |

### 6. Finance
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/invoices` | Invoice list |
| POST | `/invoices` | Create invoice |
| GET | `/invoices/:id` | Invoice detail |
| PATCH | `/invoices/:id` | Update status |

### 7. Marketing
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/leads` | Lead list |
| POST | `/leads` | Create lead |
| GET | `/leads/:id` | Lead detail |
| PATCH | `/leads/:id` | Update pipeline |

### 8. Public Contact
| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/public/contact` | Submit inquiry |
| GET | `/public/services` | Public service list |

### 9. Query Convention
List endpoints support:
`page`, `limit`, `search`, `sort`, `order`, `status`, and relevant resource filters.

### 10. Authorization
Frontend route guards are UX protection only. Backend must enforce role permissions.
