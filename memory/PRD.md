# CARI KROTO — PRD

## Problem Statement (original)
Aplikasi mobile penanda lokasi pohon kroto (telur semut rangrang) berbasis GPS. Menandai
lokasi pohon di alam, menambah foto, mencatat riwayat kunjungan/panen (bisa edit/hapus),
menyimpan jam & tanggal kunjungan terakhir, dark/light mode, notifikasi saat waktunya panen,
dan mengatur interval/jadwal panen. Tujuan: punya database pohon sehingga bisa panen tiap hari
tanpa keliling mencari kroto di alam, lalu dijual.

## Architecture
- **Frontend**: Expo Router (React Native), bottom tabs (Peta / Daftar / Jadwal / Atur), stack
  modals untuk Tandai/Edit lokasi & Catat Panen. TanStack Query untuk data. Tema Forest Green
  dark+light via `src/theme.ts` + `ThemeModeProvider` (persisted). Peta `react-native-maps`
  (native) + fallback web. Foto via `expo-image-picker` (kamera+galeri). GPS `expo-location`.
  Notifikasi lokal `expo-notifications`. Bottom sheet `@gorhom/bottom-sheet`. Ikon Phosphor.
- **Backend**: FastAPI + MongoDB (motor). Collections: `locations`, `visits` (soft-delete via
  `deleted_at`). Status panen dihitung dari `next_harvest_at`. Foto disimpan di Emergent Object
  Storage (upload `/api/upload`, serve `/api/files/{path}`).
- **Auth**: none (single-user, owner id `default`).

## User Persona
Pemburu/petani kroto yang ingin memetakan banyak pohon di alam dan panen terjadwal untuk dijual.

## Core Requirements (static)
1. Tandai lokasi pohon dengan GPS, nama, catatan, interval panen, foto.
2. Peta dengan marker berkode warna status (siap panen / masa tunggu), toggle satelit.
3. Detail lokasi: foto (tambah/hapus), riwayat kunjungan (tambah/edit/hapus), stats.
4. Catat panen: tanggal+jam, jumlah kg, catatan, foto → otomatis hitung jadwal panen berikutnya.
5. Jadwal: daftar siap panen & masa tunggu, total panen.
6. Notifikasi lokal saat waktunya panen (device/build only).
7. Dark & light mode.

## Implemented (2026-06)
- [x] Backend CRUD locations + visits (soft-delete), agregat total_kg & visit_count, status & next_harvest.
- [x] Upload/serve foto via Object Storage.
- [x] Peta (native) + fallback web, header, toggle map type, recenter, FAB, bottom sheet detail cepat.
- [x] Daftar lokasi: cari + sort (siap panen/terbaru/nama), pull-to-refresh, empty state.
- [x] Detail lokasi: hero+scrim, stats, foto manager, timeline riwayat dengan edit/hapus, sticky CTA.
- [x] Tandai lokasi & Edit lokasi (form + keyboard-aware + sticky save).
- [x] Catat/Edit panen dengan date/time picker.
- [x] Jadwal panen dengan ringkasan.
- [x] Dark/light/system theme selector (persisted) + tombol aktifkan notifikasi.
- [x] Notifikasi lokal dijadwalkan pada next_harvest_at.
- [x] Full regression passed (backend 12/12, frontend semua flow).

## Backlog / Next
- P1: Filter peta berdasarkan status; jarak dari lokasi saat ini di daftar.
- P1: Ekspor data / ringkasan pendapatan (harga per kg × total).
- P2: Statistik panen bulanan (grafik).
- P2: Kategori/jenis pohon & tag.

## Notes
- Peta, GPS, kamera, notifikasi hanya berfungsi di Expo Go / build device, bukan preview web.
