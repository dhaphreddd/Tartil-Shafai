# Tartil Shafa'i — Antigravity Development Plan

## Development Rule

Implementasikan satu fase pada satu waktu. Setelah satu fase selesai dan diuji, lanjutkan ke fase berikutnya.

Gunakan:
- PRD Antigravity v2
- Quran Dataset Specification
- hasil UI final dari Google Stitch

Jangan mengubah desain Stitch tanpa alasan teknis.

---

# Phase 1 — Project Foundation

Buat project frontend production-ready.

Target:
- React
- TypeScript
- Vite
- Tailwind CSS
- routing
- design tokens
- theme System/Light/Dark
- PWA foundation
- folder architecture

Belum:
- Firebase CRUD
- Admin
- seluruh Quran dataset

Acceptance:
- app berjalan lokal
- Home dapat dirender
- responsive mobile/desktop
- theme bekerja

---

# Phase 2 — Quran Dataset

Implementasikan static Quran dataset.

Target:
- metadata 114 surat
- Unicode dataset
- QCF dataset/code bila sudah tersedia
- font assets
- Quran types
- validation script

Buat:

```text
QuranService
PackageResolver
QuranRenderer
UnicodeRenderer
QCFRenderer
FontManager
```

Acceptance:
- satu surat dapat dibaca
- range ayat dapat di-resolve
- validation lulus

---

# Phase 3 — Tartil Package System

Implementasikan package model dan data Jilid 1.

Package hanya menyimpan:

```text
volumeId
packageNumber
surahId
startAyah
endAyah
isPublished
```

Acceptance:
- daftar paket dapat ditampilkan
- klik paket membuka Reader
- ayat sesuai range

---

# Phase 4 — Quran Reader

Implementasikan Reader berdasarkan desain Stitch.

Target:
- package header
- Arabic RTL
- ayah markers
- typography
- previous/next package
- responsive mobile/desktop

Acceptance:
- Paket 01 tampil benar
- tidak ada ayat di luar range
- Reader nyaman di mobile

---

# Phase 5 — Four Font System

Implementasikan:

1. QCF / Quran Complex
2. KFGQPC Uthmanic Script Hafs
3. LPMQ Isep Misbah
4. Omar Naskh

Default:
QCF / Quran Complex

Font switch harus:
- tanpa reload
- langsung terlihat
- tersimpan di localStorage

Acceptance:
- keempat pilihan tampil
- preview benar
- Reader konsisten

---

# Phase 6 — Search

Implementasikan client-side search.

Search:
- nama surat
- nomor surat
- nomor paket
- nomor ayat
- ayat range

Gunakan Fuse.js atau solusi setara.

Jangan query Firestore setiap karakter.

Acceptance:
- `ghafir`
- `39`
- `39-42`
- `paket 01`
dapat menghasilkan hasil relevan.

---

# Phase 7 — Firebase

Hubungkan:
- Firebase App
- Firestore
- Firebase Authentication

Firestore:
- volumes
- packages

Public:
- read published package

Admin:
- CRUD

Acceptance:
- package Firestore dapat dibaca
- rules bekerja
- unauthorized write ditolak

---

# Phase 8 — Admin

Implementasikan:
- login
- dashboard
- package list
- add package
- edit package
- delete/archive
- preview ayat

Admin memilih:

```text
Jilid
Nomor Paket
Surat
Ayat Awal
Ayat Akhir
Status
```

Admin tidak mengetik teks Quran.

Acceptance:
- membuat package baru menghasilkan preview yang benar
- data tersimpan Firestore
- validation mencegah range invalid

---

# Phase 9 — PWA

Implementasikan:
- manifest
- icons
- service worker
- cache strategy
- offline fallback
- installability

Acceptance:
- installable
- Reader yang sudah dicache dapat dibuka offline
- update aplikasi tidak merusak cache

---

# Phase 10 — Testing

Test:
- mobile
- desktop
- dark/light/system
- font switching
- search
- Reader
- package resolver
- Admin
- Firestore rules
- PWA
- offline
- direct URL refresh

Khusus Quran:
- validasi range
- validasi nomor ayat
- validasi QCF
- tidak ada teks yang hilang

---

# Phase 11 — GitHub Pages

Setup:
- production build
- Vite base path
- SPA fallback
- GitHub Actions
- GitHub Pages

Acceptance:
- Home dapat dibuka
- `/paket/...` dapat dibuka langsung
- refresh tidak 404
- assets/fonts/Quran dataset termuat
- PWA tetap berfungsi

---

# Phase 12 — Final Audit

Sebelum release:

- [ ] UI sesuai Stitch
- [ ] 4 font bekerja
- [ ] dataset tervalidasi
- [ ] Jilid 1 benar
- [ ] Jilid 2 siap/terstruktur
- [ ] search cepat
- [ ] Firestore rules aman
- [ ] admin bekerja
- [ ] PWA bekerja
- [ ] GitHub Pages bekerja
- [ ] attribution lengkap
- [ ] tidak ada secret di repository
