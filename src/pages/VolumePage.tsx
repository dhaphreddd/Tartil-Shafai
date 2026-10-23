import { useEffect, useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CurriculumService } from '@/services/CurriculumService';
import { getSurahsMetadata, getPackageSnippets } from '@/services/QuranService';
import { matchItem, preloadPackageSurahs, subscribeSearchCache } from '@/services/SearchService';
import type { Layer1Card, Layer3Item, SurahMetadata } from '@/core/types';
import { formatSurahsTitle, formatSurahsArabic } from '@/utils/PackageTitleFormatter';
import { useTheme } from '@/contexts/ThemeContext';

interface CachedVolumeState {
  currentLayer: Layer1Card | null;
  allLayers: Layer1Card[];
  surahs: SurahMetadata[];
  snippets: Record<string, string>;
  scrollY?: number;
}

const volumeStateCache = new Map<string, CachedVolumeState>();

export default function VolumePage() {
  const { volumeId } = useParams<{ volumeId: string }>();
  const { effective } = useTheme();
  const isDark = effective === 'dark';

  const targetId = volumeId || '1';
  const cached = volumeStateCache.get(targetId);

  const [allLayers, setAllLayers] = useState<Layer1Card[]>(() => cached?.allLayers || []);
  const [currentLayer, setCurrentLayer] = useState<Layer1Card | null>(() => cached?.currentLayer || null);
  const [surahs, setSurahs] = useState<SurahMetadata[]>(() => cached?.surahs || []);
  const [snippets, setSnippets] = useState<Record<string, string>>(() => cached?.snippets || {});
  const [loading, setLoading] = useState(() => !cached);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLayer2Id, setSelectedLayer2Id] = useState<string>('all');
  const [cacheTick, setCacheTick] = useState(0);

  useEffect(() => {
    return subscribeSearchCache(() => {
      setCacheTick((t) => t + 1);
    });
  }, []);

  useEffect(() => {
    if (currentLayer?.cards) {
      const items = currentLayer.cards.flatMap((c) => c.items || []);
      if (items.length > 0) {
        preloadPackageSurahs(items);
      }
    }
  }, [currentLayer]);

  // Restore scroll position when returning
  useEffect(() => {
    if (cached?.scrollY && cached.scrollY > 0) {
      const targetScroll = cached.scrollY;
      requestAnimationFrame(() => {
        window.scrollTo({ top: targetScroll, behavior: 'instant' });
      });
    }
  }, [targetId]);

  // Record scroll position before unmount
  useEffect(() => {
    return () => {
      const item = volumeStateCache.get(targetId);
      if (item) {
        item.scrollY = window.scrollY;
      }
    };
  }, [targetId]);

  useEffect(() => {
    let isMounted = true;
    if (!volumeStateCache.has(targetId)) {
      setLoading(true);
    }
    setError(null);

    getSurahsMetadata().then((surahMeta) => {
      if (isMounted) setSurahs(surahMeta);
    });

    const unsubscribe = CurriculumService.subscribeToPublishedLayers((layers) => {
      if (!isMounted) return;
      setAllLayers(layers);

      // Find active layer by ID or alias
      const searchId = volumeId || 'j1';
      let found = layers.find((l) => l.id === searchId || l.id.toLowerCase() === searchId.toLowerCase());
      if (!found) {
        if (searchId === '1' || searchId === 'volume-1' || searchId === 'j1') found = layers[0];
        else if (searchId === '2' || searchId === 'volume-2' || searchId === 'j2') found = layers[1] || layers[0];
      }
      if (!found && layers.length > 0) {
        found = layers[0];
      }

      setCurrentLayer(found || null);

      if (found) {
        const allItems: Layer3Item[] = [];
        for (const card of found.cards || []) {
          for (const item of card.items || []) {
            allItems.push(item);
          }
        }
        getPackageSnippets(allItems as any).then((snips) => {
          if (isMounted) {
            setSnippets((prev) => {
              const updated = { ...prev, ...snips };
              // Update memory cache
              volumeStateCache.set(targetId, {
                currentLayer: found || null,
                allLayers: layers,
                surahs,
                snippets: updated,
                scrollY: volumeStateCache.get(targetId)?.scrollY || 0,
              });
              return updated;
            });
          }
        });
      }
      setLoading(false);

      // Update memory cache
      volumeStateCache.set(targetId, {
        currentLayer: found || null,
        allLayers: layers,
        surahs,
        snippets,
        scrollY: volumeStateCache.get(targetId)?.scrollY || 0,
      });
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [volumeId]);

  // Filtered Layer 2 Cards and Layer 3 Items
  const filteredLayer2Cards = useMemo(() => {
    if (!currentLayer) return [];

    const q = searchQuery.toLowerCase().trim();

    return (currentLayer.cards || [])
      .filter((card) => {
        if (selectedLayer2Id !== 'all' && card.id !== selectedLayer2Id) return false;
        return true;
      })
      .map((card) => {
        const filteredItems = (card.items || []).filter((item) => {
          if (!q) return true;
          return matchItem(item, q, surahs) !== null;
        });

        return {
          ...card,
          items: filteredItems,
        };
      })
      .filter((card) => {
        // If searching, only show cards that have matching items OR card title matches
        if (!q) return true;
        const cardTitleMatch = card.title.toLowerCase().includes(q);
        return cardTitleMatch || card.items.length > 0;
      });
  }, [currentLayer, searchQuery, selectedLayer2Id, surahs, cacheTick]);

  const totalItemsCount = useMemo(() => {
    if (!currentLayer) return 0;
    let count = 0;
    for (const c of currentLayer.cards || []) {
      count += (c.items || []).length;
    }
    return count;
  }, [currentLayer]);

  if (loading) {
    return (
      <div className="max-w-[896px] w-full mx-auto px-4 md:px-8 py-20 text-center animate-pulse-soft">
        <span className="text-[14px]" style={{ color: isDark ? 'var(--color-dark-text-muted)' : 'var(--color-text-muted)' }}>
          Memuat susunan koleksi...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-[896px] w-full mx-auto px-4 md:px-8 py-20 text-center">
        <span className="material-symbols-outlined text-[48px] mb-4 block" style={{ color: 'var(--color-error)' }}>
          error
        </span>
        <p className="text-[15px]" style={{ color: 'var(--color-error)' }}>{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 px-4 py-2 rounded-lg text-[13px] font-medium"
          style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
        >
          Muat Ulang
        </button>
      </div>
    );
  }

  if (!currentLayer) {
    return (
      <div className="max-w-[896px] w-full mx-auto px-4 md:px-8 py-20 text-center">
        <h2 className="text-[20px] font-medium mb-2" style={{ color: 'var(--color-text)' }}>
          Koleksi Tidak Ditemukan
        </h2>
        <p className="text-[13px] mb-4" style={{ color: 'var(--color-text-muted)' }}>
          Koleksi ini belum dibuat atau belum diterbitkan.
        </p>
        <Link to="/" className="text-[14px] hover:underline" style={{ color: 'var(--color-primary)' }}>
          Kembali ke Beranda
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[960px] w-full mx-auto px-4 md:px-8 lg:px-12 py-10 animate-fade-in">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-[13px] mb-8">
        <Link
          to="/"
          className="transition-colors hover:opacity-75"
          style={{ color: isDark ? 'var(--color-dark-text-secondary)' : 'var(--color-text-secondary)' }}
        >
          Beranda
        </Link>
        <span style={{ color: isDark ? 'var(--color-dark-text-muted)' : 'var(--color-text-muted)' }}>/</span>
        <span style={{ color: isDark ? 'var(--color-dark-primary)' : 'var(--color-primary)' }} className="font-medium">
          {currentLayer.title}
        </span>
      </div>

      {/* Layer 1 Switcher Tabs (e.g. Jilid 1, Jilid 2, or custom collections) */}
      {allLayers.length > 1 && (
        <div
          className="flex items-center gap-2 p-1.5 rounded-xl mb-10 w-fit overflow-x-auto scrollbar-none"
          style={{ backgroundColor: isDark ? 'var(--color-dark-surface)' : 'var(--color-surface-container-low)' }}
        >
          {allLayers.map((layer) => {
            const isActive = layer.id === currentLayer.id;
            return (
              <Link
                key={layer.id}
                to={`/jilid/${layer.id}`}
                className="px-5 py-2 rounded-lg text-[13px] font-medium transition-all whitespace-nowrap"
                style={{
                  backgroundColor: isActive
                    ? isDark
                      ? 'var(--color-dark-surface-elevated)'
                      : 'var(--color-surface)'
                    : 'transparent',
                  color: isActive
                    ? isDark
                      ? 'var(--color-dark-text)'
                      : 'var(--color-text)'
                    : isDark
                      ? 'var(--color-dark-text-muted)'
                      : 'var(--color-text-muted)',
                  boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                {layer.title}
              </Link>
            );
          })}
        </div>
      )}

      {/* Header Banner for Layer 1 */}
      <div
        className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b"
        style={{ borderColor: isDark ? 'var(--color-dark-border)' : 'var(--color-border)' }}
      >
        <div>
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider mb-3"
            style={{
              backgroundColor: isDark ? 'var(--color-dark-surface-elevated)' : 'var(--color-surface-container)',
              color: isDark ? 'var(--color-dark-primary)' : 'var(--color-primary)',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: isDark ? 'var(--color-dark-primary)' : 'var(--color-primary)' }}
            />
            {currentLayer.badge || currentLayer.title}
          </div>
          <h1
            className="font-semibold tracking-tight"
            style={{
              color: isDark ? 'var(--color-dark-text)' : 'var(--color-text)',
              fontSize: 'clamp(26px, 4vw, 34px)',
              lineHeight: '1.2',
            }}
          >
            {currentLayer.title}
          </h1>
          {currentLayer.description && (
            <p
              className="text-[15px] mt-2 max-w-xl leading-relaxed"
              style={{ color: isDark ? 'var(--color-dark-text-secondary)' : 'var(--color-text-secondary)' }}
            >
              {currentLayer.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className="text-[13px] font-medium px-3.5 py-1.5 rounded-xl border"
            style={{
              backgroundColor: isDark ? 'var(--color-dark-surface)' : 'var(--color-surface-container)',
              borderColor: isDark ? 'var(--color-dark-border)' : 'var(--color-border)',
              color: isDark ? 'var(--color-dark-text-secondary)' : 'var(--color-text-secondary)',
            }}
          >
            {(currentLayer.cards || []).length} Sub-Card • {totalItemsCount} Materi
          </span>
        </div>
      </div>

      {/* Search & Sub-Card Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        {/* Layer 2 Tabs Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedLayer2Id('all')}
            className="px-3.5 py-1.5 rounded-lg text-[12px] font-medium tracking-wide transition-colors whitespace-nowrap cursor-pointer"
            style={{
              backgroundColor:
                selectedLayer2Id === 'all'
                  ? isDark
                    ? 'var(--color-dark-primary)'
                    : 'var(--color-primary)'
                  : isDark
                    ? 'var(--color-dark-surface)'
                    : 'var(--color-surface)',
              color:
                selectedLayer2Id === 'all'
                  ? 'var(--color-on-primary)'
                  : isDark
                    ? 'var(--color-dark-text-secondary)'
                    : 'var(--color-text-secondary)',
              border: `1px solid ${
                selectedLayer2Id === 'all' ? 'transparent' : isDark ? 'var(--color-dark-border)' : 'var(--color-border)'
              }`,
            }}
          >
            Semua Sub-Card ({totalItemsCount})
          </button>

          {(currentLayer.cards || []).map((card) => {
            const isActive = selectedLayer2Id === card.id;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => setSelectedLayer2Id(card.id)}
                className="px-3.5 py-1.5 rounded-lg text-[12px] font-medium tracking-wide transition-colors whitespace-nowrap cursor-pointer"
                style={{
                  backgroundColor: isActive
                    ? isDark
                      ? 'var(--color-dark-primary)'
                      : 'var(--color-primary)'
                    : isDark
                      ? 'var(--color-dark-surface)'
                      : 'var(--color-surface)',
                  color: isActive
                    ? 'var(--color-on-primary)'
                    : isDark
                      ? 'var(--color-dark-text-secondary)'
                      : 'var(--color-text-secondary)',
                  border: `1px solid ${
                    isActive ? 'transparent' : isDark ? 'var(--color-dark-border)' : 'var(--color-border)'
                  }`,
                }}
              >
                {card.title} ({(card.items || []).length})
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-64">
          <span
            className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] pointer-events-none"
            style={{ color: isDark ? 'var(--color-dark-text-muted)' : 'var(--color-text-muted)' }}
          >
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari materi / ayat..."
            className="w-full h-9 pl-9 pr-8 rounded-lg text-[13px] bg-transparent outline-none transition-colors border"
            style={{
              borderColor: isDark ? 'var(--color-dark-border)' : 'var(--color-border)',
              backgroundColor: isDark ? 'var(--color-dark-surface)' : 'var(--color-surface)',
              color: isDark ? 'var(--color-dark-text)' : 'var(--color-text)',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[14px] hover:opacity-75"
              style={{ color: isDark ? 'var(--color-dark-text-muted)' : 'var(--color-text-muted)' }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ===== LAYER 2 CARDS (CONTAINERS) WITH NESTED LAYER 3 ITEMS ===== */}
      {filteredLayer2Cards.length === 0 ? (
        <div
          className="rounded-2xl p-12 text-center border"
          style={{
            backgroundColor: isDark ? 'var(--color-dark-surface)' : 'var(--color-surface)',
            borderColor: isDark ? 'var(--color-dark-border)' : 'var(--color-border)',
          }}
        >
          <span
            className="material-symbols-outlined text-[44px] mb-3 block opacity-50"
            style={{ color: isDark ? 'var(--color-dark-text-muted)' : 'var(--color-text-muted)' }}
          >
            search_off
          </span>
          <h3 className="text-[16px] font-medium mb-1" style={{ color: isDark ? 'var(--color-dark-text)' : 'var(--color-text)' }}>
            Tidak ada materi yang sesuai
          </h3>
          <p className="text-[13px]" style={{ color: isDark ? 'var(--color-dark-text-secondary)' : 'var(--color-text-secondary)' }}>
            Coba ubah kata kunci pencarian atau pilih filter sub-card lainnya.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {filteredLayer2Cards.map((l2Card) => {
            return (
              <div
                key={l2Card.id}
                className="rounded-2xl p-6 sm:p-7 border transition-all"
                style={{
                  backgroundColor: isDark ? 'var(--color-dark-surface)' : 'var(--color-surface)',
                  borderColor: isDark ? 'var(--color-dark-border)' : 'var(--color-border)',
                  boxShadow: '0 4px 20px -8px rgba(0,0,0,0.06)',
                }}
              >
                {/* Layer 2 Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 mb-6 border-b gap-3" style={{ borderColor: isDark ? 'var(--color-dark-border)' : 'var(--color-border)' }}>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-primary)' }} />
                      <h2
                        className="text-[19px] font-semibold tracking-tight"
                        style={{ color: isDark ? 'var(--color-dark-text)' : 'var(--color-text)' }}
                      >
                        {l2Card.title}
                      </h2>
                    </div>
                    {l2Card.description && (
                      <p
                        className="text-[13px] mt-1 pl-4"
                        style={{ color: isDark ? 'var(--color-dark-text-secondary)' : 'var(--color-text-secondary)' }}
                      >
                        {l2Card.description}
                      </p>
                    )}
                  </div>

                  <span
                    className="inline-flex items-center text-[11px] font-mono px-2.5 py-1 rounded-md w-fit"
                    style={{
                      backgroundColor: isDark ? 'var(--color-dark-surface-elevated)' : 'var(--color-surface-container)',
                      color: isDark ? 'var(--color-dark-text-muted)' : 'var(--color-text-muted)',
                    }}
                  >
                    {l2Card.items.length} Materi
                  </span>
                </div>

                {/* Layer 3 Items Grid inside this Layer 2 card */}
                {l2Card.items.length === 0 ? (
                  <div className="py-8 text-center text-[13px]" style={{ color: isDark ? 'var(--color-dark-text-muted)' : 'var(--color-text-muted)' }}>
                    Belum ada materi di dalam card ini.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {l2Card.items.map((item) => {
                      const meta = surahs.find((s) => s.id === item.surahId);
                      const ayahSpan = item.endAyah - item.startAyah + 1;
                      const snippet = snippets[item.id];

                      return (
                        <Link
                          key={item.id}
                          to={`/paket/${item.id}`}
                          className="group rounded-xl p-5 border transition-all duration-200 hover:shadow-md flex flex-col justify-between"
                          style={{
                            backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'var(--color-surface-subtle)',
                            borderColor: isDark ? 'var(--color-dark-border)' : 'var(--color-border)',
                          }}
                        >
                          <div>
                            {/* Card Top: Title Badge & Arabic Name */}
                            <div className="flex items-center justify-between mb-2.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded"
                                  style={{
                                    backgroundColor: isDark ? 'rgba(198, 161, 91, 0.15)' : 'rgba(154, 119, 56, 0.12)',
                                    color: isDark ? 'var(--color-dark-primary)' : 'var(--color-primary)',
                                  }}
                                >
                                  {item.title || `Materi ${item.order}`}
                                </span>

                                {item.isPinned && (
                                  <span
                                    className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
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
                              </div>

                              <span
                                className="text-[19px] leading-none"
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

                            {/* Surah Name & Ayah Range */}
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
                              className="text-[12px] mt-0.5"
                              style={{ color: isDark ? 'var(--color-dark-text-secondary)' : 'var(--color-text-secondary)' }}
                            >
                              {item.sections && item.sections.length > 1
                                ? `${item.sections.length} Surat • ${item.sections.reduce((sum, s) => sum + (s.endAyah - s.startAyah + 1), 0)} total ayat`
                                : `Ayat ${item.startAyah} – ${item.endAyah}`}
                            </p>

                            {/* Arabic Preview Snippet */}
                            {snippet && (
                              <div
                                dir="rtl"
                                className="mt-2 text-[14px] leading-relaxed truncate font-arabic select-none tracking-normal"
                                style={{
                                  fontFamily: '"Noto Naskh Arabic", "Amiri", serif',
                                  color: isDark ? 'var(--color-dark-primary)' : 'var(--color-primary)',
                                }}
                                title={snippet}
                              >
                                {snippet}
                              </div>
                            )}
                          </div>

                          {/* Footer with action */}
                          <div
                            className="flex items-center justify-between pt-3.5 mt-3.5 border-t text-[11px]"
                            style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}
                          >
                            <span style={{ color: isDark ? 'var(--color-dark-text-muted)' : 'var(--color-text-muted)' }}>
                              {ayahSpan} Ayat Bacaan
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
          })}
        </div>
      )}
    </div>
  );
}
