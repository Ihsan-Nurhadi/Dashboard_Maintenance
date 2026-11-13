# Dashboard Monitoring & Troubleshoot Site DMT (NMS IoT)

Sistem dashboard berbasis web untuk memonitor master site DMT, mengelola alur troubleshoot (Plan TS &rarr; Pelaksanaan &rarr; Report After TS &rarr; Riwayat TS), mencatat kondisi/degraded site, serta riwayat instalasi & pemasangan perangkat baru.

Dibangun sesuai spesifikasi dokumen [prd.md](file:///c:/Users/nasch/Downloads/Nayaka/Project/Maintenance%20NMS%20Dashboard/prd.md).

---

## 1. Arsitektur & Teknologi

- **Backend**: Python 3.13, Django 4.2+, Django REST Framework, SQLite (dev) / PostgreSQL (prod), openpyxl.
- **Frontend**: Node.js, React 18, Vite, React Router DOM, Clean & Flat CSS (tanpa efek animasi/kilau yang mengganggu pandangan mata).
- **Master Data**: 1.008 site dari `LISTSITE.xlsx` dan `MAINTENANCE - NAYAKA.xlsm`.
- **Riwayat Troubleshoot**: 102 riwayat TS lama dan 8 TS ongoing yang sudah diimpor secara otomatis ke dalam sistem.

---

## 2. Struktur Proyek

```
Maintenance NMS Dashboard/
├── backend/
│   ├── config/              # Konfigurasi Django, Settings, URLs
│   ├── core/                # Autentikasi, Summary Dashboard, Export Excel
│   ├── sites/               # Master Site, Status Logs (DEGREED/REPORT SITE), CCTV
│   ├── troubleshoots/       # Troubleshoot (Plan, Progress, Done, Trouble), TsDevice
│   ├── installations/       # Riwayat Pemasangan Site Baru (Installation, Devices)
│   ├── importer/            # Management command: import_excel
│   ├── db.sqlite3           # Database lokal siap pakai
│   └── manage.py
├── frontend/
│   ├── src/
│   │   ├── api/             # API client terhubung dengan Django backend & CSRF
│   │   ├── components/      # Layout (Sidebar navigasi), StatusBadge, Pagination
│   │   ├── pages/
│   │   │   ├── Login.jsx            # Halaman Login
│   │   │   ├── OngoingTS.jsx        # Halaman Beranda Ongoing Troubleshoot
│   │   │   ├── FormTS.jsx           # Form Add Plan TS & Autocomplete Master Site
│   │   │   ├── ListSite.jsx         # Daftar Master Site, filter & aksi
│   │   │   ├── SiteDetail.jsx       # Detail Site, CCTV, Degraded Log & Riwayat
│   │   │   ├── ReportAfterTS.jsx    # Laporan After TS, Checklist Perangkat & Hasil
│   │   │   ├── RiwayatTS.jsx        # Riwayat TS lengkap & Riwayat per site
│   │   │   └── RiwayatPemasangan.jsx# Riwayat Pemasangan untuk site baru
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── LISTSITE.xlsx
├── MAINTENANCE - NAYAKA.xlsm
├── import_report.csv        # Laporan validasi hasil import Excel
├── prd.md                   # Dokumen Product Requirement Document
├── run_backend.bat          # Shortcut menjalankan server Django
└── run_frontend.bat         # Shortcut menjalankan Vite frontend
```

---

## 3. Akun Default Pengguna

Sesuai kesepakatan satu akun (PRD §3):
- **Username**: `admin`
- **Password**: `admin123`

---

## 4. Cara Menjalankan Aplikasi

### Menjalankan Backend:
Buka terminal / PowerShell:
```powershell
cd backend
python manage.py runserver 127.0.0.1:8000
```
Backend berjalan di: `http://127.0.0.1:8000`

### Menjalankan Frontend:
Buka terminal / PowerShell baru:
```powershell
cd frontend
npm run dev
```
Buka browser di: `http://localhost:5173`

---

## 5. Menjalankan Ulang Import Data Excel (Jika Diperlukan)

Command import bersifat *idempotent* (aman dijalankan berulang tanpa menduplikasi data):
```powershell
cd backend
python manage.py import_excel --listsite "../LISTSITE.xlsx" --maintenance "../MAINTENANCE - NAYAKA.xlsm" --report "../import_report.csv"
```

