# Kasir Pinjam Barang (Rental Management System)

Aplikasi kasir dan manajemen persewaan barang (kamera, laptop, console game, HP, dll.) berbasis React (Vite) untuk frontend dan Express + MySQL untuk backend. 

Sistem ini didesain untuk memudahkan pencatatan transaksi sewa, pengelolaan inventori barang berdasarkan kategori, perhitungan denda keterlambatan otomatis, manajemen voucher promo, serta pembuatan laporan keuangan yang bisa diekspor ke Excel.

---

## Fitur Utama

- **Dashboard Ringkasan**: Statistik total pendapatan, barang yang sedang disewa, total pelanggan, dan grafik performa sewa barang.
- **Katalog Barang**: Kelola unit barang yang disewakan (tambah, edit, hapus, upload gambar) lengkap dengan nomor seri (S/N) dan warna.
- **Kelola Kategori**: Tambah dan hapus kategori barang secara dinamis langsung dari aplikasi. Ada proteksi agar kategori yang sedang aktif digunakan oleh barang tidak bisa dihapus dari database.
- **Manajemen Transaksi**:
  - Durasi sewa fleksibel (3 jam, 6 jam, 12 jam, 24 jam, atau kelipatan hari).
  - Validasi voucher promo langsung saat checkout transaksi.
  - Cetak struk/receipt fisik untuk penyewa.
- **Sistem Denda Keterlambatan Otomatis**:
  - **Toleransi 1 Jam pertama**: Terlambat kurang dari 60 menit dibebaskan dari denda (gratis).
  - **Denda jam ke-2 dst**: Dikenakan Rp 10.000/jam (mulai dihitung saat memasuki jam kedua).
  - **Denda Cap (Maximal)**: Denda per jam tidak akan melebihi harga sewa harian barang, denda otomatis disesuaikan ke kelipatan tarif 24 jam terdekat.
- **Laporan Keuangan**: Cetak rekap transaksi per periode (harian, mingguan, bulanan, tahunan) dan ekspor langsung ke format Microsoft Excel (.xls).
- **Voucher Promo**: Kelola voucher diskon nominal atau persentase dengan masa berlaku (expired date).
- **Manajemen Pelanggan**: Database nama, nomor HP, dan alamat pelanggan.

---

## Tech Stack

- **Frontend**: React.js (TypeScript), Vite, Tailwind CSS, React Router DOM, Zustand, Lucide React, Recharts.
- **Backend**: Node.js, Express.js, MySQL (mysql2/promise), dotenv.
- **Database**: MySQL (TiDB Cloud / Local Server).

---

## Panduan Instalasi & Cara Menjalankan

### 1. Prasyarat
Pastikan Anda sudah menginstal **Node.js** dan memiliki akses ke **MySQL database** (bisa lokal menggunakan XAMPP atau cloud seperti TiDB).

### 2. Kloning & Instalasi Dependensi
```bash
# Clone repository
git clone https://github.com/Rn-A/kasir-pinjam-iphone.git
cd kasir-pinjam-iphone

# Install library pendukung
npm install
```

### 3. Setup Database & Environment File
1. Import database schema menggunakan file `DATABASE_MYSQL.sql` di phpMyAdmin Anda.
2. Buat file `.env` di root direktori project dan sesuaikan dengan kredensial database Anda:
   ```env
   PORT=5000
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=pinjam_iphone
   DB_PORT=3306
   # DB_SSL=true (aktifkan jika menggunakan DB cloud seperti TiDB)
   ```

### 4. Jalankan Aplikasi
Aplikasi ini berjalan dalam mode dual-process (Frontend & Backend Server):

**Jalankan Backend API Server:**
```bash
npm run server
```
*Server API akan otomatis berjalan di port `5000` dan meng-init tabel database beserta datanya jika kosong.*

**Jalankan Frontend (Vite):**
```bash
npm run dev
```
*Aplikasi web dapat diakses di browser pada alamat `http://localhost:3000`.*

---

## Akun Login Default (Admin)
- **Email**: `admin@pinjamiphone.com`
- **Password**: `admin123`
*(Bisa diganti setelah login melalui menu pengaturan akun di sidebar).*
