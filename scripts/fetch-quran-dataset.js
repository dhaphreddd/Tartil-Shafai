import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_DIR = path.join(__dirname, '..', 'public', 'quran');
const METADATA_DIR = path.join(PUBLIC_DIR, 'metadata');
const UNICODE_DIR = path.join(PUBLIC_DIR, 'unicode');

// Ensure directories exist
[PUBLIC_DIR, METADATA_DIR, UNICODE_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

async function fetchDataset() {
  console.log('Fetching official Tanzil Quran Dataset...');
  
  try {
    // 1. Fetch text dataset directly from Tanzil
    const textUrl = 'https://tanzil.net/pub/download/index.php?quranType=uthmani&outType=txt-2&agree=true';
    const textResponse = await fetch(textUrl);
    if (!textResponse.ok) throw new Error('Failed to fetch text from tanzil.net');
    const rawText = await textResponse.text();

    // 2. Fetch metadata from Tanzil
    const metaUrl = 'https://tanzil.net/res/text/metadata/quran-data.js';
    const metaResponse = await fetch(metaUrl);
    if (!metaResponse.ok) throw new Error('Failed to fetch metadata from tanzil.net');
    const rawMeta = await metaResponse.text();

    // Extract Sura array using regex from the JS file
    const suraMatch = rawMeta.match(/QuranData\.Sura\s*=\s*\[[\s\S]*?\];/);
    if (!suraMatch) throw new Error('Failed to parse metadata JS');
    
    // Safely evaluate the Sura array
    const quranDataSura = new Function(`
      var QuranData = {};
      ${suraMatch[0]}
      return QuranData.Sura;
    `)();
    
    const surahsMeta = [];
    for (let i = 1; i <= 114; i++) {
      const row = quranDataSura[i];
      // [start, ayas, order, rukus, name, tname, ename, type]
      surahsMeta.push({
        id: i,
        name: row[5],
        nameArabic: row[4],
        ayahCount: row[1],
        revelationType: row[7]
      });
    }

    // 3. Process the text lines (format: 1|1|Text)
    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('#'));
    
    const surahsData = new Map();
    for (let i = 1; i <= 114; i++) {
      surahsData.set(i, []);
    }

    for (const line of lines) {
      const parts = line.split('|');
      if (parts.length >= 3) {
        const surahId = parseInt(parts[0], 10);
        const ayahNumber = parseInt(parts[1], 10);
        const text = parts.slice(2).join('|'); // The text itself verbatim
        
        if (surahsData.has(surahId)) {
          surahsData.get(surahId).push({
            surahId,
            ayahNumber,
            text
          });
        }
      }
    }

    console.log(`Writing dataset files to ${PUBLIC_DIR}...`);

    // 4. Write output files
    for (const [surahId, ayahs] of surahsData.entries()) {
      const meta = surahsMeta[surahId - 1];
      const surahData = {
        id: surahId,
        name: meta.name,
        nameArabic: meta.nameArabic,
        ayahCount: meta.ayahCount,
        ayahs
      };

      const fileName = String(surahId).padStart(3, '0') + '.json';
      fs.writeFileSync(
        path.join(UNICODE_DIR, fileName),
        JSON.stringify(surahData, null, 2),
        'utf8'
      );
    }

    fs.writeFileSync(
      path.join(METADATA_DIR, 'surahs.json'),
      JSON.stringify(surahsMeta, null, 2),
      'utf8'
    );

    // 5. Update attribution according to Tanzil terms
    const attribution = `Tanzil Quran Text
Source: Tanzil Project (https://tanzil.net/)
URL: https://tanzil.net/download/
Text Type: Uthmani
Version: 1.1 (or latest at time of fetch)
License: https://tanzil.net/docs/Text_License
Date Imported: ${new Date().toISOString()}

Terms of Use: Permission is granted to copy and distribute verbatim copies of this Quran text, but changing the text is not allowed.`;

    fs.writeFileSync(
      path.join(PUBLIC_DIR, 'ATTRIBUTION.txt'),
      attribution,
      'utf8'
    );

    console.log('Successfully generated official Tanzil dataset.');

  } catch (error) {
    console.error('Error fetching/processing Tanzil dataset:', error);
    process.exit(1);
  }
}

fetchDataset();
