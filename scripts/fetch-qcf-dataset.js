import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const QCF_DIR = path.join(__dirname, '..', 'public', 'quran', 'qcf');
const FONTS_DIR = path.join(__dirname, '..', 'public', 'fonts', 'qcf');

if (!fs.existsSync(QCF_DIR)) fs.mkdirSync(QCF_DIR, { recursive: true });
if (!fs.existsSync(FONTS_DIR)) fs.mkdirSync(FONTS_DIR, { recursive: true });

async function fetchSurahQCF(surahId) {
  let allVerses = [];
  let page = 1;
  while (true) {
    const url = `https://api.quran.com/api/v4/verses/by_chapter/${surahId}?fields=verse_number,v1_page,code_v1&per_page=50&page=${page}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} for surah ${surahId}`);
    const data = await res.json();
    allVerses.push(...data.verses);
    if (!data.pagination || !data.pagination.next_page) break;
    page = data.pagination.next_page;
  }
  return allVerses.map(v => ({
    ayahNumber: v.verse_number,
    pageNumber: v.v1_page,
    glyphCode: v.code_v1
  }));
}

const TARGET_SURAHS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25, 26, 28, 29, 30, 31, 32, 33, 35, 36, 38, 39, 40,
  41, 42, 46, 48, 49, 50, 51, 53, 55, 56, 57, 59, 61, 62, 64, 65, 66,
  67, 70, 71, 73, 75, 76, 78, 84, 85, 87, 89, 90, 91, 93, 94, 97
];

async function main() {
  console.log(`Fetching QCF glyph data for ${TARGET_SURAHS.length} surahs...`);
  const uniquePages = new Set();

  for (const surahId of TARGET_SURAHS) {
    const padded = String(surahId).padStart(3, '0');
    const targetFile = path.join(QCF_DIR, `${padded}.json`);
    if (fs.existsSync(targetFile)) {
      console.log(`Surah ${surahId} already exists, skipping fetch.`);
      const content = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
      content.ayahs.forEach(a => uniquePages.add(a.pageNumber));
      continue;
    }

    try {
      const ayahs = await fetchSurahQCF(surahId);
      ayahs.forEach(a => uniquePages.add(a.pageNumber));
      fs.writeFileSync(targetFile, JSON.stringify({ surahId, ayahs }, null, 2), 'utf8');
      console.log(`Saved QCF data for surah ${surahId} (${ayahs.length} ayahs)`);
      // slight delay to be polite to API
      await new Promise(r => setTimeout(r, 80));
    } catch (err) {
      console.error(`Failed surah ${surahId}:`, err.message);
    }
  }

  console.log(`Total unique mushaf pages referenced: ${uniquePages.size}`);
}

main();
