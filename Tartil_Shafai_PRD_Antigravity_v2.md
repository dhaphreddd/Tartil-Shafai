# PRD — Tartil Shafa'i
## Technical Product Requirements Document for Antigravity

**Version:** 2.0  
**Target:** Web App / PWA  
**Deployment:** GitHub Pages  
**Database:** Firebase Firestore  
**Development:** Antigravity  
**UI Reference:** Google Stitch  
**Primary Content:** Quran text + Tartil Shafa'i package metadata

---

# 1. Product Overview

Tartil Shafa'i adalah aplikasi web/PWA yang menyediakan kumpulan Paket Tartil Shafa'i dalam format digital berbasis teks.

Konsep utama:

Jilid → Paket → Surat → Rentang Ayat → Quran Reader

Aplikasi harus memungkinkan pengguna mencari paket berdasarkan:
- nama surat
- nama surat Arab bila tersedia
- nomor surat
- nomor paket
- nomor ayat
- rentang ayat

Pengguna tidak perlu membuka file PDF atau gambar halaman mushaf. Isi Al-Qur'an ditampilkan sebagai teks digital sehingga dapat dibaca nyaman pada mobile maupun desktop.

Aplikasi memiliki dua jilid. Struktur data kedua jilid harus sama; perbedaannya hanya pada daftar paket dan surat/ayat yang digunakan.

---

# 2. Product Goals

1. Memudahkan siapa pun membuka dan membaca Paket Tartil Shafa'i melalui browser.
2. Menghilangkan ketergantungan terhadap PDF untuk penggunaan sehari-hari.
3. Memudahkan pencarian paket berdasarkan surat, ayat, atau nomor paket.
4. Menyediakan pengalaman membaca yang nyaman seperti aplikasi Quran modern.
5. Sangat kompatibel dengan mobile dan desktop.
6. Mendukung PWA.
7. Mendukung Light Mode, Dark Mode, dan System Theme.
8. Menyediakan pilihan 4 font Al-Qur'an.
9. Memungkinkan admin menambah paket hanya dengan memilih surat dan rentang ayat, tanpa mengetik ulang teks Al-Qur'an.
10. Tetap menggunakan layanan gratis: Firebase Firestore + GitHub Pages.

---

# 3. Non-Goals / Scope Boundary

MVP TIDAK mencakup:
- audio murottal
- tafsir
- terjemahan
- komentar
- bookmark kompleks
- social features
- pembayaran
- donasi
- gamification
- upload gambar halaman Al-Qur'an
- editor teks Al-Qur'an manual
- CMS konten Al-Qur'an

Fokus utama adalah package discovery dan Quran reading experience.

---

# 4. Target Platform

## Mobile

Prioritas utama:
- Android Chrome
- iOS Safari
- PWA installed mode

Target viewport minimal:
- 320px
- 375px
- 390px
- 412px

## Desktop

Target:
- 1024px
- 1366px
- 1440px
- 1920px

Desktop dan mobile harus menggunakan design system yang sama, tetapi layout tidak sekadar mengecilkan desktop.

---

# 5. UI / UX Reference

Implementasikan visual berdasarkan hasil desain Google Stitch.

File desain UI Stitch menjadi referensi visual untuk:
- layout
- typography
- spacing
- colors
- components
- responsive behavior
- Light/Dark mode
- Reader
- Search
- Settings
- Admin

Jangan membuat ulang UI secara bebas jika desain Stitch sudah tersedia.

quran.com hanya menjadi referensi pengalaman membaca modern, bukan sesuatu yang boleh disalin secara visual atau branding.

---

# 6. Technology Recommendation

Frontend bebas selama memenuhi kebutuhan, tetapi direkomendasikan:

- React
- TypeScript
- Vite
- Tailwind CSS
- Firebase SDK
- Firebase Authentication
- Firebase Firestore
- PWA plugin/service worker
- Fuse.js atau solusi client-side fuzzy search yang setara

Deployment:
- GitHub Pages

Jangan menggunakan backend server berbayar.

---

# 7. High-Level Architecture

```text
User
  ↓
PWA / Web App
  ↓
React UI
  ↓
Application Services
  ├── Quran Dataset
  ├── Package Resolver
  ├── Search Engine
  ├── Theme Manager
  └── Font Manager
  ↓
Firebase Firestore
  └── Package Metadata
```

Prinsip penting:

**Quran text tidak perlu disimpan berulang kali di Firestore untuk setiap paket.**

Package hanya menyimpan referensi:

```text
volumeId
packageNumber
surahId
startAyah
endAyah
status
```

Kemudian Quran Renderer mengambil teks ayat dari Quran Dataset berdasarkan referensi tersebut.

---

# 8. Quran Dataset

Quran Dataset merupakan sumber teks Al-Qur'an yang digunakan oleh Reader.

