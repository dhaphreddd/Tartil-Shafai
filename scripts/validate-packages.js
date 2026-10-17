import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fixturePath = path.join(__dirname, '..', 'src', 'data', 'tartil-packages-fixture.json');
const quranMetadataPath = path.join(__dirname, '..', 'public', 'quran', 'metadata', 'surahs.json');

function validatePackages() {
  console.log('Validating packages fixture...');
  let hasErrors = false;

  if (!fs.existsSync(fixturePath)) {
    console.error('❌ Missing tartil-packages-fixture.json');
    process.exit(1);
  }

  if (!fs.existsSync(quranMetadataPath)) {
    console.error('❌ Missing Quran metadata');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  const surahs = JSON.parse(fs.readFileSync(quranMetadataPath, 'utf8'));

  const volumes = data.volumes;
  const packages = data.packages;

  const packageIds = new Set();
  const volumePackages = new Map(); // volumeId -> Set of packageNumbers

  packages.forEach(pkg => {
    // Check ID duplicate
    if (packageIds.has(pkg.id)) {
      console.error(`❌ Duplicate package ID: ${pkg.id}`);
      hasErrors = true;
    }
    packageIds.add(pkg.id);

    // Check volume valid
    if (!volumes.find(v => v.id === pkg.volumeId)) {
      console.error(`❌ Invalid volumeId ${pkg.volumeId} for package ${pkg.id}`);
      hasErrors = true;
    }

    // Check packageNumber unique per volume
    if (!volumePackages.has(pkg.volumeId)) {
      volumePackages.set(pkg.volumeId, new Set());
    }
    if (volumePackages.get(pkg.volumeId).has(pkg.packageNumber)) {
      console.error(`❌ Duplicate packageNumber ${pkg.packageNumber} in volume ${pkg.volumeId}`);
      hasErrors = true;
    }
    volumePackages.get(pkg.volumeId).add(pkg.packageNumber);

    // Check surahId 1-114
    if (pkg.surahId < 1 || pkg.surahId > 114) {
      console.error(`❌ Invalid surahId ${pkg.surahId} in package ${pkg.id}`);
      hasErrors = true;
    }

    // Check startAyah <= endAyah
    if (pkg.startAyah > pkg.endAyah) {
      console.error(`❌ Invalid ayah range (${pkg.startAyah}-${pkg.endAyah}) in package ${pkg.id}`);
      hasErrors = true;
    }

    // Check ayah range exists in Quran
    const surahMeta = surahs.find(s => s.id === pkg.surahId);
    if (surahMeta) {
      if (pkg.startAyah < 1 || pkg.endAyah > surahMeta.ayahCount) {
        console.error(`❌ Ayah range (${pkg.startAyah}-${pkg.endAyah}) out of bounds for Surah ${surahMeta.name} (1-${surahMeta.ayahCount}) in package ${pkg.id}`);
        hasErrors = true;
      }
    } else {
      console.error(`❌ Surah ${pkg.surahId} not found in metadata`);
      hasErrors = true;
    }
  });

  if (hasErrors) {
    console.error('Validation failed with errors.');
    process.exit(1);
  } else {
    console.log('✅ Package validation passed successfully! Test fixture is sound.');
  }
}

validatePackages();
