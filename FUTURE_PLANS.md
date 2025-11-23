Zen Ops © Kagadal Constructions — Internal Valuation Workflow System

---

# 📄 **HERE IS FUTURE_PLANS.md (FULL DETAILED ROADMAP)**

```markdown
# 🧭 Zen Ops — Future Plans & Technical Roadmap

This document defines **all future milestones**, **design principles**, and **features** that Zen Ops must support, even if not implemented immediately.

It is meant for:
- Future developers  
- Your hired tech team  
- ChatGPT assistants in new sessions  
- Project maintainers  

---

# 📌 1. Core Philosophy

Zen Ops is:
- A **unified valuation workflow system**
- Built around a **single Assignments pipeline**
- Designed to reduce manual workload
- Structured for future **automation**
- Friendly to both in-house work and outsourced valuers
- Scalable beyond Mudhol, Bagalkot, and Karnataka

---

# 📁 2. Core Modules

### **1. Authentication & Users**
- Email/password login
- Token-based auth
- Roles:
  - admin  
  - employee  
  - external (future)

---

### **2. Assignments Module**
Central record for all valuation work.

Key fields:
- assignment_id  
- source_type → `"inhouse"` or `"external"`  
- borrower  
- bank_tag  
- branch_tag  
- property_type  
- plot_area / building details (future)  
- stage  
- priority  
- fee (admin-only)  
- assignee  
- due_date  
- valuation_input_json (future)  
- valuation_output_json (future)  

Stages:
NEW → IN_PROGRESS → FINAL_CHECK → COMPLETED_FILES → PAYMENT_STATUS

---

### **3. Files Module**
- Upload documents/photos
- Auto-tagging support
- Media tab grouping:
  - Site photos  
  - Documents  
  - Final outputs  

---

### **4. Comments & Mentions**
- @mentions
- #tags
- Comment visibility by assignment
- Activity timeline

---

### **5. Notifications**
Triggers:
- Mention  
- Assignment  
- Stage change  
- Request (#request)  
- Overdue  
- Invoice status  

UI:
- Top-right bell
- Unseen count
- Click-through to assignment

---

### **6. Dashboard**
Admin:
- Summary of all assignments
- Pending payments
- Overdue assignments
- Requests

Employee:
- My assignments
- Due this week
- Overdue
- My requests

---

# 💰 7. Invoicing System (Phase 3)

Tables:
- invoices  
- invoice_items  

Status Flow:
DRAFT → SENT → RECEIVABLE → RECEIVED → VOID

Features:
- Generate invoice from assignment
- Invoice builder UI
- PDF export
- CSV export
- Finance dashboard with totals

---

# 🧱 8. Admin Module

Includes:
- User management  
- Assignment categories  
- Bank & branch tags  
- Branding settings:
  - appName  
  - logo  
  - footerText  

---

# 🔥 9. Automation Engine (Future Phase)

**Not built now.  
But architecture must allow it.**

Future-capable structure:

### A. Calculation Template System
- formula_definitions_json  
- required_fields_json  
- compatible with bank_tag + property_type

### B. Dynamic Input Form
Generated based on template.

### C. Engine
- Safe expression evaluator  
- Computes:
  - Land value  
  - Building value  
  - Depreciation  
  - Replacement cost  
  - Market value  

### D. Results stored in assignment:
- valuation_output_json

### E. Editable templating for future dev team.

---

# 🌐 10. External Valuer Support (Future)

Assignments where:
`source_type = "external"`

External valuer can:
- Create assignment  
- Upload inputs/files  
- Get computed results  
- Download output  
- Pay per evaluation (future)  

In-house team sees:
- All assignments (with filter)  

---

# 🔒 11. Role & Permission Matrix

| Action | Admin | Employee | External |
|-------|--------|----------|----------|
| View fee | ✔ | ✖ | ✖ |
| Edit fee | ✔ | ✖ | ✖ |
| Create assignment | ✔ | ✔ | ✔ (external for their own) |
| Upload files | ✔ | ✔ | ✔ (only theirs) |
| Add comments | ✔ | ✔ | ✔ |
| Run automation (future) | ✔ | ✔ | ✔ (limited) |
| See invoices | ✔ | ✖ | ✖ |

---

# 🛡 12. Security Requirements

- JWT tokens  
- Role-based API checks  
- Fee privacy always enforced server-side  
- Rate limiting for public endpoints (future)  
- HTTPS only on VPS  

---

# ☁ 13. Deployment Plan (Phase 4)

Server:
- Ubuntu 22.04 VPS  
- Nginx (reverse proxy)
- Gunicorn + Uvicorn workers (FastAPI)
- Systemd service
- React built frontend served as static files

Domains:
- `zen.yourdomain.com`  
- Let’s Encrypt certificates

---

# 🗄 14. File Storage Strategy

Local VPS:
/opt/zen/uploads/

File paths stored in DB.

Backup strategy:
- Nightly `pg_dump`
- Nightly `tar` of `/uploads`
- `rsync` pull to local Mac

---

# 🔮 15. Long-Term Vision

- Full automation of valuation calculations  
- External valuer evaluation service  
- PWA offline mode for site visits  
- Mobile-friendly UI  
- Native app wrapper (Capacitor) if required  
- Real-time collaboration (WebSockets)  
- Bank format export engine (PDF + Word)  
- AI-assisted report drafting (future)  

---

**This file serves as a blueprint for Zen Ops development now and in the future.**