Struktur harus mendukung minimal:

```json
{
  "surahId": 40,
  "surahName": "Ghafir",
  "ayahs": [
    {
      "ayahNumber": 39,
      "text": "..."
    }
  ]
}
```

Quran Dataset harus menjadi data referensi terpisah dari package metadata.

Jangan membuat admin dapat mengubah teks Al-Qur'an secara bebas.

---

# 9. Package Data Model

Contoh:

```json
{
  "id": "j1-p01",
  "volumeId": "jilid-1",
  "packageNumber": 1,
  "surahId": 40,
  "startAyah": 39,
  "endAyah": 42,
  "isPublished": true,
  "createdAt": "...",
  "updatedAt": "..."
}
```

Field wajib:

| Field | Type | Required |
|---|---|---|
| id | string | yes |
| volumeId | string | yes |
| packageNumber | number | yes |
| surahId | number | yes |
| startAyah | number | yes |
| endAyah | number | yes |
| isPublished | boolean | yes |
| createdAt | timestamp | recommended |
| updatedAt | timestamp | recommended |

Validation:

```text
startAyah >= 1
endAyah >= startAyah
surahId valid
packageNumber unique within volume
```

---

# 10. Volume Data

Minimal:

```json
{
  "id": "jilid-1",
  "name": "Jilid 1",
  "isPublished": true
}
```

dan:

```json
{
  "id": "jilid-2",
  "name": "Jilid 2",
  "isPublished": true
}
```

Arsitektur harus memungkinkan penambahan jilid lain tanpa mengubah struktur aplikasi.

---

# 11. Four Quran Font System

Reader HARUS mendukung empat pilihan font:

1. QCF / Quran Complex
2. KFGQPC Uthmanic Script Hafs
3. LPMQ Isep Misbah
4. Omar Naskh

Default:

```text
QCF / Quran Complex
```

Label UI harus menggunakan nama produk-neutral:

```text
QCF / Quran Complex
```

bukan "Quran.com Font".

## Font Architecture

Jangan mengikat Reader langsung ke satu `font-family`.

Buat abstraction:

```text
QuranRenderer
    ↓
Font Manager
    ├── QCF Renderer
    ├── KFGQPC Renderer
    ├── LPMQ Renderer
    └── Omar Naskh Renderer
```

### Unicode Fonts

KFGQPC Uthmanic Script Hafs, LPMQ Isep Misbah, dan Omar Naskh dapat menggunakan Quran Unicode text dengan font masing-masing jika dataset dan font mendukungnya.

### QCF

QCF dapat memiliki kebutuhan rendering yang berbeda dari Unicode font. Jangan mengasumsikan QCF cukup dengan mengganti CSS `font-family`.

Implementasi QCF harus mengikuti format data/font QCF yang benar dan lisensi/redistribusi font yang digunakan.

Jika QCF membutuhkan glyph/code khusus, buat renderer/adaptor terpisah.

Jangan mengorbankan ketepatan teks Al-Qur'an hanya demi menyamakan implementasi antar-font.

---

# 12. Font Settings

User dapat memilih:

```text
System
Light
Dark
```

untuk theme.

Untuk font:

```text
QCF / Quran Complex
KFGQPC Uthmanic Script Hafs
LPMQ Isep Misbah
Omar Naskh
```

Font selection harus:
- langsung diterapkan
- tidak membutuhkan reload
- tersimpan di localStorage
- berlaku di seluruh Reader
- memiliki preview sample

Reading settings juga mendukung:
- Arabic font size
- line height
- theme

---

# 13. Public Pages

Minimal:

```text
/
├── Home
├── /jilid/1
├── /jilid/2
├── /paket/:packageId
├── /search
└── /settings
```

---

# 14. Home

Home harus:
- clean
- minimal
- mobile-first
- tidak penuh dekorasi

Isi:
- brand Tartil Shafa'i
- deskripsi singkat
- global search
- pilihan Jilid 1
- pilihan Jilid 2

Search utama:

```text
Cari paket, surat, atau ayat...
```

---

# 15. Package List

Package list harus menggunakan layout compact.

Contoh:

```text
01    QS. Ghafir       39–42
02    QS. Al-Ahzab     38–48
03    QS. Al-Ahqaf     13–17
```

Hindari card besar jika tidak diperlukan.

Informasi utama:
- nomor paket
- surat
- rentang ayat

Klik/tap membuka Reader.

---

# 16. Quran Reader

Reader adalah halaman paling penting.

Contoh:

```text
Paket 01
QS. Ghafir
Ayat 39–42

[Arabic text]

[Arabic text]

[Arabic text]

[Arabic text]
```

Persyaratan:

- centered reading column
- readable maximum width
- generous whitespace
- large Arabic text
- proper Arabic direction RTL
- ayah markers
- responsive typography
- no Quran page images

