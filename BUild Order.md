🧱 What’s Next (Build Order)

PHASE 1 — Authentication + Assignments Core
	•	User table
	•	Password hashing
	•	Login endpoint
	•	/api/auth/me
	•	Assignment model
	•	List, create, update endpoints
	•	Activity tracking
	•	Fee privacy (admin-only)

PHASE 2 — Files + Comments + Notifications
	•	File uploads
	•	Comment thread
	•	@mentions
	•	#tags
	•	Notification bell
	•	Dashboard view

PHASE 3 — Invoicing Module
	•	Invoice + invoice_items tables
	•	Status flow (Draft → Sent → Receivable → Received)
	•	Finance view
	•	CSV export

PHASE 4 — Admin & Branding
	•	System settings
	•	User management
	•	Bank/branch tags
	•	Required-docs rules

PHASE 5 — VPS Deployment
	•	Ubuntu VPS
	•	Nginx + Gunicorn + Uvicorn
	•	Postgres on VPS
	•	HTTPS (Let’s Encrypt)
	•	Automated backups

PHASE 6 — Automation Engine (Future Team)
	•	Template-based calculation engine
	•	Dynamic input → computed output
	•	Report-generation backbone
	•	Optional external valuer portal

⸻

🛡 Backup Strategy (Planned)

On VPS:
	•	Nightly pg_dump
	•	Nightly tar of /uploads
	•	rsync pull script to local machine

⸻

🔮 Vision

Zen Ops will evolve into a complete valuation management system with:
	•	Full bank-specific templates
	•	Automated property valuation computation
	•	Outsourced valuation support
	•	Multi-user dashboard
	•	Secure deployment
	•	Mobile-friendly field interface
	•	PWA offline support (later)

⸻

🧑‍💻 Contribution (Future Team)

Developers should:
	•	Follow backend/models and backend/routers modular structure
	•	Use Alembic for all DB migrations
	•	Write clean, typed Pydantic schemas
	•	Maintain consistent API patterns (/api/...)
	•	Respect admin-role restrictions

⸻
