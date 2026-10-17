import React, { useState, useEffect, useMemo } from 'react';
import { SurahNameService, DEFAULT_INDONESIAN_SURAHS } from '@/services/SurahNameService';
import { getSurahsMetadata } from '@/services/QuranService';
import type { SurahMetadata } from '@/core/types';

interface SurahNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const SurahNameModal: React.FC<SurahNameModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const [surahsMeta, setSurahsMeta] = useState<SurahMetadata[]>([]);
  const [editedNames, setEditedNames] = useState<Record<number, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      getSurahsMetadata().then((list) => {
        setSurahsMeta(list);
      });
      const allNames = SurahNameService.getAllSurahNames();
      setEditedNames(allNames);
      setSearchQuery('');
      setFeedback(null);
    }
  }, [isOpen]);

  // Hitung jumlah surah yang nilainya berbeda dari standar Kemenag RI
  const customCount = useMemo(() => {
    let count = 0;
    for (let id = 1; id <= 114; id++) {
      const current = (editedNames[id] || '').trim();
      const standard = (DEFAULT_INDONESIAN_SURAHS[id] || '').trim();
      if (current && current !== standard) {
        count++;
      }
    }
    return count;
  }, [editedNames]);

  // Filter 114 surah berdasarkan nomor, nama latin, atau nama Arab
  const filteredSurahs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return Array.from({ length: 114 }, (_, i) => i + 1);

    return Array.from({ length: 114 }, (_, i) => i + 1).filter((id) => {
      const currentName = (editedNames[id] || '').toLowerCase();
      const standardName = (DEFAULT_INDONESIAN_SURAHS[id] || '').toLowerCase();
      const meta = surahsMeta.find((s) => s.id === id);
      const arabicName = (meta?.nameArabic || '').toLowerCase();

      return (
        String(id) === q ||
        currentName.includes(q) ||
        standardName.includes(q) ||
        arabicName.includes(q)
      );
    });
  }, [searchQuery, editedNames, surahsMeta]);

  if (!isOpen) return null;

  const handleNameChange = (surahId: number, val: string) => {
    setEditedNames((prev) => ({
      ...prev,
      [surahId]: val,
    }));
  };

  const handleResetSingle = (surahId: number) => {
    setEditedNames((prev) => ({
      ...prev,
      [surahId]: DEFAULT_INDONESIAN_SURAHS[surahId] || '',
    }));
  };

  const handleResetAllToStandard = () => {
    if (
      window.confirm(
        'Kembalikan seluruh 114 nama surat ke standar resmi Kemenag RI (Standar Indonesia)?'
      )
    ) {
      setEditedNames({ ...DEFAULT_INDONESIAN_SURAHS });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Kumpulkan hanya yang berbeda dari default
      const overridesToSave: Record<number, string> = {};
      for (let id = 1; id <= 114; id++) {
        const val = (editedNames[id] || '').trim();
        const def = (DEFAULT_INDONESIAN_SURAHS[id] || '').trim();
        if (val && val !== def) {
          overridesToSave[id] = val;
        }
      }

      await SurahNameService.saveAllCustomNames(overridesToSave);
      setFeedback('Berhasil menyimpan perubahan nama surat!');
      setTimeout(() => {
        setFeedback(null);
        if (onSaved) onSaved();
        onClose();
      }, 700);
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan penamaan surat');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 md:p-6 bg-black/60 backdrop-blur-xs overflow-hidden">
      <div
        className="w-full max-w-3xl max-h-[92vh] sm:max-h-[90vh] flex flex-col rounded-2xl sm:rounded-3xl border shadow-2xl overflow-hidden animate-fade-in"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        {/* Modal Sticky Header */}
        <div
          className="shrink-0 px-5 sm:px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
              style={{
                backgroundColor: 'rgba(154, 119, 56, 0.15)',
                color: 'var(--color-primary)',
              }}
            >
              <span className="material-symbols-outlined text-[20px]">edit_note</span>
            </div>
            <div>
              <h3
                className="text-[17px] sm:text-[19px] font-semibold tracking-tight"
                style={{ color: 'var(--color-text)' }}
              >
                Kustomisasi Nama Surat (114 Surat)
              </h3>
              <p className="text-[11px] sm:text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
                Sesuaikan transliterasi standar Indonesia (Kemenag RI) atau preferensi kustom
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[18px] opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Toolbar & Search Bar */}
        <div
          className="shrink-0 px-5 sm:px-6 py-3.5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          style={{
            backgroundColor: 'rgba(0,0,0,0.015)',
            borderColor: 'var(--color-border)',
          }}
        >
          {/* Search Input */}
          <div className="relative flex-1 max-w-sm">
            <span
              className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] pointer-events-none"
              style={{ color: 'var(--color-text-muted)' }}
            >
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nomor atau nama surat (misal: 87, Al-A'la)..."
              className="w-full h-9 pl-9 pr-8 rounded-xl text-[12px] bg-transparent outline-none border transition-colors"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text)',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[12px] hover:opacity-70"
                style={{ color: 'var(--color-text-muted)' }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Badges & Reset All Button */}
          <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-end">
            <div className="flex items-center gap-1.5 text-[11px]">
              <span
                className="px-2 py-0.5 rounded-md font-semibold"
                style={{
                  backgroundColor: 'var(--color-border)',
                  color: 'var(--color-text)',
                }}
              >
                {filteredSurahs.length} Surat
              </span>
              {customCount > 0 && (
                <span className="px-2 py-0.5 rounded-md font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400">
                  {customCount} Kustom
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleResetAllToStandard}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-colors hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-muted)',
              }}
              title="Kembalikan semua ke standar Kemenag RI"
            >
              <span className="material-symbols-outlined text-[14px]">restart_alt</span>
              Reset ke Standar Kemenag
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body (Surahs List) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2.5 overscroll-contain">
          {feedback && (
            <div className="p-3 mb-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[13px] font-medium text-center animate-fade-in">
              {feedback}
            </div>
          )}

          {filteredSurahs.length === 0 ? (
            <div
              className="py-12 text-center text-[13px]"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Tidak ada surat yang cocok dengan pencarian "{searchQuery}".
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredSurahs.map((id) => {
                const meta = surahsMeta.find((s) => s.id === id);
                const currentVal = editedNames[id] || '';
                const standardVal = DEFAULT_INDONESIAN_SURAHS[id] || '';
                const isCustomized = currentVal.trim() !== standardVal.trim();

                return (
                  <div
                    key={id}
                    className={`rounded-xl p-3 border transition-all ${
                      isCustomized
                        ? 'border-amber-500/40 bg-amber-500/5'
                        : 'border-black/5 dark:border-white/5 bg-black/[0.01] dark:bg-white/[0.01]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-6 h-6 rounded-md flex items-center justify-center font-mono text-[11px] font-bold"
                          style={{
                            backgroundColor: 'rgba(154, 119, 56, 0.12)',
                            color: 'var(--color-primary)',
                          }}
                        >
                          {id}
                        </span>
                        {isCustomized && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-amber-500/20 text-amber-700 dark:text-amber-400">
                            Kustom
                          </span>
                        )}
                      </div>

                      {/* Arabic Name */}
                      <span
                        className="font-arabic text-[18px] leading-none shrink-0"
                        dir="rtl"
                        style={{ color: 'var(--color-primary)' }}
                      >
                        {meta?.nameArabic || ''}
                      </span>
                    </div>

                    {/* Input Field with single reset button */}
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={currentVal}
                        onChange={(e) => handleNameChange(id, e.target.value)}
                        placeholder={standardVal}
                        className="flex-1 h-9 px-3 rounded-lg border text-[13px] bg-transparent outline-none transition-colors"
                        style={{
                          borderColor: isCustomized
                            ? 'var(--color-primary)'
                            : 'var(--color-border)',
                          color: 'var(--color-text)',
                        }}
                      />
                      {isCustomized && (
                        <button
                          type="button"
                          onClick={() => handleResetSingle(id)}
                          className="w-9 h-9 rounded-lg border flex items-center justify-center text-[15px] opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer shrink-0"
                          style={{
                            borderColor: 'var(--color-border)',
                            color: 'var(--color-text-muted)',
                          }}
                          title={`Kembalikan ke standar: ${standardVal}`}
                        >
                          <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                        </button>
                      )}
                    </div>

                    {/* Standard Name Note */}
                    <div className="mt-1 flex items-center justify-between text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                      <span>Standar: {standardVal}</span>
                      {meta?.ayahCount && <span>{meta.ayahCount} ayat</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Sticky Footer */}
        <div
          className="shrink-0 px-5 sm:px-6 py-4 border-t flex items-center justify-between gap-3"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            Perubahan nama langsung berlaku di Beranda, Jilid, Pencarian, & Pembaca Mushaf.
          </span>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-[12px] font-medium border transition-colors hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            >
              Batal
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-[12px] font-semibold text-white shadow-xs cursor-pointer hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              {saving ? (
                <>
                  <span className="material-symbols-outlined text-[15px] animate-spin">
                    progress_activity
                  </span>
                  Menyimpan...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[15px]">check</span>
                  Simpan Perubahan
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
