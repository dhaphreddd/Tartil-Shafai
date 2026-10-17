/**
 * Tartil Shafa'i — Home Page
 *
 * Sections:
 * 1. Hero: Title + Subtitle + Search Bar
 * 2. Volume Selection (Pilih Jilid) — minimal cards dengan badge dinamis
 * 3. Quran Quote (QS. Al-Muzzammil: 4)
 */

import { useEffect, useState, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { CurriculumService } from '@/services/CurriculumService';
import { getSurahsMetadata, getPackageSnippets } from '@/services/QuranService';
import type { Layer1Card, Layer3Item, SurahMetadata } from '@/core/types';
import { formatSurahsTitle, formatSurahsArabic } from '@/utils/PackageTitleFormatter';

export default function HomePage() {
  const navigate = useNavigate();
  const { effective } = useTheme();
  const isDark = effective === 'dark';

  const [searchQuery, setSearchQuery] = useState('');
  const [layers, setLayers] = useState<Layer1Card[]>([]);
  const [pinnedPackages, setPinnedPackages] = useState<Layer3Item[]>([]);
  const [surahs, setSurahs] = useState<SurahMetadata[]>([]);
  const [snippets, setSnippets] = useState<Record<string, string>>({});
  const [allPackages, setAllPackages] = useState<Layer3Item[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    getSurahsMetadata().then((meta) => {
      if (isMounted) setSurahs(meta);
    });

    const unsubscribe = CurriculumService.subscribeToPublishedLayers((publishedLayers) => {
      if (!isMounted) return;
      const allItems = CurriculumService.flattenPublishedItems(publishedLayers);
      const pinned = CurriculumService.filterPinnedItems(publishedLayers);

      setLayers(publishedLayers);
      setAllPackages(allItems);
      setPinnedPackages(pinned);

      // Muat potongan ayat pertama untuk seluruh paket secara paralel
      getPackageSnippets(allItems as any).then((snips) => {
        if (isMounted) {
          setSnippets((prev) => ({ ...prev, ...snips }));
        }
      });
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Tutup dropdown saat klik di luar container pencarian
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Style helpers
  const surface = isDark ? 'var(--color-dark-surface)' : 'var(--color-surface)';
  const container = isDark ? 'var(--color-dark-surface-elevated)' : 'var(--color-surface-container)';
  const primary = isDark ? 'var(--color-dark-primary)' : 'var(--color-primary)';
  const text = isDark ? 'var(--color-dark-text)' : 'var(--color-text)';
  const textSecondary = isDark ? 'var(--color-dark-text-secondary)' : 'var(--color-text-secondary)';
  const textMuted = isDark ? 'var(--color-dark-text-muted)' : 'var(--color-text-muted)';

  // Filter paket secara langsung saat pengguna mengetik (Instant Live Search)
  const liveSearchResults = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];

    return allPackages.filter((pkg) => {
      const meta = surahs.find((s) => s.id === pkg.surahId);
      const surahName = meta?.name.toLowerCase() || '';
      const surahNameArabic = meta?.nameArabic || '';
      const pkgTitle = pkg.title?.toLowerCase() || '';
      const ayahRangeStr = `${pkg.startAyah}-${pkg.endAyah}`;
      const snippetText = snippets[pkg.id]?.toLowerCase() || '';

      const matchSections = (pkg.sections || []).some((sec) => {
        const sMeta = surahs.find((s) => s.id === sec.surahId);
        return (
          sMeta?.name.toLowerCase().includes(q) ||
          sMeta?.nameArabic.includes(q) ||
          `${sec.startAyah}-${sec.endAyah}`.includes(q)
        );
      });

      return (
        surahName.includes(q) ||
        surahNameArabic.includes(q) ||
        pkgTitle.includes(q) ||
        `paket ${pkg.order}`.includes(q) ||
        ayahRangeStr.includes(q) ||
        (q.includes('ayat') && q.includes(String(pkg.startAyah))) ||
        snippetText.includes(q) ||
        matchSections
      );
    });
  }, [allPackages, surahs, snippets, searchQuery]);

  return (
    <div className="flex flex-col w-full">
      {/* Atmospheric top glow */}
      <div className="relative w-full overflow-hidden">
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[720px] h-[360px] rounded-full blur-3xl pointer-events-none -z-10 opacity-30"
          style={{ backgroundColor: primary }}
        />

        <div className="max-w-[1024px] w-full mx-auto px-4 md:px-8 lg:px-12 pt-12 pb-24">
          {/* ===== HERO SECTION ===== */}
          <section
            className="mx-auto flex flex-col items-center text-center animate-fade-in relative z-40"
            style={{ width: '100%', maxWidth: 672 }}
          >
            {/* Title */}
            <h1
              className="tracking-tight font-semibold"
              style={{
                color: text,
                fontSize: 'clamp(32px, 5vw, 44px)',
                lineHeight: 'clamp(40px, 6vw, 52px)',
                letterSpacing: '-0.02em',
              }}
            >
              Tartil Shafa'i
            </h1>

            {/* Subtitle */}
            <p
              className="mt-3 text-[17px] leading-relaxed"
              style={{ color: textSecondary, width: '100%', maxWidth: 576 }}
            >
              Platform digital pembelajaran Tartil Shafa'i
            </p>

            {/* Search Bar with Instant Live Autocomplete */}
            <div ref={searchContainerRef} className="w-full mt-8 relative z-40">
              <div
                className="relative flex items-center rounded-2xl shadow-sm border transition-all duration-200 focus-within:shadow-md"
                style={{
                  backgroundColor: surface,
                  borderColor: isDark ? 'var(--color-dark-border)' : 'var(--color-border)',
                }}
              >
                <span
                  className="material-symbols-outlined ml-4 text-[22px] pointer-events-none"
                  style={{ color: isDark ? 'var(--color-dark-text-muted)' : 'var(--color-outline)' }}
                >
                  search
                </span>
                <input
                  className="w-full h-14 pl-3 pr-24 bg-transparent text-[15px] placeholder:opacity-60 focus:outline-none"
                  id="home-search"
                  placeholder="Ketik untuk mencari materi, surat, atau ayat..."
                  type="text"
                  value={searchQuery}
                  autoComplete="off"
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsDropdownOpen(true);
                    setSelectedIndex(-1);
                  }}
                  onFocus={() => {
                    if (searchQuery.trim().length > 0) {
                      setIsDropdownOpen(true);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setIsDropdownOpen(false);
                      return;
                    }
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      if (!isDropdownOpen && searchQuery.trim()) {
                        setIsDropdownOpen(true);
                        return;
                      }
                      const max = Math.min(liveSearchResults.length, 6);
                      if (max > 0) {
                        setSelectedIndex((prev) => (prev < max - 1 ? prev + 1 : 0));
                      }
                      return;
                    }
                    if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      const max = Math.min(liveSearchResults.length, 6);
                      if (max > 0) {
                        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : max - 1));
                      }
                      return;
                    }
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (selectedIndex >= 0 && selectedIndex < liveSearchResults.length) {
                        navigate(`/paket/${liveSearchResults[selectedIndex].id}`);
                        setIsDropdownOpen(false);
                      } else {
                        const trimmed = searchQuery.trim();
                        navigate(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : '/search');
                        setIsDropdownOpen(false);
                      }
                    }
                  }}
                  style={{ color: text }}
                />

                {/* Tombol Hapus Input (X) */}
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setIsDropdownOpen(false);
                      setSelectedIndex(-1);
                    }}
                    className="mr-2 w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                    style={{ color: textMuted }}
                    aria-label="Hapus kata kunci"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                )}

                {/* Tombol Cari */}
                <button
                  type="button"
                  onClick={() => {
                    const trimmed = searchQuery.trim();
                    navigate(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : '/search');
                    setIsDropdownOpen(false);
                  }}
                  className="mr-3 px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer hover:opacity-90 transition-opacity shrink-0"
                  style={{
                    backgroundColor: primary,
                    color: '#ffffff',
                  }}
                >
                  Cari
                </button>
              </div>

              {/* Instant Live Dropdown List */}
              {isDropdownOpen && searchQuery.trim().length > 0 && (
                <div
                  className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl border shadow-2xl overflow-hidden animate-fade-in text-left"
                  style={{
                    backgroundColor: isDark ? '#1a1f2c' : '#ffffff',
                    borderColor: isDark ? 'var(--color-dark-border)' : 'var(--color-border)',
                    boxShadow: isDark
                      ? '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.1)'
                      : '0 25px 50px -12px rgba(0, 0, 0, 0.22), 0 0 0 1px rgba(0, 0, 0, 0.08)',
                  }}
                >
                  {/* Header ringkasan */}
                  <div
                    className="flex items-center justify-between px-4 py-2.5 border-b text-[11px] font-semibold tracking-wider uppercase"
                    style={{
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                      color: textMuted,
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                      <span>Hasil Langsung</span>
                    </div>
                    <span>{liveSearchResults.length} materi ditemukan</span>
                  </div>

                  {/* List Hasil Pencarian */}
                  {liveSearchResults.length > 0 ? (
                    <div className="max-h-[380px] overflow-y-auto scrollbar-thin divide-y divide-black/5 dark:divide-white/5">
                      {liveSearchResults.slice(0, 6).map((pkg, idx) => {
                        const meta = surahs.find((s) => s.id === pkg.surahId);
                        const isSelected = selectedIndex === idx;
                        const snippet = snippets[pkg.id];
                        const parentL1 = layers.find((l) => l.id === pkg.layer1Id);

                        return (
                          <div
                            key={pkg.id}
                            onMouseEnter={() => setSelectedIndex(idx)}
                            onClick={() => {
                              navigate(`/paket/${pkg.id}`);
                              setIsDropdownOpen(false);
                            }}
                            className="p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-all"
                            style={{
                              backgroundColor: isSelected
                                ? isDark
                                  ? 'rgba(255, 255, 255, 0.08)'
                                  : 'rgba(198, 161, 91, 0.12)'
                                : undefined,
                            }}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                {/* Title Badge */}
                                <span
                                  className="px-2 py-0.5 rounded-md text-[11px] font-bold tracking-wide"
                                  style={{
                                    backgroundColor: isDark ? 'rgba(52, 211, 153, 0.2)' : 'rgba(16, 185, 129, 0.15)',
                                    color: isDark ? '#6ee7b7' : '#059669',
                                  }}
                                >
                                  {pkg.title || `Materi ${pkg.order}`}
                                </span>

                                {/* Parent Layer 1 Badge */}
                                {parentL1 && (
                                  <span
                                    className="px-2 py-0.5 rounded-md text-[11px] font-medium"
                                    style={{
                                      backgroundColor: container,
                                      color: textSecondary,
                                    }}
                                  >
                                    {parentL1.title}
                                  </span>
                                )}

                                {/* Info Surat & Ayat */}
                                <span className="font-semibold text-sm truncate" style={{ color: text }}>
                                  {pkg.sections && pkg.sections.length > 1
                                    ? formatSurahsTitle(pkg.sections, (id) => surahs.find((sm) => sm.id === id)?.name || `Surat ${id}`)
                                    : `QS. ${meta?.name || `Surat ${pkg.surahId}`} (${pkg.startAyah}–${pkg.endAyah})`}
                                </span>
                              </div>

                              {/* Potongan ayat pertama (Arab font) */}
                              {snippet && (
                                <div
                                  className="text-right text-[15px] leading-snug mt-1 opacity-90 truncate"
                                  style={{
                                    fontFamily: '"Noto Naskh Arabic", "Amiri", serif',
                                    color: textSecondary,
                                    direction: 'rtl',
                                  }}
                                >
                                  {snippet}
                                </div>
                              )}
                            </div>

                            {/* Arrow icon */}
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-transform"
                              style={{
                                backgroundColor: isSelected ? primary : container,
                                color: isSelected ? '#ffffff' : textMuted,
                              }}
                            >
                              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                            </div>
                          </div>
                        );
                      })}

                      {/* Tombol Lihat Semua di Footer */}
                      <button
                        type="button"
                        onClick={() => {
                          const trimmed = searchQuery.trim();
                          navigate(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : '/search');
                          setIsDropdownOpen(false);
                        }}
                        className="w-full px-4 py-3 flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer transition-colors hover:opacity-90"
                        style={{
                          backgroundColor: container,
                          color: primary,
                        }}
                      >
                        <span>Lihat semua {liveSearchResults.length} hasil di halaman pencarian</span>
                        <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </button>
                    </div>
                  ) : (
                    <div className="py-8 px-4 text-center">
                      <span className="material-symbols-outlined text-3xl mb-2 opacity-40 block" style={{ color: textMuted }}>
                        search_off
                      </span>
                      <p className="text-sm font-medium" style={{ color: text }}>
                        Tidak ada materi yang cocok dengan "{searchQuery}"
                      </p>
                      <p className="text-xs mt-1" style={{ color: textSecondary }}>
                        Coba cari judul card, nama surat (misal: Al-Baqarah) atau nomor ayat
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* ===== PINNED PACKAGES SECTION ===== */}
          {pinnedPackages.length > 0 && (
            <section className="mt-14 w-full max-w-[896px] mx-auto animate-fade-in relative z-10">
              <div className="flex items-baseline justify-between mb-5">
                <div>
                  <div
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider mb-1"
                    style={{ backgroundColor: container, color: primary }}
                  >
                    <span className="material-symbols-outlined text-[13px]">push_pin</span>
                    <span>Disematkan</span>
                  </div>
                  <h2
                    className="font-semibold"
                    style={{
                      color: text,
                      fontSize: 'clamp(20px, 3.5vw, 26px)',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    Materi Pilihan Hari Ini
                  </h2>
                </div>
                <span className="text-[12px]" style={{ color: textSecondary }}>
                  {pinnedPackages.length} Materi Disematkan
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pinnedPackages.map((pkg) => {
                  const meta = surahs.find((s) => s.id === pkg.surahId);
                  const parentL1 = layers.find((l) => l.id === pkg.layer1Id);

                  return (
                    <Link
                      key={pkg.id}
                      to={`/paket/${pkg.id}`}
                      className="group rounded-2xl p-5 border transition-all duration-200 hover:shadow-md flex flex-col justify-between"
                      style={{
                        backgroundColor: surface,
                        borderColor: isDark ? 'var(--color-dark-border)' : 'var(--color-border)',
                      }}
                    >
                      <div>
                        {/* Badges */}
                        <div className="flex items-center justify-between mb-2.5">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold px-2 py-0.5 rounded"
                              style={{
                                backgroundColor: isDark ? 'rgba(198, 161, 91, 0.15)' : 'rgba(154, 119, 56, 0.12)',
                                color: primary,
                              }}
                            >
                              <span className="material-symbols-outlined text-[12px]">push_pin</span>
                              {pkg.title || `Materi ${pkg.order}`}
                            </span>
                            {parentL1 && (
                              <span className="text-xs" style={{ color: textMuted }}>
                                {parentL1.title}
                              </span>
                            )}
                          </div>

                          <span
                            className="text-[18px] leading-none"
                            dir="rtl"
                            style={{
                              fontFamily: 'var(--font-arabic)',
                              color: textSecondary,
                            }}
                          >
                            {pkg.sections && pkg.sections.length > 1
                              ? formatSurahsArabic(pkg.sections, (id) => surahs.find((sm) => sm.id === id)?.nameArabic || '')
                              : (meta?.nameArabic || '')}
                          </span>
                        </div>

                        {/* Title & Ayah */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3
                            className="text-[17px] font-semibold group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors"
                            style={{ color: text }}
                          >
                            {pkg.sections && pkg.sections.length > 1
                              ? formatSurahsTitle(pkg.sections, (id) => surahs.find((sm) => sm.id === id)?.name || `Surat ${id}`)
                              : `QS. ${meta ? meta.name : `Surat ${pkg.surahId}`}`}
                          </h3>
                          {pkg.sections && pkg.sections.length > 1 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400">
                              {pkg.sections.length} Surat
                            </span>
                          )}
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: textSecondary }}>
                          {pkg.sections && pkg.sections.length > 1
                            ? `${pkg.sections.length} Surat • ${pkg.sections.reduce((sum, s) => sum + (s.endAyah - s.startAyah + 1), 0)} total ayat`
                            : `Ayat ${pkg.startAyah} – ${pkg.endAyah}`}
                        </p>

                        {/* First ayah snippet in proper Arabic font */}
                        {snippets[pkg.id] && (
                          <div
                            dir="rtl"
                            className="mt-2.5 text-[15px] leading-relaxed truncate font-arabic select-none tracking-normal"
                            style={{
                              fontFamily: '"Noto Naskh Arabic", "Amiri", serif',
                              color: primary,
                            }}
                            title={snippets[pkg.id]}
                          >
                            {snippets[pkg.id]}
                          </div>
                        )}
                      </div>

                      {/* Card Footer */}
                      <div
                        className="flex items-center justify-between pt-3.5 mt-3.5 border-t text-[11px]"
                        style={{ borderColor: isDark ? 'var(--color-dark-border)' : 'var(--color-border)' }}
                      >
                        <span style={{ color: textMuted }}>
                          {pkg.endAyah - pkg.startAyah + 1} Ayat Bacaan
                        </span>
                        <span
                          className="inline-flex items-center gap-1 font-semibold transition-transform group-hover:translate-x-1"
                          style={{ color: primary }}
                        >
                          Buka Bacaan
                          <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* ===== 3-LAYER SELECTION (PILIH JILID / KOLEKSI) ===== */}
          <section className="mt-16 w-full max-w-[896px] mx-auto animate-fade-in relative z-10" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-baseline justify-between mb-6">
              <div>
                <span
                  className="text-[11px] font-semibold uppercase tracking-widest"
                  style={{ color: textMuted }}
                >
                  Koleksi Pembelajaran
                </span>
                <h2
                  className="font-semibold mt-0.5"
                  style={{
                    color: text,
                    fontSize: 'clamp(22px, 4vw, 30px)',
                    lineHeight: 'clamp(30px, 5vw, 38px)',
                    letterSpacing: '-0.01em',
                  }}
                >
                  Pilih Koleksi / Jilid
                </h2>
              </div>
              <span className="text-[13px]" style={{ color: textSecondary }}>
                {layers.length} Koleksi Terdata ({allPackages.length} Materi Total)
              </span>
            </div>

            {layers.length === 0 ? (
              <div
                className="rounded-2xl p-8 text-center border"
                style={{
                  backgroundColor: surface,
                  borderColor: isDark ? 'var(--color-dark-border)' : 'var(--color-border)',
                }}
              >
                <span className="material-symbols-outlined text-[36px] mb-2 block opacity-40">dashboard_customize</span>
                <p className="text-sm font-medium" style={{ color: text }}>Belum ada koleksi yang dibuat.</p>
                <p className="text-xs mt-1" style={{ color: textSecondary }}>Anda dapat menambahkan card Jilid, sub-card, dan materi melalui Panel Admin.</p>
                <Link
                  to="/admin/packages"
                  className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-xl text-xs font-semibold"
                  style={{ backgroundColor: primary, color: '#ffffff' }}
                >
                  Buka Panel Admin
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {layers.map((layer, idx) => {
                  const cardCount = (layer.cards || []).length;
                  let itemCount = 0;
                  for (const c of layer.cards || []) {
                    itemCount += (c.items || []).length;
                  }
                  const numStr = String(idx + 1).padStart(2, '0');

                  return (
                    <VolumeCard
                      key={layer.id}
                      number={numStr}
                      title={layer.title}
                      badge={`${cardCount} Sub-Card • ${itemCount} Materi`}
                      linkTo={`/jilid/${layer.id}`}
                      linkLabel={`Buka ${layer.title}`}
                      isDark={isDark}
                      badgeColor={primary}
                    />
                  );
                })}
              </div>
            )}
          </section>

          {/* ===== QURAN QUOTE ===== */}
          <section className="mt-20 w-full max-w-[768px] mx-auto text-center px-4 animate-fade-in relative z-10" style={{ animationDelay: '0.15s' }}>
            <div className="flex justify-center mb-4">
              <span
                className="w-8 h-px"
                style={{ backgroundColor: `${primary}66` }}
              />
            </div>
            <p
              className="leading-loose"
              dir="rtl"
              style={{
                fontFamily: 'var(--font-arabic)',
                fontSize: 'clamp(24px, 4vw, 30px)',
                lineHeight: '72px',
                color: text,
              }}
            >
              وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا
            </p>
            <p
              className="text-[13px] mt-2 italic"
              style={{ color: textSecondary }}
            >
              "Dan bacalah Al-Qur'an itu dengan perlahan-lahan (tartil)."
            </p>
            <span
              className="text-[11px] font-semibold uppercase tracking-widest mt-1 block"
              style={{ color: textMuted }}
            >
              QS. Al-Muzzammil: 4
            </span>
          </section>
        </div>
      </div>
    </div>
  );
}

/* ---------- Sub-component: Volume Card (Clean & Minimal) ---------- */

interface VolumeCardProps {
  number: string;
  title: string;
  badge: string;
  linkTo: string;
  linkLabel: string;
  isDark: boolean;
  badgeColor: string;
}

function VolumeCard({
  number,
  title,
  badge,
  linkTo,
  linkLabel,
  isDark,
  badgeColor,
}: VolumeCardProps) {
  const surface = isDark ? 'var(--color-dark-surface)' : 'var(--color-surface)';
  const surfaceSubtle = isDark ? 'var(--color-dark-surface-elevated)' : 'var(--color-surface-subtle)';
  const container = isDark ? 'var(--color-dark-surface-elevated)' : 'var(--color-surface-container)';
  const text = isDark ? 'var(--color-dark-text)' : 'var(--color-text)';
  const primary = isDark ? 'var(--color-dark-primary)' : 'var(--color-primary)';
  const onPrimary = 'var(--color-on-primary)';
  const containerHigh = isDark ? 'var(--color-dark-border)' : 'var(--color-surface-container-high)';

  return (
    <div
      className="group relative rounded-xl p-8 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between"
      style={{ backgroundColor: surface }}
    >
      <div>
        <div className="flex items-center justify-between">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all"
            style={{ backgroundColor: container, color: badgeColor }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: badgeColor }}
            />
            {badge}
          </span>
          <span
            className="font-semibold text-[22px] select-none transition-colors"
            style={{ color: containerHigh }}
          >
            {number}
          </span>
        </div>
        <div className="mt-6">
          <h3
            className="font-semibold transition-colors"
            style={{
              color: text,
              fontSize: 'clamp(24px, 4vw, 32px)',
              lineHeight: 'clamp(32px, 5vw, 40px)',
              letterSpacing: '-0.01em',
            }}
          >
            {title}
          </h3>
        </div>
      </div>
      <div className="mt-8 pt-4">
        <Link
          to={linkTo}
          className="inline-flex items-center justify-between w-full h-11 px-4 rounded-lg font-medium text-[14px] transition-colors group-hover:text-white"
          style={{
            backgroundColor: surfaceSubtle,
            color: text,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = primary as string;
            (e.currentTarget as HTMLElement).style.color = onPrimary;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = surfaceSubtle as string;
            (e.currentTarget as HTMLElement).style.color = text as string;
          }}
        >
          <span className="font-medium">{linkLabel}</span>
          <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
            arrow_forward
          </span>
        </Link>
      </div>
    </div>
  );
}
