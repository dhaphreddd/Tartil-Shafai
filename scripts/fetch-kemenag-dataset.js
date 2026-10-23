import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_DIR = path.join(__dirname, '..', 'public', 'quran');
const KEMENAG_DIR = path.join(PUBLIC_DIR, 'id');

if (!fs.existsSync(KEMENAG_DIR)) {
  fs.mkdirSync(KEMENAG_DIR, { recursive: true });
}

async function fetchSurahWithRetry(surahId, retries = 3) {
  const url = `https://equran.id/api/v2/surat/${surahId}`;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json?.data?.ayat) throw new Error('Invalid JSON structure');
      return json.data;
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`Retry ${attempt} for surah ${surahId}:`, err.message);
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
}

async function fetchAll() {
  console.log('Fetching official Kemenag Transliterasi & Terjemahan for all 114 surahs...');
  const batchSize = 6;
  const totalSurahs = 114;

  for (let i = 1; i <= totalSurahs; i += batchSize) {
    const batch = [];
    for (let j = i; j < i + batchSize && j <= totalSurahs; j++) {
      batch.push(j);
    }

    await Promise.all(
      batch.map(async (surahId) => {
        const padded = String(surahId).padStart(3, '0');
        const targetFile = path.join(KEMENAG_DIR, `${padded}.json`);
        
        // Skip if already exists and non-empty
        if (fs.existsSync(targetFile) && fs.statSync(targetFile).size > 50) {
          return;
        }

        const data = await fetchSurahWithRetry(surahId);
        const formatted = {
          surahId: data.nomor,
          name: data.namaLatin,
          nameArabic: data.nama,
          ayahCount: data.jumlahAyat,
          ayahs: data.ayat.map((a) => ({
            ayahNumber: a.nomorAyat,
            latin: (a.teksLatin || '').trim(),
            translation: (a.teksIndonesia || '').trim(),
          })),
        };

        fs.writeFileSync(targetFile, JSON.stringify(formatted, null, 2), 'utf8');
        process.stdout.write(`Downloaded Surah ${surahId}/${totalSurahs} (${data.namaLatin})\n`);
      })
    );
  }

  // Write attribution
  const attribution = `Kemenag Quran Transliterasi Latin & Terjemahan Bahasa Indonesia
Sumber: Kementerian Agama Republik Indonesia (Kemenag RI) / LPMQ
Standar: SKB Menteri Agama dan Menteri Pendidikan dan Kebudayaan RI No. 158 Tahun 1987 / No. 0543b/U/1987 (Transliterasi Arab-Latin)
Format: Terjemahan Standar Kemenag RI
Distribusi: Tartil Shafa'i Local Dataset
Diunduh: ${new Date().toISOString()}`;

  fs.writeFileSync(path.join(KEMENAG_DIR, 'ATTRIBUTION.txt'), attribution, 'utf8');
  console.log('Finished downloading all 114 surahs to public/quran/id/');
}

fetchAll().catch((err) => {
  console.error('Fatal error during Kemenag fetch:', err);
  process.exit(1);
});