Reader harus mendukung:
- font switching
- font size
- line height
- theme
- previous package
- next package

Mobile harus menjadi first-class experience.

---

# 17. Package Resolver

Buat fungsi terpusat:

```text
resolvePackage(package)
```

Input:

```text
surahId
startAyah
endAyah
```

Output:

```text
array ayat
```

Contoh:

```text
Package 01
surahId = 40
startAyah = 39
endAyah = 42
```

menghasilkan tepat:

```text
39
40
41
42
```

Tidak boleh mengambil ayat sebelum atau sesudah range.

---

# 18. Search

Search harus mendukung:

- nomor paket
- nama surat
- nama surat Arab jika tersedia
- nomor surat
- nomor ayat
- rentang ayat

Contoh query:

```text
ghafir
paket 01
39
39-42
baqarah 285
```

Search sebaiknya dilakukan secara client-side menggunakan Fuse.js atau solusi setara setelah package metadata tersedia.

Jangan membuat request Firestore pada setiap karakter yang diketik user.

Search result:

```text
Paket 01
QS. Ghafir · 39–42
```

---

# 19. Search Matching Rules

Contoh:

Query:

```text
ghafir
```

→ Package yang surahName = Ghafir.

Query:

```text
39
```

→ Package yang startAyah <= 39 <= endAyah.

Query:

```text
39-42
```

→ cocok dengan range package 39–42.

Query:

```text
baqarah 285
```

→ cocok dengan surat Al-Baqarah dan ayat 285.

---

# 20. Admin Authentication

Admin menggunakan Firebase Authentication.

Minimal:
- email/password

Public user tidak perlu login untuk membaca.

---

# 21. Admin Pages

Minimal:

```text
/admin
/admin/packages
/admin/packages/new
/admin/packages/:id/edit
```

Dashboard sederhana.

Tidak perlu enterprise dashboard kompleks.

---

# 22. Add Package

Admin tidak mengetik teks Al-Qur'an.

Form:

```text
Jilid
Nomor Paket
Surat
Ayat Awal
Ayat Akhir
Status
```

Setelah surat + range dipilih, tampilkan preview otomatis:

```text
Paket 41
QS. Yasin
Ayat 1–12

[Arabic preview]
```

Simpan metadata ke Firestore.

---

# 23. Edit Package

Admin dapat mengubah:
- jilid
- nomor paket
- surat
- ayat awal
- ayat akhir
- status publish

Setelah perubahan range, preview harus diperbarui.

---

# 24. Delete Package

Delete harus:
- memerlukan konfirmasi
- tidak boleh accidental
- hanya tersedia untuk admin

Jika memungkinkan, gunakan soft-delete atau status archived untuk mengurangi risiko kehilangan data.

---

# 25. Firestore Structure

Rekomendasi:

```text
volumes/
packages/
```

Contoh:

```text
volumes/jilid-1
volumes/jilid-2

packages/j1-p01
packages/j1-p02
packages/j2-p01
```

Jangan membuat collection terpisah untuk setiap jilid.

---

# 26. Firestore Security

Public:

```text
READ published packages
```

Admin:

```text
CREATE
READ
UPDATE
DELETE
```

Security Rules wajib menjadi pengaman sebenarnya.

Jangan mengandalkan hidden admin button.

---

# 27. PWA

PWA harus menyediakan:
- manifest
- icons
- service worker
- installable app
- cache strategy
- offline fallback

Package yang sudah berhasil dimuat sebaiknya tetap nyaman dibuka ketika koneksi terputus, selama datanya sudah tersedia di cache/local storage.

---

# 28. Theme System

Theme:

```text
System
Light
Dark
```

Default:

```text
System
```

Artinya theme mengikuti OS/browser.

User override disimpan secara lokal.

---

# 29. Local Storage

Gunakan localStorage untuk preferensi lokal:

```text
theme
quranFont
arabicFontSize
arabicLineHeight
```

Jangan menyimpan data sensitif di localStorage.

---

# 30. Accessibility

Minimal:
- semantic HTML
- keyboard navigation
- visible focus state
- sufficient contrast
- touch target yang nyaman
- ARIA bila diperlukan
- RTL handling yang benar
- screen-reader friendly controls

---

# 31. Performance

Prioritas:
- lazy load route
- jangan memuat asset font besar yang tidak diperlukan sekaligus jika bisa dihindari
- cache dataset secara efisien
- hindari Firestore query berulang
- gunakan client-side search
- gunakan pagination/limit untuk Admin jika data berkembang

Quran text harus tersedia cepat di Reader.

---

# 32. GitHub Pages Compatibility

Karena menggunakan GitHub Pages:

- gunakan Vite base path yang sesuai repository
- pastikan SPA routing bekerja pada direct URL
- refresh `/paket/...` tidak boleh menghasilkan blank/404
- asset path harus benar setelah production build

