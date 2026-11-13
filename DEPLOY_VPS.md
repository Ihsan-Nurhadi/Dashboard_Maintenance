# Panduan Deploy Docker & Nginx di VPS

Dokumen ini berisi panduan lengkap untuk menjalankan **Dashboard Monitoring & Troubleshoot Site DMT** di VPS dengan IP `110.232.92.134` pada port `3007`.

---

## 1. Arsitektur Docker di VPS

* **Port Eksternal (Publik)**: `3007` &rarr; diakses via `http://110.232.92.134:3007`
* **Nginx Container (`dmt_nms_nginx`)**:
  * Menyajikan file static frontend React (build dist Vite).
  * Menangani routing SPA (Single Page Application).
  * Melakukan reverse proxy request `/api/` dan `/admin/` ke container backend Django.
  * Menyajikan file statis Django `/static/` (admin assets).
* **Backend Container (`dmt_nms_backend`)**:
  * Menjalankan Django 4.2+ menggunakan production WSGI server **Gunicorn** (3 worker).
  * Terkoneksi dengan database SQLite yang dimount ke host (`./backend/db.sqlite3`) sehingga **1.008 master site**, **110 riwayat TS**, dan **146 PIC** tidak akan hilang saat container di-restart.

---

## 2. Persiapan di VPS (Cukup Sekali)

Masuk ke VPS via SSH dari komputer Anda:
```bash
ssh root@110.232.92.134
```

### A. Pastikan Docker & Docker Compose sudah terpasang
Jalankan di terminal VPS:
```bash
docker --version
docker compose version
```
*(Jika belum terpasang di Ubuntu/Debian, install dengan:* `apt update && apt install -y docker.io docker-compose-v2`*)*

### B. Buka Port 3007 di Firewall VPS
Pastikan port `3007` diizinkan lewat firewall VPS (UFW) atau Security Group penyedia cloud VPS Anda:
```bash
ufw allow 3007/tcp
ufw status
```

---

## 3. Upload Project ke VPS

Dari terminal komputer lokal Anda (PowerShell / Git Bash), upload seluruh folder project ke VPS:

```bash
# Contoh menggunakan rsync / scp dari komputer lokal:
scp -r "c:\Users\nasch\Downloads\Nayaka\Project\Maintenance NMS Dashboard" root@110.232.92.134:/root/maintenance-nms
```
*(Atau Anda bisa push project ini ke repository Git privat Anda lalu `git clone` di VPS).*

---

## 4. Menjalankan Aplikasi di VPS

Masuk ke folder project di VPS:
```bash
cd /root/maintenance-nms
```

Jalankan Docker Compose untuk membuild dan menjalankan container di background:
```bash
docker compose up -d --build
```

Proses build akan:
1. Mengompilasi frontend React Vite menjadi file statis produksi di dalam Nginx.
2. Memasang seluruh dependensi Python dan mengumpulkan aset statis Django.
3. Menjalankan Gunicorn backend dan Nginx reverse proxy.

---

## 5. Memeriksa Status Container

Periksa apakah kedua container sudah berjalan:
```bash
docker compose ps
```
Hasil yang diharapkan:
* `dmt_nms_backend`: Status **Up (healthy)**
* `dmt_nms_nginx`: Status **Up 0.0.0.0:3007->80/tcp**

Periksa log jika ingin melihat proses:
```bash
docker compose logs -f
```

---

## 6. Akses Dashboard

Buka browser di laptop atau HP Anda:
👉 **`http://110.232.92.134:3007`**

Akun Login Default:
* **Username**: `admin`
* **Password**: `admin123`

---

## 7. Perintah Pemeliharaan (Maintenance)

* **Menghentikan aplikasi:**
  ```bash
  docker compose down
  ```
* **Menjalankan kembali:**
  ```bash
  docker compose up -d
  ```
* **Rebuild setelah ada update kode:**
  ```bash
  docker compose up -d --build
  ```
* **Backup Database:**
  File database SQLite Anda tersimpan di file lokal `./backend/db.sqlite3`. Cukup copy file tersebut kapan saja untuk backup:
  ```bash
  cp backend/db.sqlite3 backup_db_$(date +%Y%m%d).sqlite3
  ```

