import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_DIR = path.join(__dirname, '..', 'public', 'quran');
const METADATA_DIR = path.join(PUBLIC_DIR, 'metadata');
const UNICODE_DIR = path.join(PUBLIC_DIR, 'unicode');

function validateQuranDataset() {
  console.log('Validating Quran Dataset...');
  let hasErrors = false;

  // 1. Check if metadata exists
  const surahsFilePath = path.join(METADATA_DIR, 'surahs.json');
  if (!fs.existsSync(surahsFilePath)) {
    console.error('❌ Missing surahs.json in metadata directory');
    return process.exit(1);
  }

  const metadata = JSON.parse(fs.readFileSync(surahsFilePath, 'utf8'));
  
  if (metadata.length !== 114) {
    console.error(`❌ Expected 114 surahs in metadata, found ${metadata.length}`);
    hasErrors = true;
  }

  // 2. Validate each surah file
  for (let i = 1; i <= 114; i++) {
    const paddedId = String(i).padStart(3, '0');
    const surahFilePath = path.join(UNICODE_DIR, `${paddedId}.json`);
    
    if (!fs.existsSync(surahFilePath)) {
      console.error(`❌ Missing file for surah ${i}: ${paddedId}.json`);
      hasErrors = true;
      continue;
    }

    const surahData = JSON.parse(fs.readFileSync(surahFilePath, 'utf8'));
    const metaEntry = metadata.find(m => m.id === i);

    if (!metaEntry) {
      console.error(`❌ Surah ${i} not found in metadata`);
      hasErrors = true;
      continue;
    }

    if (surahData.ayahCount !== metaEntry.ayahCount) {
      console.error(`❌ Mismatch ayahCount for surah ${i}. Meta: ${metaEntry.ayahCount}, File: ${surahData.ayahCount}`);
      hasErrors = true;
    }

    if (surahData.ayahs.length !== surahData.ayahCount) {
      console.error(`❌ Surah ${i} ayah array length (${surahData.ayahs.length}) does not match ayahCount (${surahData.ayahCount})`);
      hasErrors = true;
    }
  }

  if (hasErrors) {
    console.error('Validation failed with errors.');
    process.exit(1);
  } else {
    console.log('✅ Quran dataset validation passed successfully! All 114 surahs and ayahs are intact.');
  }
}

validateQuranDataset();
