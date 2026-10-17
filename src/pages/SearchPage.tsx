import { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { CurriculumService } from '@/services/CurriculumService';
import { getSurahsMetadata, getPackageSnippets } from '@/services/QuranService';
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

  // Filter items based on query and layer filter
  const searchResults = useMemo(() => {
    const q = query.toLowerCase().trim();

    return allItems.filter((item) => {
      // Filter Layer 1
      if (selectedLayer1Id !== 'all' && item.layer1Id !== selectedLayer1Id) return false;

      if (!q) return true;

      const meta = surahs.find((s) => s.id === item.surahId);
      const surahName = meta?.name.toLowerCase() || '';
      const surahNameArabic = meta?.nameArabic || '';
      const title = item.title?.toLowerCase() || '';
      const ayahRangeStr = `${item.startAyah}-${item.endAyah}`;
      const snippetText = snippets[item.id]?.toLowerCase() || '';

      const matchSections = (item.sections || []).some((sec) => {
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
        title.includes(q) ||
        `paket ${item.order}`.includes(q) ||
        ayahRangeStr.includes(q) ||
        (q.includes('ayat') && q.includes(String(item.startAyah))) ||
        snippetText.includes(q) ||
        matchSections
      );
    });
  }, [allItems, surahs, snippets, query, selectedLayer1Id]);

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
          Cari berdasarkan nama card materi, nama surat, ayat, atau lafaz awal ayat.
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
          placeholder="Ketik judul materi, nama surat, atau ayat (misal: Al-Baqarah, Paket 01, 153)..."
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
          {searchResults.map((item) => {
            const meta = surahs.find((s) => s.id === item.surahId);
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

                  {/* Potongan ayat pertama (1 baris / beberapa kata) */}
                  {snippets[item.id] && (
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
                  )}
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
