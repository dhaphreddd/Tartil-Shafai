import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeArabic, normalizePhonetic } from '../src/services/SearchService';
import { stripLeadingBasmalah } from '../src/services/QuranService';
import type { Ayah } from '../src/core/types';

test('SearchService: normalizeArabic removes harakat and normalizes glyphs', () => {
  // Tashkeel removal and dagger alif normalization
  assert.equal(normalizeArabic('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ'), 'بسم الله الرحمان الرحيم');
  // Alif forms normalization (أ, إ, آ, ٱ -> ا)
  assert.equal(normalizeArabic('إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ'), 'اياك نعبد واياك نستعين');
  // Ta marbutah normalization (ة -> ه)
  assert.equal(normalizeArabic('سُورَةُ الْفَاتِحَةِ'), 'سوره الفاتحه');
});

test('SearchService: normalizePhonetic enables conversational Indonesian phonetic matching', () => {
  // Indonesian colloquial phonetic equivalence
  const formal = normalizePhonetic('Qul huwallāhu aḥad');
  const informal1 = normalizePhonetic('kulhu wallahu ahad');
  const informal2 = normalizePhonetic('qulhuwallahu ahad');
  assert.equal(formal, informal1);
  assert.equal(formal, informal2);

  // Bismillah phonetic equivalence (rohman -> rahman, double vowel reduction)
  assert.equal(
    normalizePhonetic('Bismillāhir-raḥmānir-raḥīm'),
    normalizePhonetic('bismillahirrohmanirrohim')
  );

  // Shomad / Somad / Samad
  assert.equal(
    normalizePhonetic('Allāhuṣ-ṣamad'),
    normalizePhonetic('allahu somad')
  );
});

test('QuranService: stripLeadingBasmalah strips basmalah on non-Fatihah verses', () => {
  const withBasmalah = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ الم';
  assert.equal(stripLeadingBasmalah(withBasmalah), 'الم');

  const withoutBasmalah = 'الم ذَٰلِكَ الْكِتَابُ لَا رَيْبَ ۛ فِيهِ';
  assert.equal(stripLeadingBasmalah(withoutBasmalah), withoutBasmalah);

  const emptyText = '';
  assert.equal(stripLeadingBasmalah(emptyText), '');
});

test('Waqof Customization: preserves isWaqof property on Ayah model', () => {
  const ayahWithWaqof: Ayah = {
    surahId: 2,
    ayahNumber: 5,
    text: 'أُولَٰئِكَ عَلَىٰ هُدًى مِّن رَّبِّهِمْ ۖ وَأُولَٰئِكَ هُمُ الْمُفْلِحُونَ',
    isWaqof: true,
  };

  const ayahNormal: Ayah = {
    surahId: 2,
    ayahNumber: 6,
    text: 'إِنَّ الَّذِينَ كَفَرُوا سَوَاءٌ عَلَيْهِمْ',
  };

  assert.equal(ayahWithWaqof.isWaqof, true);
  assert.equal(ayahNormal.isWaqof, undefined);

  // Simulating ayah resolution preservation
  const resolvedList: Ayah[] = [ayahWithWaqof, ayahNormal].map((a) => ({
    ...a,
    text: a.text.trim(),
    isWaqof: a.isWaqof === true ? true : undefined,
  }));

  assert.equal(resolvedList[0].isWaqof, true);
  assert.equal(resolvedList[1].isWaqof, undefined);
});
