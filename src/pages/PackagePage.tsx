import { useEffect, useState, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { CurriculumService } from '@/services/CurriculumService';
import { PackageResolver } from '@/utils/PackageResolver';
import type { ResolvedPackage } from '@/utils/PackageResolver';
import { QuranRenderer } from '@/components/quran/QuranRenderer';
import ReaderSettingsPopover from '@/components/quran/ReaderSettingsPopover';
import { useReaderSettings } from '@/hooks/useReaderSettings';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import type { Layer1Card, Layer2Card, Layer3Item } from '@/core/types';
import { formatSurahsTitle } from '@/utils/PackageTitleFormatter';

interface CachedPackageState {
  layer1: Layer1Card;
  layer2: Layer2Card;
  layer3: Layer3Item;
  resolvedData: ResolvedPackage;
  siblings: Layer3Item[];
  scrollY?: number;
}

const packageStateCache = new Map<string, CachedPackageState>();

export default function PackagePage() {
  const { packageId } = useParams<{ packageId: string }>();
  const navigate = useNavigate();
  const { effective } = useTheme();
  const isDark = effective === 'dark';
  const { isAdmin } = useAuth();
  const {
    settings,
    setFont,
    setFontSize,
    setLineHeight,
    setViewMode,
    toggleElement,
    resetDefaults,
  } = useReaderSettings();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Use cached state if available to eliminate reload flicker
  const cached = packageId ? packageStateCache.get(packageId) : undefined;

  const [layer1, setLayer1] = useState<Layer1Card | null>(() => cached?.layer1 || null);
  const [layer2, setLayer2] = useState<Layer2Card | null>(() => cached?.layer2 || null);
  const [layer3, setLayer3] = useState<Layer3Item | null>(() => cached?.layer3 || null);
  const [resolvedData, setResolvedData] = useState<ResolvedPackage | null>(() => cached?.resolvedData || null);
  const [siblings, setSiblings] = useState<Layer3Item[]>(() => cached?.siblings || []);
  const [loading, setLoading] = useState(() => !cached);
  const [pinSaving, setPinSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTogglePin = async () => {
    if (!layer3) return;
    if (!isAdmin) {
      alert('Hanya akun Admin yang dapat menyematkan atau melepas sematan materi ke Beranda Utama.');
      return;
    }
    setPinSaving(true);
    try {
      const nextState = await CurriculumService.togglePinItem(layer3.id);
      setLayer3((prev) => (prev ? { ...prev, isPinned: nextState } : null));
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah status pin');
    } finally {
      setPinSaving(false);
    }
  };

  // Restore scroll position when returning from settings
  useEffect(() => {
    if (cached?.scrollY && cached.scrollY > 0) {
      const targetScroll = cached.scrollY;
      requestAnimationFrame(() => {
        window.scrollTo({ top: targetScroll, behavior: 'instant' });
      });
    }
  }, [packageId]);

  // Record scroll position before unmount
  useEffect(() => {
    return () => {
      if (packageId) {
        const item = packageStateCache.get(packageId);
        if (item) {
          item.scrollY = window.scrollY;
        }
      }
    };
  }, [packageId]);

  useEffect(() => {
    let isMounted = true;
    if (!packageId) return;

    // Only set loading true if we don't have cached data
    if (!packageStateCache.has(packageId)) {
      setLoading(true);
    }
    setError(null);

    const unsubscribe = CurriculumService.subscribeToLayer3Item(packageId, async (found) => {
      if (!isMounted) return;
      if (!found) {
        setError('Materi / Paket tidak ditemukan.');
        setLoading(false);
        return;
      }

      try {
        const resolved = await PackageResolver.resolve({
          id: found.item.id,
          volumeId: found.layer1.id,
          packageNumber: found.item.order || 1,
          surahId: found.item.surahId,
          startAyah: found.item.startAyah,
          endAyah: found.item.endAyah,
          isPublished: found.item.isPublished,
          order: found.item.order,
          customAyahs: found.item.customAyahs,
          sections: found.item.sections,
        });

        if (isMounted) {
          setLayer1(found.layer1);
          setLayer2(found.layer2);
          setLayer3(found.item);
          setResolvedData(resolved);
          setSiblings(found.layer2.items || []);
          setError(null);
          setLoading(false);

          // Save to memory cache for zero-reload returns
          packageStateCache.set(packageId, {
            layer1: found.layer1,
            layer2: found.layer2,
            layer3: found.item,
            resolvedData: resolved,
            siblings: found.layer2.items || [],
            scrollY: packageStateCache.get(packageId)?.scrollY || 0,
          });
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Gagal memuat materi bacaan');
          setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [packageId]);

  if (loading) return <div className="p-12 text-center text-[13px] animate-pulse-soft">Memuat reader...</div>;
  if (error || !resolvedData || !layer1 || !layer2 || !layer3) {
    return (
      <div className="p-12 text-center text-red-500">
        <span className="material-symbols-outlined text-[48px] mb-4 block">error</span>
        <p>{error || 'Data tidak ditemukan.'}</p>
        <Link to="/" className="inline-block mt-4 text-[13px] underline">Kembali ke Beranda</Link>
      </div>
    );
  }

  const currentIdx = siblings.findIndex((p) => p.id === layer3.id);
  const prevPkg = currentIdx > 0 ? siblings[currentIdx - 1] : null;
  const nextPkg = currentIdx >= 0 && currentIdx < siblings.length - 1 ? siblings[currentIdx + 1] : null;

  const sections = resolvedData.sections || [];
  const isMultiSurah = sections.length > 1;

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 lg:px-12 py-6 md:py-10 animate-fade-in">
      {/* Top Navigation & Reader Controls Bar */}
      <div
        className="mb-6 pb-4 border-b flex flex-wrap items-center justify-between gap-3"
        style={{ borderColor: isDark ? 'var(--color-dark-border)' : 'var(--color-border)' }}
      >
        {/* Left: 3-Layer Breadcrumbs */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-xs md:text-[13px] overflow-x-auto whitespace-nowrap"
        >
          <Link
            to="/"
            className="transition-colors hover:underline"
            style={{ color: isDark ? 'var(--color-dark-text-secondary)' : 'var(--color-text-secondary)' }}
          >
            Beranda
          </Link>
          <span style={{ color: isDark ? 'var(--color-dark-text-muted)' : 'var(--color-text-muted)' }}>/</span>
          <Link
            to={`/jilid/${layer1.id}`}
            className="transition-colors hover:underline"
            style={{ color: isDark ? 'var(--color-dark-text-secondary)' : 'var(--color-text-secondary)' }}
          >
            {layer1.title}
          </Link>
          <span style={{ color: isDark ? 'var(--color-dark-text-muted)' : 'var(--color-text-muted)' }}>/</span>
          <span
            className="text-xs"
            style={{ color: isDark ? 'var(--color-dark-text-muted)' : 'var(--color-text-muted)' }}
          >
            {layer2.title}
          </span>
          <span style={{ color: isDark ? 'var(--color-dark-text-muted)' : 'var(--color-text-muted)' }}>/</span>
          <span
            className="font-medium"
            style={{ color: isDark ? 'var(--color-dark-primary)' : 'var(--color-primary)' }}
          >
            {layer3.title}
          </span>
        </nav>

        {/* Right: Actions Bar (Pin Status & Tampilan Settings) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleTogglePin}
            disabled={pinSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-95 shadow-xs cursor-pointer"
            style={{
              borderColor: layer3.isPinned
                ? '#d97706'
                : isDark
                  ? 'var(--color-dark-border)'
                  : 'var(--color-border)',
              backgroundColor: layer3.isPinned
                ? isDark
                  ? 'rgba(217, 119, 6, 0.2)'
                  : 'rgba(217, 119, 6, 0.1)'
                : isDark
                  ? 'var(--color-dark-surface)'
                  : 'var(--color-surface)',
              color: layer3.isPinned
                ? '#d97706'
                : isDark
                  ? 'var(--color-dark-text-secondary)'
                  : 'var(--color-text-secondary)',
            }}
            title={
              isAdmin
                ? layer3.isPinned
                  ? 'Lepas sematan dari Beranda'
                  : 'Sematkan di Beranda Utama'
                : layer3.isPinned
                  ? 'Materi ini disematkan di Beranda Utama'
                  : 'Sematkan di Beranda Utama (Khusus Admin)'
            }
          >
            <span
              className="material-symbols-outlined text-[17px] block"
              style={{
                fontVariationSettings: layer3.isPinned ? "'FILL' 1" : "'FILL' 0",
                color: layer3.isPinned ? '#d97706' : undefined,
              }}
            >
              push_pin
            </span>
            <span>{pinSaving ? 'Menyimpan...' : layer3.isPinned ? 'Disematkan' : 'Sematkan'}</span>
          </button>

          <div className="relative">
            <button
              ref={buttonRef}
              type="button"
              onClick={() => setIsSettingsOpen((prev) => !prev)}
              id="reader-settings-button"
              aria-label="Pengaturan Tampilan Bacaan"
              aria-expanded={isSettingsOpen}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 shadow-xs cursor-pointer"
              style={{
                borderColor: isDark ? 'var(--color-dark-border)' : 'var(--color-border)',
                backgroundColor: isSettingsOpen
                  ? isDark
                    ? 'var(--color-dark-surface-elevated)'
                    : 'var(--color-surface-subtle)'
                  : isDark
                    ? 'var(--color-dark-surface)'
                    : 'var(--color-surface)',
                color: isDark ? 'var(--color-dark-text)' : 'var(--color-text)',
              }}
            >
              <span
                className="material-symbols-outlined text-[18px]"
                style={{ color: isDark ? 'var(--color-dark-primary)' : 'var(--color-primary)' }}
              >
                tune
              </span>
              <span>Tampilan</span>
              <span
                className="text-[11px] font-mono px-1.5 py-0.2 rounded"
                style={{
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                  color: isDark ? 'var(--color-dark-text-muted)' : 'var(--color-text-muted)',
                }}
              >
                {settings.arabicFontSize}px
              </span>
            </button>

            {/* Quran.com Style Popover */}
            <ReaderSettingsPopover
              isOpen={isSettingsOpen}
              onClose={() => setIsSettingsOpen(false)}
              anchorRef={buttonRef}
              fontSize={settings.arabicFontSize}
              setFontSize={setFontSize}
              lineHeight={settings.arabicLineHeight}
              setLineHeight={setLineHeight}
              onReset={resetDefaults}
              currentFont={settings.quranFont}
              setFont={setFont}
              showArabic={settings.showArabic}
              showTransliteration={settings.showTransliteration}
              showTranslation={settings.showTranslation}
              viewMode={settings.viewMode}
              toggleElement={toggleElement}
              setViewMode={setViewMode}
            />
          </div>
        </div>
      </div>

      {/* Surah & Package Identification */}
      <div className="mb-6 text-center sm:text-left">
        <div className="inline-flex items-center gap-2 mb-1.5 flex-wrap">
          <span
            className="text-[11px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded"
            style={{
              backgroundColor: isDark ? 'rgba(198, 161, 91, 0.15)' : 'rgba(154, 119, 56, 0.12)',
              color: isDark ? 'var(--color-dark-primary)' : 'var(--color-primary)',
            }}
          >
            {layer3.title}
          </span>
          <span
            className="text-xs"
            style={{ color: isDark ? 'var(--color-dark-text-muted)' : 'var(--color-text-muted)' }}
          >
            {layer1.title} • {layer2.title}
          </span>
          {isMultiSurah && (
            <span
              className="text-[11px] font-medium px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                color: isDark ? 'var(--color-dark-text-secondary)' : 'var(--color-text-secondary)',
              }}
            >
              {sections.length} Surat
            </span>
          )}
          {layer3.isPinned && (
            <span
              className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: 'rgba(217, 119, 6, 0.12)',
                color: '#d97706',
              }}
            >
              <span className="material-symbols-outlined text-[13px]">push_pin</span>
              Disematkan
            </span>
          )}
        </div>

        <h1
          className="text-2xl sm:text-3xl font-bold tracking-tight"
          style={{ color: isDark ? 'var(--color-dark-text)' : 'var(--color-text)' }}
        >
          {isMultiSurah
            ? formatSurahsTitle(sections, (id) => {
                const found = sections.find((s) => s.surahId === id);
                return found?.surahMetadata.name || `Surat ${id}`;
              })
            : `QS. ${resolvedData.surahMetadata.name}`}
        </h1>
        <p
          className="text-sm mt-1"
          style={{ color: isDark ? 'var(--color-dark-text-secondary)' : 'var(--color-text-secondary)' }}
        >
          {isMultiSurah
            ? sections.length === 2
              ? sections.map((s) => `QS. ${s.surahMetadata.name} (${s.startAyah}–${s.endAyah})`).join(' • ')
              : `${sections.length} Surat • ${sections.reduce((sum, s) => sum + (s.endAyah - s.startAyah + 1), 0)} Total Ayat (${sections[0].surahMetadata.name} ${sections[0].startAyah} – ${sections[sections.length - 1].surahMetadata.name} ${sections[sections.length - 1].endAyah})`
            : `Ayat ${resolvedData.pkg.startAyah} – ${resolvedData.pkg.endAyah}`}
        </p>
      </div>

      {/* Quick View Mode & 3-Element Toggles Toolbar */}
      <div
        className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 mb-8 p-2.5 sm:p-3 rounded-2xl border transition-colors shadow-xs"
        style={{
          borderColor: isDark ? 'var(--color-dark-border)' : 'var(--color-border)',
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'var(--color-surface-subtle)',
        }}
      >
        {/* Left: View Mode Segmented Control */}
        <div
          className="flex items-center gap-1 p-1 rounded-xl border shrink-0"
          style={{
            borderColor: isDark ? 'var(--color-dark-border)' : 'var(--color-border)',
            backgroundColor: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.03)',
          }}
        >
          <button
            type="button"
            onClick={() => setViewMode('mushaf')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
            style={{
              backgroundColor:
                settings.viewMode === 'mushaf' && !settings.showTransliteration && !settings.showTranslation && settings.showArabic
                  ? isDark
                    ? 'var(--color-dark-primary)'
                    : 'var(--color-primary)'
                  : 'transparent',
              color:
                settings.viewMode === 'mushaf' && !settings.showTransliteration && !settings.showTranslation && settings.showArabic
                  ? 'var(--color-on-primary)'
                  : isDark
                    ? 'var(--color-dark-text-secondary)'
                    : 'var(--color-text-secondary)',
            }}
            title="Mode baca mushaf mengalir tanpa jeda (tampilan bawaan)"
          >
            <span className="material-symbols-outlined text-[16px]">menu_book</span>
            <span>Mode Baca</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('ayah')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
            style={{
              backgroundColor:
                settings.viewMode === 'ayah' || settings.showTransliteration || settings.showTranslation || !settings.showArabic
                  ? isDark
                    ? 'var(--color-dark-primary)'
                    : 'var(--color-primary)'
                  : 'transparent',
              color:
                settings.viewMode === 'ayah' || settings.showTransliteration || settings.showTranslation || !settings.showArabic
                  ? 'var(--color-on-primary)'
                  : isDark
                    ? 'var(--color-dark-text-secondary)'
                    : 'var(--color-text-secondary)',
            }}
            title="Mode per ayat dengan pemisahan kartu rapi"
          >
            <span className="material-symbols-outlined text-[16px]">view_agenda</span>
            <span>Per Ayat</span>
          </button>
        </div>

        {/* Right: 3 Elemen Toggles (Arab, Latin, Terjemah) */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className="text-[11px] font-medium mr-1 hidden sm:inline"
            style={{ color: isDark ? 'var(--color-dark-text-muted)' : 'var(--color-text-muted)' }}
          >
            Tampilkan:
          </span>

          {/* Toggle Arab */}
          <button
            type="button"
            onClick={() => toggleElement('arabic')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer active:scale-95 shadow-2xs"
            style={{
              borderColor: settings.showArabic
                ? isDark
                  ? 'var(--color-dark-primary)'
                  : 'var(--color-primary)'
                : isDark
                  ? 'var(--color-dark-border)'
                  : 'var(--color-border)',
              backgroundColor: settings.showArabic
                ? isDark
                  ? 'rgba(198, 161, 91, 0.18)'
                  : 'rgba(154, 119, 56, 0.12)'
                : 'transparent',
              color: settings.showArabic
                ? isDark
                  ? 'var(--color-dark-primary)'
                  : 'var(--color-primary)'
                : isDark
                  ? 'var(--color-dark-text-muted)'
                  : 'var(--color-text-muted)',
            }}
            title="Aktifkan / nonaktifkan teks Arab asli"
          >
            <span
              className="w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold"
              style={{
                backgroundColor: settings.showArabic
                  ? isDark
                    ? 'var(--color-dark-primary)'
                    : 'var(--color-primary)'
                  : isDark
                    ? 'rgba(255,255,255,0.1)'
                    : 'rgba(0,0,0,0.08)',
                color: settings.showArabic ? '#ffffff' : 'inherit',
              }}
            >
              {settings.showArabic ? '✓' : ''}
            </span>
            <span>Arab</span>
          </button>

          {/* Toggle Transliterasi Latin */}
          <button
            type="button"
            onClick={() => toggleElement('transliteration')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer active:scale-95 shadow-2xs"
            style={{
              borderColor: settings.showTransliteration
                ? isDark
                  ? 'var(--color-dark-primary)'
                  : 'var(--color-primary)'
                : isDark
                  ? 'var(--color-dark-border)'
                  : 'var(--color-border)',
              backgroundColor: settings.showTransliteration
                ? isDark
                  ? 'rgba(198, 161, 91, 0.18)'
                  : 'rgba(154, 119, 56, 0.12)'
                : 'transparent',
              color: settings.showTransliteration
                ? isDark
                  ? 'var(--color-dark-primary)'
                  : 'var(--color-primary)'
                : isDark
                  ? 'var(--color-dark-text-muted)'
                  : 'var(--color-text-muted)',
            }}
            title="Aktifkan / nonaktifkan transliterasi latin standar Kemenag RI"
          >
            <span
              className="w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold"
              style={{
                backgroundColor: settings.showTransliteration
                  ? isDark
                    ? 'var(--color-dark-primary)'
                    : 'var(--color-primary)'
                  : isDark
                    ? 'rgba(255,255,255,0.1)'
                    : 'rgba(0,0,0,0.08)',
                color: settings.showTransliteration ? '#ffffff' : 'inherit',
              }}
            >
              {settings.showTransliteration ? '✓' : ''}
            </span>
            <span>Latin</span>
          </button>

          {/* Toggle Terjemahan Indonesia */}
          <button
            type="button"
            onClick={() => toggleElement('translation')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer active:scale-95 shadow-2xs"
            style={{
              borderColor: settings.showTranslation
                ? isDark
                  ? 'var(--color-dark-primary)'
                  : 'var(--color-primary)'
                : isDark
                  ? 'var(--color-dark-border)'
                  : 'var(--color-border)',
              backgroundColor: settings.showTranslation
                ? isDark
                  ? 'rgba(198, 161, 91, 0.18)'
                  : 'rgba(154, 119, 56, 0.12)'
                : 'transparent',
              color: settings.showTranslation
                ? isDark
                  ? 'var(--color-dark-primary)'
                  : 'var(--color-primary)'
                : isDark
                  ? 'var(--color-dark-text-muted)'
                  : 'var(--color-text-muted)',
            }}
            title="Aktifkan / nonaktifkan terjemahan Indonesia standar Kemenag RI"
          >
            <span
              className="w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold"
              style={{
                backgroundColor: settings.showTranslation
                  ? isDark
                    ? 'var(--color-dark-primary)'
                    : 'var(--color-primary)'
                  : isDark
                    ? 'rgba(255,255,255,0.1)'
                    : 'rgba(0,0,0,0.08)',
                color: settings.showTranslation ? '#ffffff' : 'inherit',
              }}
            >
              {settings.showTranslation ? '✓' : ''}
            </span>
            <span>Terjemah</span>
          </button>
        </div>
      </div>

      {/* Quran Reader Canvas */}
      <div className="mb-14 dark:text-white transition-colors">
        {isMultiSurah ? (
          <div className="space-y-12">
            {sections.map((section, sIdx) => (
              <div key={`${section.surahId}-${sIdx}`} className="space-y-6">
                {/* Surah Header Banner */}
                <div
                  className="rounded-2xl p-4 sm:p-5 border text-center transition-colors shadow-xs"
                  style={{
                    borderColor: isDark ? 'var(--color-dark-border)' : 'var(--color-border)',
                    backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'var(--color-surface-subtle)',
                  }}
                >
                  <div className="flex items-center justify-between gap-3 max-w-xl mx-auto">
                    <span
                      className="text-[10px] sm:text-[11px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full shrink-0"
                      style={{
                        backgroundColor: isDark ? 'rgba(198, 161, 91, 0.15)' : 'rgba(154, 119, 56, 0.12)',
                        color: isDark ? 'var(--color-dark-primary)' : 'var(--color-primary)',
                      }}
                    >
                      Surat ke-{sIdx + 1}
                    </span>
                    <span
                      className="text-[13px] sm:text-[15px] font-bold"
                      style={{ color: isDark ? 'var(--color-dark-text)' : 'var(--color-text)' }}
                    >
                      QS. {section.surahMetadata.name} ({section.startAyah}–{section.endAyah})
                    </span>
                    <span
                      className="text-[18px] sm:text-[22px] font-arabic shrink-0"
                      dir="rtl"
                      style={{ color: isDark ? 'var(--color-dark-primary)' : 'var(--color-primary)' }}
                    >
                      {section.surahMetadata.nameArabic}
                    </span>
                  </div>

                  {/* Basmalah for surah starting at ayah 1 (except Al-Fatihah 1 and At-Tawbah 9) */}
                  {section.surahId !== 1 && section.surahId !== 9 && section.startAyah === 1 && (
                    <div className="mt-3.5 pt-3.5 border-t" style={{ borderColor: isDark ? 'var(--color-dark-border)' : 'var(--color-border)' }}>
                      {settings.showArabic && (
                        <div
                          className="font-arabic text-xl sm:text-2xl"
                          style={{ color: isDark ? 'var(--color-dark-text)' : 'var(--color-text)' }}
                        >
                          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                        </div>
                      )}
                      {settings.showTransliteration && (
                        <p
                          className="text-xs sm:text-[13px] italic font-serif mt-1 tracking-wide"
                          style={{ color: isDark ? '#fef3c7' : '#78350f' }}
                        >
                          Bismillāhir-raḥmānir-raḥīm
                        </p>
                      )}
                      {settings.showTranslation && (
                        <p
                          className="text-xs sm:text-[12px] mt-0.5 opacity-80"
                          style={{ color: isDark ? 'var(--color-dark-text-muted)' : 'var(--color-text-muted)' }}
                        >
                          Dengan nama Allah Yang Maha Pengasih lagi Maha Penyayang
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Quran Renderer for this section */}
                <QuranRenderer
                  ayahs={section.ayahs}
                  font={settings.quranFont}
                  fontSize={settings.arabicFontSize}
                  lineHeight={settings.arabicLineHeight}
                  viewMode={settings.viewMode}
                  showArabic={settings.showArabic}
                  showTransliteration={settings.showTransliteration}
                  showTranslation={settings.showTranslation}
                  surahName={section.surahMetadata.name}
                  surahId={section.surahId}
                />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Single surah Basmalah */}
            {sections[0]?.surahId !== 1 &&
              sections[0]?.surahId !== 9 &&
              sections[0]?.startAyah === 1 && (
                <div
                  className="text-center mb-6 py-4 px-3 rounded-2xl border transition-colors shadow-xs"
                  style={{
                    borderColor: isDark ? 'var(--color-dark-border)' : 'var(--color-border)',
                    backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'var(--color-surface-subtle)',
                  }}
                >
                  {settings.showArabic && (
                    <div
                      className="font-arabic text-2xl sm:text-3xl"
                      style={{ color: isDark ? 'var(--color-dark-text)' : 'var(--color-text)' }}
                    >
                      بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                    </div>
                  )}
                  {settings.showTransliteration && (
                    <p
                      className="text-xs sm:text-[13px] italic font-serif mt-1 tracking-wide"
                      style={{ color: isDark ? '#fef3c7' : '#78350f' }}
                    >
                      Bismillāhir-raḥmānir-raḥīm
                    </p>
                  )}
                  {settings.showTranslation && (
                    <p
                      className="text-xs sm:text-[12px] mt-0.5 opacity-80"
                      style={{ color: isDark ? 'var(--color-dark-text-muted)' : 'var(--color-text-muted)' }}
                    >
                      Dengan nama Allah Yang Maha Pengasih lagi Maha Penyayang
                    </p>
                  )}
                </div>
              )}
            <QuranRenderer
              ayahs={resolvedData.ayahs}
              font={settings.quranFont}
              fontSize={settings.arabicFontSize}
              lineHeight={settings.arabicLineHeight}
              viewMode={settings.viewMode}
              showArabic={settings.showArabic}
              showTransliteration={settings.showTransliteration}
              showTranslation={settings.showTranslation}
              surahName={resolvedData.surahMetadata.name}
              surahId={resolvedData.pkg.surahId}
            />
          </>
        )}
      </div>

      {/* Package Bottom Navigation */}
      <div
        className="flex items-center justify-between gap-4 pt-6 pb-12 border-t mt-6"
        style={{ borderColor: isDark ? 'var(--color-dark-border)' : 'var(--color-border)' }}
      >
        {prevPkg ? (
          <button
            type="button"
            onClick={() => navigate(`/paket/${prevPkg.id}`)}
            className="flex items-center gap-3 p-3 sm:px-4 rounded-xl border transition-all hover:bg-black/5 dark:hover:bg-white/5 active:scale-98"
            style={{
              borderColor: isDark ? 'var(--color-dark-border)' : 'var(--color-border)',
              backgroundColor: isDark ? 'var(--color-dark-surface)' : 'var(--color-surface)',
              color: isDark ? 'var(--color-dark-text)' : 'var(--color-text)',
            }}
          >
            <span
              className="material-symbols-outlined text-[20px]"
              style={{ color: isDark ? 'var(--color-dark-primary)' : 'var(--color-primary)' }}
            >
              arrow_back
            </span>
            <div className="text-left">
              <span
                className="block text-[10px] uppercase tracking-wider"
                style={{ color: isDark ? 'var(--color-dark-text-muted)' : 'var(--color-text-muted)' }}
              >
                Sebelumnya
              </span>
              <span className="font-semibold text-xs sm:text-sm">
                {prevPkg.title || `Materi ${prevPkg.order}`}
              </span>
            </div>
          </button>
        ) : <div />}

        {nextPkg ? (
          <button
            type="button"
            onClick={() => navigate(`/paket/${nextPkg.id}`)}
            className="flex items-center gap-3 p-3 sm:px-4 rounded-xl border transition-all hover:bg-black/5 dark:hover:bg-white/5 active:scale-98 ml-auto"
            style={{
              borderColor: isDark ? 'var(--color-dark-border)' : 'var(--color-border)',
              backgroundColor: isDark ? 'var(--color-dark-surface)' : 'var(--color-surface)',
              color: isDark ? 'var(--color-dark-text)' : 'var(--color-text)',
            }}
          >
            <div className="text-right">
              <span
                className="block text-[10px] uppercase tracking-wider"
                style={{ color: isDark ? 'var(--color-dark-text-muted)' : 'var(--color-text-muted)' }}
              >
                Berikutnya
              </span>
              <span className="font-semibold text-xs sm:text-sm">
                {nextPkg.title || `Materi ${nextPkg.order}`}
              </span>
            </div>
            <span
              className="material-symbols-outlined text-[20px]"
              style={{ color: isDark ? 'var(--color-dark-primary)' : 'var(--color-primary)' }}
            >
              arrow_forward
            </span>
          </button>
        ) : <div />}
      </div>
    </div>
  );
}

