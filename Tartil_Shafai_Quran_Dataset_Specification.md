# Tartil Shafa'i — Quran Dataset Specification

## 1. Purpose

Dokumen ini mendefinisikan sumber, struktur, rendering, dan validasi dataset Al-Qur'an untuk aplikasi Tartil Shafa'i.

Prinsip utama:
- Quran text menjadi static/local dataset.
- Firestore hanya menyimpan metadata Paket Tartil Shafa'i.
- Admin tidak mengetik atau mengubah teks Al-Qur'an.
- Reader mengambil ayat berdasarkan `surahId`, `startAyah`, dan `endAyah`.
- Akurasi teks lebih penting daripada kemudahan implementasi.

## 2. Sumber Dataset

### Unicode Quran

Gunakan dataset Quran Unicode yang sumber dan lisensinya terdokumentasi dengan jelas. Untuk baseline Unicode, gunakan teks Tanzil yang sesuai dengan ketentuan lisensinya.

Ketentuan penting:
- sertakan atribusi sesuai ketentuan sumber;
- jangan mengubah teks sumber;
- simpan metadata sumber dan versi dataset;
- lakukan validasi sebelum dataset dipakai production.

Teks Unicode menjadi basis untuk:
- KFGQPC Uthmanic Script Hafs
- LPMQ Isep Misbah
- Omar Naskh

### QCF

QCF tidak boleh diperlakukan sebagai font Unicode biasa.

QCF harus menggunakan data/code QCF yang sesuai dengan versi font yang dipakai. Jika implementasi QCF V2 digunakan, ikuti format `code_v2` dan mapping font yang sesuai.

Jangan membuat mapping QCF dengan menebak glyph.

## 3. Struktur Dataset

Direkomendasikan:

```text
public/
└── quran/
    ├── metadata/
    │   └── surahs.json
    ├── unicode/
    │   ├── 001.json
    │   ├── 002.json
    │   └── ...114.json
    └── qcf/
        └── ...
```

Contoh Unicode:

```json
{
  "surahId": 40,
  "name": "Ghafir",
  "nameArabic": "غَافِر",
  "ayahs": [
    {
      "number": 39,
      "text": "..."
    }
  ]
}
```

## 4. Quran Metadata

`surahs.json` minimal:

```json
{
  "id": 40,
  "name": "Ghafir",
  "nameArabic": "غَافِر",
  "ayahCount": 85
}
```

Gunakan satu sumber metadata yang konsisten dengan Quran text.

## 5. Package Reference

Package tidak menyimpan teks Quran.

Contoh:

```json
{
  "id": "j1-p01",
  "volumeId": "jilid-1",
  "packageNumber": 1,
  "surahId": 40,
  "startAyah": 39,
  "endAyah": 42
}
```

Resolver:

```text
package
 ↓
surahId
 ↓
startAyah..endAyah
 ↓
Quran Dataset
 ↓
ayah array
```

## 6. Renderer Architecture

Gunakan abstraction:

```text
QuranRenderer
├── UnicodeRenderer
└── QCFRenderer
```

UnicodeRenderer menerima:

```text
quran text + selected Unicode font
```

QCFRenderer menerima:

```text
QCF code/data + QCF font
```

Jangan membuat komponen Reader mengetahui detail internal setiap font.

## 7. Font Manager

Supported fonts:

```text
qcf
kfgqpc
lpmq
omar-naskh
```

Default:

```text
qcf
```

API konseptual:

```ts
type QuranFont =
  | "qcf"
  | "kfgqpc"
  | "lpmq"
  | "omar-naskh";
```

Font Manager menentukan renderer dan asset yang digunakan.

## 8. Font Loading

Jangan memuat seluruh font besar jika tidak diperlukan.

Gunakan:
- `@font-face`
- font-display yang sesuai
- lazy loading bila memungkinkan
- fallback Arabic font yang aman

Pastikan font yang digunakan memiliki hak redistribusi yang sesuai.

## 9. Validation

Buat validation script untuk:

1. jumlah surat = 114;
2. setiap surat memiliki metadata;
3. nomor ayat valid;
4. tidak ada ayat duplicate;
5. range ayat valid;
6. seluruh ayat yang direferensikan package tersedia;
7. Unicode dataset tidak berubah dari source setelah proses import;
8. QCF mapping memiliki data untuk ayat yang diperlukan;
9. tidak ada package yang menunjuk surat/ayat invalid.

## 10. Content Integrity

Jangan:
- mengoreksi teks berdasarkan tebakan AI;
- mengubah harakat secara manual;
- menyalin teks dari sumber acak;
- membuat QCF code sendiri;
- mencampur versi dataset tanpa pencatatan.

Jika ditemukan perbedaan sumber, hentikan proses import dan dokumentasikan perbedaannya.

## 11. Offline / PWA

Quran dataset static harus dapat dicache oleh service worker.

Reader yang datanya sudah tersedia dapat tetap digunakan ketika offline.

Firestore package metadata dapat dicache secara wajar sesuai strategi PWA.

## 12. Attribution

Aplikasi harus menyediakan halaman/section Credits atau About yang mencantumkan sumber Quran dataset dan font sesuai ketentuan masing-masing.

Jangan menghapus atau menyembunyikan attribution yang diwajibkan oleh lisensi.

## 13. Acceptance Criteria

Dataset dianggap siap jika:

- [ ] 114 surat tersedia
- [ ] semua ayat tersedia
- [ ] metadata konsisten
- [ ] Unicode dataset tervalidasi
- [ ] QCF dataset tervalidasi
- [ ] empat font dapat dipanggil
- [ ] Reader dapat mengambil range ayat
- [ ] package tidak menyimpan duplikasi teks Quran
- [ ] validation script lulus
- [ ] attribution tersedia
- [ ] asset dapat digunakan di GitHub Pages
