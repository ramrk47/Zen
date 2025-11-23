# 🧱 Zen Ops — Valuation Operations System  
**A full-stack internal valuation workflow tool built with FastAPI, Postgres, and React (Vite).**

Zen Ops is the internal operational backbone for Kagadal Constructions’ valuation practice.  
It manages all valuation assignments, files, comments, activities, notifications, finance workflows, and provides future support for automation-driven valuation calculations.

---

## 🚀 Tech Stack

### **Backend**
- **FastAPI** (Python)
- **PostgreSQL** (via Postgres.app locally)
- **SQLAlchemy ORM**
- **Alembic** (migrations — coming soon)
- **Uvicorn** (local dev server)
- **CORS middleware** enabled for frontend

### **Frontend**
- **React + Vite**
- **Modern JavaScript**
- **Simple API integration (fetch)**
- **Future plans**: React Query, Zustand (state), TailwindCSS

### **Dev Tools**
- Node v18+
- Python 3.11+
- Git + GitHub
- Postgres.app (local database)

---

## 📁 Project Structure
valuation-ops/
│
├── backend/
│   ├── main.py               # FastAPI app (CORS + health + DB)
│   ├── db.py                 # SQLAlchemy engine + SessionLocal
│   ├── requirements.txt      # Python dependencies
│   ├── …                   # future: models, routers, schemas
│
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── src/
│   │   ├── App.jsx           # Frontend entry
│   │   ├── main.jsx
│   │   └── …               # future: pages, components
│   └── vite.config.js
│
├── .gitignore
└── README.md

---

## 🧩 Current Features

### ✔ Working backend with FastAPI  
- `/api/health` endpoint  
- CORS enabled  
- Postgres connection verified  

### ✔ Working frontend with React  
- Calls backend  
- Displays `/api/health` response  
- Ready for expansion

### ✔ Repo successfully pushed to GitHub  
- Version-controlled  
- Clean first commit  
- Ready for future extensions

---

## 🛠 Local Setup

### **1. Clone the repo**
```bash
git clone https://github.com/ramrk47/Zen.git
cd Zen

Backend Setup

cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

Run backend

uvicorn main:app --reload --port 8000

Test:
	•	http://127.0.0.1:8000/api/health

3. Database Setup (Postgres)

In a new Terminal:

psql -h localhost -p 5432 -U postgres

If it asks for password → just press Enter.

Then inside psql:

\l

Look in the list for a database named zen_ops.
	•	If you see zen_ops → ✅ DB is already set. Type \q to quit. You’re done; ignore README’s “setup” part.
	•	If you don’t see zen_ops, run these inside psql:
    
    
CREATE DATABASE zen_ops;
CREATE USER zen_user WITH PASSWORD 'zenpass123';
GRANT ALL PRIVILEGES ON DATABASE zen_ops TO zen_user;
\q

4. Frontend Setup

cd ../frontend
npm install
npm run dev

Open browser:	•	http://localhost:5173