Gunakan strategi routing yang kompatibel dengan static hosting.

---

# 33. Firebase Configuration

Firebase config harus menggunakan environment variables.

Jangan hardcode secret credential yang seharusnya rahasia.

Firebase Web API key bukan password database, tetapi Firestore Security Rules tetap wajib benar.

---

# 34. Deployment

Target:

```text
GitHub Repository
      ↓
GitHub Actions
      ↓
npm install
      ↓
npm run build
      ↓
GitHub Pages
```

Tidak menggunakan hosting berbayar.

---

# 35. Initial Seed Data

Jilid 1 memiliki 40 paket yang harus dimasukkan sebagai seed data.

Seed data harus mengikuti sumber Tartil Shafa'i yang diberikan user.

Jangan menebak atau mengubah pasangan surat/ayat.

Seed data sebaiknya disimpan dalam file terpisah, misalnya:

```text
src/data/seed/packages-jilid-1.json
```

Setelah validasi, data dapat di-import ke Firestore.

Jilid 2 akan menggunakan struktur yang sama dan dimasukkan setelah datasetnya tersedia.

---

# 36. Data Integrity

Buat validation script/test untuk memeriksa:

1. package number tidak duplicate dalam satu jilid
2. surahId valid
3. startAyah valid
4. endAyah valid
5. startAyah <= endAyah
6. seluruh ayat dalam range tersedia di Quran Dataset
7. tidak ada package yang mengambil ayat di luar range
8. tidak ada package yang kehilangan field wajib

---

# 37. Important Quran Content Rule

Jangan membuat atau mengoreksi teks Al-Qur'an secara manual berdasarkan asumsi AI.

Quran text harus berasal dari dataset yang dipilih dan diverifikasi.

Jika dataset/font membutuhkan format khusus untuk rendering, implementasikan adapter tanpa mengubah sumber teks secara sembarangan.

---

# 38. Development Strategy for Antigravity

Jangan membangun seluruh aplikasi dalam satu prompt.

Gunakan beberapa fase:

## Phase 1 — Foundation

Implementasikan:
- project setup
- routing
- Tailwind/design tokens
- theme system
- PWA foundation
- component architecture

Belum perlu Admin CRUD.

## Phase 2 — Quran Dataset

Implementasikan:
- Quran dataset
- types
- package resolver
- validation

## Phase 3 — Public UI

Implementasikan:
- Home
- Volume List
- Package List
- Reader

Gunakan desain Stitch sebagai referensi.

## Phase 4 — Search

Implementasikan client-side fuzzy search.

## Phase 5 — Font System

Implementasikan:
- font manager
- 4 font options
- preview
- localStorage preference
- QCF adapter bila diperlukan

## Phase 6 — Firebase

Implementasikan:
- Firebase initialization
- Firestore
- published package retrieval

## Phase 7 — Admin

Implementasikan:
- authentication
- dashboard
- package CRUD
- preview
- validation

## Phase 8 — PWA

Implementasikan:
- service worker
- caching
- offline fallback
- installability

## Phase 9 — Testing

Audit:
- mobile
- desktop
- reader
- search
- font switching
- theme
- Firestore
- security rules
- GitHub Pages routing
- PWA

## Phase 10 — Deployment

Deploy ke GitHub Pages.

---

# 39. Definition of Done

MVP dianggap selesai jika:

- [ ] Home responsive
- [ ] Jilid 1 dapat dibuka
- [ ] Jilid 2 dapat dibuka
- [ ] Package List berfungsi
- [ ] Reader menampilkan ayat dengan benar
- [ ] Search bekerja
- [ ] 4 font tersedia
- [ ] Font preference tersimpan
- [ ] Theme System/Light/Dark bekerja
- [ ] Admin login bekerja
- [ ] Admin dapat membuat package
- [ ] Admin dapat edit package
- [ ] Admin dapat delete/archive package
- [ ] Firestore Rules aman
- [ ] PWA dapat di-install
- [ ] Reader memiliki offline behavior yang layak
- [ ] Mobile responsive
- [ ] Desktop responsive
- [ ] GitHub Pages deployment berhasil
- [ ] Direct route tidak rusak ketika refresh
- [ ] Data integrity test lulus

---

# 40. Implementation Principle

Prioritas pengembangan:

```text
Correct Quran data
        ↓
Correct package resolver
        ↓
Excellent Reader
        ↓
Fast Search
        ↓
Clean UI
        ↓
Admin convenience
        ↓
PWA polish
```

Jangan mengorbankan akurasi teks Al-Qur'an demi visual.

Jangan mengorbankan readability Reader demi terlalu banyak fitur.

Jangan membuat aplikasi lebih kompleks dari kebutuhan Tartil Shafa'i.
