import { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { CurriculumService } from '@/services/CurriculumService';
import { getSurahsMetadata, getPackageSnippets } from '@/services/QuranService';
import { searchPackages, preloadPackageSurahs, subscribeSearchCache, type SearchResultItem } from '@/services/SearchService';
import type { Layer1Card, Layer3Item, SurahMetadata } from '@/core/types';
import { formatSurahsTitle, formatSurahsArabic } from '@/utils/PackageTitleFormatter';

export default function SearchPage() {
  const { effective } = useTheme();
  const isDark = effective === 'dark';
  const [searchParams, setSearchParams] = useSearchParams();

  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [selectedLayer1Id, setSelectedLayer1Id] = useState<string>('all');

  const [layers, setLayers] = useState<Layer1Card[]>([]);
  const [allItems, setAllItems] = useState<Layer3Item[]>([]);
  const [surahs, setSurahs] = useState<SurahMetadata[]>([]);
  const [snippets, setSnippets] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [cacheTick, setCacheTick] = useState(0);

  useEffect(() => {
    return subscribeSearchCache(() => {
      setCacheTick((t) => t + 1);
    });
  }, []);

  // Sync state if URL search query changes
  useEffect(() => {
    const q = searchParams.get('q') || '';
    setQuery(q);
  }, [searchParams]);

  // Load layers & items & surah metadata
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    getSurahsMetadata().then((meta) => {
      if (isMounted) setSurahs(meta);
    });

    const unsubscribe = CurriculumService.subscribeToPublishedLayers((publishedLayers) => {
      if (!isMounted) return;
      const items = CurriculumService.flattenPublishedItems(publishedLayers);

      setLayers(publishedLayers);
      setAllItems(items);
      preloadPackageSurahs(items);

      getPackageSnippets(items as any).then((snips) => {
        if (isMounted) {
          setSnippets((prev) => ({ ...prev, ...snips }));
        }
      });
      setLoading(false);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (val.trim()) {
      setSearchParams({ q: val.trim() }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  // Filter items based on query and layer filter (menggunakan SearchService cerdas)
  const searchResults: SearchResultItem[] = useMemo(() => {
    return searchPackages(query, allItems, surahs, { layer1Id: selectedLayer1Id });
  }, [allItems, surahs, query, selectedLayer1Id, cacheTick]);

  return (
    <div className="max-w-[896px] w-full mx-auto px-4 md:px-8 lg:px-12 py-10 animate-fade-in">
      {/* Title */}
      <div className="mb-6">
        <h1
          className="font-bold tracking-tight text-2xl md:text-3xl"
          style={{ color: isDark ? 'var(--color-dark-text)' : 'var(--color-text)' }}
        >
          Pencarian Materi & Maqra'
        </h1>
        <p
          className="text-sm mt-1"
          style={{ color: isDark ? 'var(--color-dark-text-secondary)' : 'var(--color-text-secondary)' }}
        >
          Cari berdasarkan teks Arab (dengan/tanpa harakat), transliterasi Latin & ejaan bacaan, terjemahan Kemenag, atau nama surat.
        </p>
      </div>

      {/* Search Input Box */}
      <div
        className="flex items-center rounded-2xl border shadow-sm transition-all duration-200 focus-within:shadow-md mb-4"
        style={{
          backgroundColor: isDark ? 'var(--color-dark-surface)' : 'var(--color-surface)',
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
          className="w-full h-13 pl-3 pr-4 bg-transparent text-[15px] placeholder:opacity-60 focus:outline-none"
          id="search-page-input"
          placeholder="Cari materi, teks Arab, transliterasi bunyi ayat, terjemahan, atau surat..."
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          autoFocus
          style={{ color: isDark ? 'var(--color-dark-text)' : 'var(--color-text)' }}
        />
        {query && (
          <button
            type="button"
            onClick={() => handleQueryChange('')}
            className="mr-3 w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-black/5 dark:hover:bg-white/10"
            style={{ color: isDark ? 'var(--color-dark-text-muted)' : 'var(--color-text-muted)' }}
            aria-label="Hapus pencarian"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        )}
      </div>

      {/* Dynamic Layer 1 Filter Tabs & Result Count */}
      <div
        className="flex items-center justify-between pb-4 mb-6 border-b overflow-x-auto gap-4"
        style={{ borderColor: isDark ? 'var(--color-dark-border)' : 'var(--color-border)' }}
      >
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setSelectedLayer1Id('all')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
            style={{
              backgroundColor:
                selectedLayer1Id === 'all'
                  ? isDark
                    ? 'var(--color-dark-primary)'
                    : 'var(--color-primary)'
                  : 'transparent',
              color:
                selectedLayer1Id === 'all'
                  ? '#ffffff'
                  : isDark
                    ? 'var(--color-dark-text-secondary)'
                    : 'var(--color-text-secondary)',
            }}
          >
            Semua Koleksi
          </button>

          {layers.map((layer) => {
            const isActive = selectedLayer1Id === layer.id;
            return (
              <button
                key={layer.id}
                type="button"
                onClick={() => setSelectedLayer1Id(layer.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap"
                style={{
                  backgroundColor: isActive
                    ? isDark
                      ? 'var(--color-dark-primary)'
                      : 'var(--color-primary)'
                    : 'transparent',
                  color: isActive
                    ? '#ffffff'
                    : isDark
                      ? 'var(--color-dark-text-secondary)'
                      : 'var(--color-text-secondary)',
                }}
              >
                {layer.title}
              </button>
            );
          })}
        </div>

        <span
          className="text-xs font-medium shrink-0"
          style={{ color: isDark ? 'var(--color-dark-text-muted)' : 'var(--color-text-muted)' }}
        >
          {loading ? 'Memuat...' : `${searchResults.length} Materi Ditemukan`}
        </span>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="py-16 text-center animate-pulse-soft">
          <span
            className="text-sm"
            style={{ color: isDark ? 'var(--color-dark-text-muted)' : 'var(--color-text-muted)' }}
          >
            Memuat data materi dan potongan ayat...
          </span>
        </div>
      )}

      {/* Empty Result */}
      {!loading && searchResults.length === 0 && (
        <div
          className="rounded-2xl p-12 text-center border"
          style={{
            backgroundColor: isDark ? 'var(--color-dark-surface)' : 'var(--color-surface)',
            borderColor: isDark ? 'var(--color-dark-border)' : 'var(--color-border)',
          }}
        >
          <span
            className="material-symbols-outlined text-[48px] mb-3 block opacity-50"
            style={{ color: isDark ? 'var(--color-dark-text-muted)' : 'var(--color-text-muted)' }}
          >
            search_off
          </span>
          <h3
            className="text-base font-semibold mb-1"
            style={{ color: isDark ? 'var(--color-dark-text)' : 'var(--color-text)' }}
          >
            Tidak ada materi yang cocok
          </h3>
          <p
            className="text-xs max-w-sm mx-auto"
            style={{ color: isDark ? 'var(--color-dark-text-secondary)' : 'var(--color-text-secondary)' }}
          >
            Tidak ditemukan materi dengan kata kunci "{query}". Coba cari berdasarkan judul materi atau nama surat lain.
          </p>
        </div>
      )}

      {/* Search Result Cards Grid */}
      {!loading && searchResults.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {searchResults.map((res) => {
            const item = res.item;
            const meta = res.surahMetadata || surahs.find((s) => s.id === item.surahId);
            const ayahCount = item.endAyah - item.startAyah + 1;
            const parentLayer = layers.find((l) => l.id === item.layer1Id);

            return (
              <Link
                key={item.id}
                to={`/paket/${item.id}`}
                className="group rounded-2xl p-5 border transition-all duration-200 hover:shadow-md flex flex-col justify-between"
                style={{
                  backgroundColor: isDark ? 'var(--color-dark-surface)' : 'var(--color-surface)',
                  borderColor: isDark ? 'var(--color-dark-border)' : 'var(--color-border)',
                }}
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: isDark
                            ? 'var(--color-dark-surface-elevated)'
                            : 'var(--color-surface-container)',
                          color: isDark ? 'var(--color-dark-primary)' : 'var(--color-primary)',
                        }}
                      >
                        {item.title || `Materi ${item.order}`}
                      </span>
                      {item.isPinned && (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.2 rounded-full"
                          style={{
                            backgroundColor: isDark ? 'rgba(217, 119, 6, 0.2)' : 'rgba(217, 119, 6, 0.12)',
                            color: '#d97706',
                          }}
                          title="Disematkan di Beranda Utama"
                        >
                          <span
                            className="material-symbols-outlined text-[12px]"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            push_pin
                          </span>
                          <span>Disematkan</span>
                        </span>
                      )}
                      {parentLayer && (
                        <span
                          className="text-xs font-medium"
                          style={{
                            color: isDark ? 'var(--color-dark-text-muted)' : 'var(--color-text-muted)',
                          }}
                        >
                          {parentLayer.title}
                        </span>
                      )}
                    </div>

                    <span
                      className="text-[18px] leading-none"
                      dir="rtl"
                      style={{
                        fontFamily: 'var(--font-arabic)',
                        color: isDark ? 'var(--color-dark-text-secondary)' : 'var(--color-text-secondary)',
                      }}
                    >
                      {item.sections && item.sections.length > 1
                        ? formatSurahsArabic(item.sections, (id) => surahs.find((sm) => sm.id === id)?.nameArabic || '')
                        : (meta?.nameArabic || '')}
                    </span>
                  </div>

                  {/* Surah & Ayah */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3
                      className="text-[16px] font-semibold group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors"
                      style={{ color: isDark ? 'var(--color-dark-text)' : 'var(--color-text)' }}
                    >
                      {item.sections && item.sections.length > 1
                        ? formatSurahsTitle(item.sections, (id) => surahs.find((sm) => sm.id === id)?.name || `Surat ${id}`)
                        : `QS. ${meta ? meta.name : `Surat ${item.surahId}`}`}
                    </h3>
                    {item.sections && item.sections.length > 1 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400">
                        {item.sections.length} Surat
                      </span>
                    )}
                  </div>
                  <p
                    className="text-xs mt-0.5"
                    style={{
                      color: isDark ? 'var(--color-dark-text-secondary)' : 'var(--color-text-secondary)',
                    }}
                  >
                    {item.sections && item.sections.length > 1
                      ? `${item.sections.length} Surat • ${item.sections.reduce((sum, s) => sum + (s.endAyah - s.startAyah + 1), 0)} total ayat`
                      : `Ayat ${item.startAyah} – ${item.endAyah}`}
                  </p>

                  {/* Highlight Snippet yang Cocok */}
                  {res.matchType === 'arab' && res.snippetText ? (
                    <div className="mt-3 p-2.5 rounded-xl border bg-emerald-500/5 dark:bg-emerald-400/5 border-emerald-500/20">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
                        Cocok Teks Arab {res.matchedAyahNumber ? `• Ayat ${res.matchedAyahNumber}` : ''}
                      </span>
                      <div
                        dir="rtl"
                        className="text-right text-[16px] leading-relaxed font-arabic text-emerald-800 dark:text-emerald-300"
                        style={{ fontFamily: '"Noto Naskh Arabic", "Amiri", serif' }}
                      >
                        {res.snippetText}
                      </div>
                    </div>
                  ) : res.matchType === 'transliterasi' && res.snippetText ? (
                    <div className="mt-3 p-2.5 rounded-xl border bg-amber-500/5 dark:bg-amber-400/5 border-amber-500/20">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block mb-0.5">
                        Cocok Transliterasi {res.matchedAyahNumber ? `• Ayat ${res.matchedAyahNumber}` : ''}
                      </span>
                      <p className="text-xs italic leading-relaxed" style={{ color: isDark ? 'var(--color-dark-text-secondary)' : 'var(--color-text-secondary)' }}>
                        "{res.snippetText}"
                      </p>
                    </div>
                  ) : res.matchType === 'terjemah' && res.snippetText ? (
                    <div className="mt-3 p-2.5 rounded-xl border bg-sky-500/5 dark:bg-sky-400/5 border-sky-500/20">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400 block mb-0.5">
                        Cocok Terjemahan Kemenag {res.matchedAyahNumber ? `• Ayat ${res.matchedAyahNumber}` : ''}
                      </span>
                      <p className="text-xs leading-relaxed" style={{ color: isDark ? 'var(--color-dark-text-secondary)' : 'var(--color-text-secondary)' }}>
                        "{res.snippetText}"
                      </p>
                    </div>
                  ) : snippets[item.id] ? (
                    <div
                      dir="rtl"
                      className="mt-2.5 text-[15px] leading-relaxed truncate font-arabic select-none tracking-normal"
                      style={{
                        fontFamily: '"Noto Naskh Arabic", "Amiri", serif',
                        color: isDark ? 'var(--color-dark-primary)' : 'var(--color-primary)',
                      }}
                      title={snippets[item.id]}
                    >
                      {snippets[item.id]}
                    </div>
                  ) : null}
                </div>

                {/* Footer of Card */}
                <div
                  className="flex items-center justify-between pt-3.5 mt-3.5 border-t text-[11px]"
                  style={{ borderColor: isDark ? 'var(--color-dark-border)' : 'var(--color-border)' }}
                >
                  <span
                    style={{ color: isDark ? 'var(--color-dark-text-muted)' : 'var(--color-text-muted)' }}
                  >
                    {ayahCount} Ayat Bacaan
                  </span>
                  <span
                    className="inline-flex items-center gap-1 font-semibold transition-transform group-hover:translate-x-1"
                    style={{ color: isDark ? 'var(--color-dark-primary)' : 'var(--color-primary)' }}
                  >
                    Buka Bacaan
                    <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
