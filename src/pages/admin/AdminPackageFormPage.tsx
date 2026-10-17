import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { PackageService } from '@/services/PackageService';
import { VolumeService } from '@/services/VolumeService';
import { getSurahsMetadata, resolveAyahRange } from '@/services/QuranService';
import type { TartilVolume, SurahMetadata, Ayah, TartilPackage } from '@/core/types';

export default function AdminPackageFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [volumes, setVolumes] = useState<TartilVolume[]>([]);
  const [surahs, setSurahs] = useState<SurahMetadata[]>([]);
  
  const [volumeId, setVolumeId] = useState<string>('j1');
  const [packageNumber, setPackageNumber] = useState<number | ''>(1);
  const [surahId, setSurahId] = useState<number>(1);
  const [startAyah, setStartAyah] = useState<number>(1);
  const [endAyah, setEndAyah] = useState<number>(7);
  const [isPublished, setIsPublished] = useState<boolean>(true);
  const [isPinned, setIsPinned] = useState<boolean>(false);

  // Ayah Data State
  const [customAyahs, setCustomAyahs] = useState<Ayah[]>([]);
  const [loadingAyahs, setLoadingAyahs] = useState(false);
  const [existingPackageIds, setExistingPackageIds] = useState<Set<number>>(new Set());

  // Load Initial Metadata & Package Data if in Edit mode
  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const [vols, surahMeta] = await Promise.all([
          VolumeService.getAllVolumes(),
          getSurahsMetadata()
        ]);
        setVolumes(vols);
        setSurahs(surahMeta);

        if (isEdit && id) {
          const pkg = await PackageService.getPackage(id);
          if (pkg) {
            setVolumeId(pkg.volumeId);
            setPackageNumber(pkg.packageNumber);
            setSurahId(pkg.surahId);
            setStartAyah(pkg.startAyah);
            setEndAyah(pkg.endAyah);
            setIsPublished(pkg.isPublished);
            setIsPinned(pkg.isPinned || false);
            if (pkg.customAyahs && pkg.customAyahs.length > 0) {
              setCustomAyahs(pkg.customAyahs);
            } else {
              // Fetch text for existing package
              const ayahs = await resolveAyahRange(pkg.surahId, pkg.startAyah, pkg.endAyah);
              setCustomAyahs(ayahs);
            }
          } else {
            setError("Paket tidak ditemukan.");
          }
        } else {
          // Create Mode: fetch default ayahs for Surah 1 (Al-Fatihah 1-7)
          if (vols.length > 0) setVolumeId(vols[0].id);
          const initialAyahs = await resolveAyahRange(1, 1, 7);
          setCustomAyahs(initialAyahs);
        }
      } catch (err: any) {
        console.error("Error initializing package form:", err);
        setError("Gagal memuat data dasar.");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [id, isEdit]);

  // Track existing package numbers for the selected volume to provide helpful UI hint
  useEffect(() => {
    async function checkExistingNumbers() {
      if (!volumeId) return;
      try {
        const pkgs = await PackageService.getAllPackages(volumeId);
        const nums = new Set(pkgs.map(p => p.packageNumber));
        setExistingPackageIds(nums);
      } catch (e) {
        console.warn("Could not load volume packages", e);
      }
    }
    checkExistingNumbers();
  }, [volumeId]);

  const selectedSurah = surahs.find(s => s.id === surahId);
  const totalAyahs = selectedSurah?.ayahCount || 7;

  // Function to fetch ayahs from dataset
  const fetchAyahs = useCallback(async (sId: number, start: number, end: number) => {
    if (!sId || start < 1 || end < start) return;
    setLoadingAyahs(true);
    try {
      const res = await resolveAyahRange(sId, start, end);
      setCustomAyahs(res);
    } catch (e) {
      console.warn("Failed to fetch ayahs", e);
      setCustomAyahs([]);
    } finally {
      setLoadingAyahs(false);
    }
  }, []);

  const handleAyahChange = (index: number, newText: string) => {
    const updated = [...customAyahs];
    updated[index] = { ...updated[index], text: newText };
    setCustomAyahs(updated);
  };

  // When Surah changes, reset start/end and fetch new ayahs
  const handleSurahChange = async (newSurahId: number) => {
    setSurahId(newSurahId);
    setStartAyah(1);
    const surahMeta = surahs.find(s => s.id === newSurahId);
    const maxA = surahMeta?.ayahCount || 1;
    const newEnd = Math.min(7, maxA);
    setEndAyah(newEnd);
    await fetchAyahs(newSurahId, 1, newEnd);
  };

  // When Start Ayah changes
  const handleStartAyahChange = async (newStart: number) => {
    setStartAyah(newStart);
    const validEnd = Math.max(newStart, endAyah);
    setEndAyah(validEnd);
    await fetchAyahs(surahId, newStart, validEnd);
  };

  // When End Ayah changes
  const handleEndAyahChange = async (newEnd: number) => {
    setEndAyah(newEnd);
    await fetchAyahs(surahId, startAyah, newEnd);
  };

  const validate = (): string | null => {
    if (!volumeId) return "Pilih jilid terlebih dahulu.";
    if (!packageNumber || Number(packageNumber) < 1) return "Nomor paket tidak valid (harus angka positif).";
    if (!surahId) return "Pilih surat.";
    if (startAyah < 1) return "Ayat mulai tidak valid.";
    if (endAyah > totalAyahs) return `Ayat akhir tidak valid. Surat ${selectedSurah?.name || surahId} hanya memiliki ${totalAyahs} ayat.`;
    if (startAyah > endAyah) return "Ayat mulai harus lebih kecil atau sama dengan ayat akhir.";
    return null;
  };

  const handleSave = async () => {
    setError(null);
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    try {
      const num = Number(packageNumber);
      const padNum = String(num).padStart(2, '0');
      const generatedId = isEdit && id ? id : `${volumeId}-p${padNum}`;

      const pkgData: Omit<TartilPackage, 'createdAt' | 'updatedAt'> = {
        id: generatedId,
        volumeId,
        packageNumber: num,
        surahId,
        startAyah,
        endAyah,
        isPublished,
        isPinned,
        order: num,
        customAyahs,
      };

      if (isEdit) {
        await PackageService.updatePackage(pkgData.id, pkgData);
      } else {
        await PackageService.createPackage(pkgData);
      }

      navigate('/admin/packages');
    } catch (err: any) {
      console.error("Error saving package:", err);
      setError(`Gagal menyimpan paket: ${err.message || 'Periksa koneksi atau hak akses database.'}`);
    } finally {
      setSaving(false);
    }
  };

  const isExistingNumber = !isEdit && packageNumber !== '' && existingPackageIds.has(Number(packageNumber));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 transition-colors" style={{ backgroundColor: 'var(--color-bg)' }}>
        <span className="text-[14px] animate-pulse-soft" style={{ color: 'var(--color-text-muted)' }}>
          Memuat formulir paket...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32 transition-colors" style={{ backgroundColor: 'var(--color-bg)' }}>
      {/* Ultra Minimal Admin Header */}
      <div className="sticky top-0 z-10 backdrop-blur-md pb-4 pt-6 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/admin/packages" className="transition-opacity hover:opacity-50" style={{ color: 'var(--color-text-secondary)' }}>
                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              </Link>
              <h1 className="text-[16px] font-medium tracking-wide" style={{ color: 'var(--color-text)' }}>
                {isEdit ? `Edit Paket ${packageNumber}` : 'Buat Paket Baru'}
              </h1>
            </div>
            <Link
              to="/admin/packages"
              className="text-[12px] uppercase tracking-wider transition-opacity hover:opacity-60"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Batal
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {error && (
          <div className="mb-8 p-4 rounded-xl text-[13px] border" style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.2)', color: 'var(--color-error)' }}>
            <span className="font-semibold block mb-0.5">Terjadi Kendala:</span>
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Form Controls */}
          <div className="space-y-8">
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                    Jilid
                  </label>
                  <select 
                    className="bg-transparent text-[14px] outline-none cursor-pointer border-b pb-2 transition-colors"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                    value={volumeId}
                    onChange={e => setVolumeId(e.target.value)}
                    disabled={isEdit}
                  >
                    {volumes.map(v => (
                      <option key={v.id} value={v.id} className="text-black">
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                    Nomor Paket
                  </label>
                  <input 
                    type="number" 
                    min="1"
                    placeholder="1, 2, dst."
                    className="bg-transparent text-[14px] outline-none border-b pb-2 transition-colors"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                    value={packageNumber}
                    onChange={e => setPackageNumber(e.target.value ? Number(e.target.value) : '')}
                    disabled={isEdit}
                  />
                  {isExistingNumber && (
                    <span className="text-[11px] mt-1" style={{ color: 'var(--color-primary)' }}>
                      ℹ Paket {packageNumber} sudah ada. Menyimpan akan memperbarui paket ini.
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                  Pilih Surat
                </label>
                <select 
                  className="bg-transparent text-[14px] outline-none cursor-pointer border-b pb-2 transition-colors w-full"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  value={surahId}
                  onChange={e => handleSurahChange(Number(e.target.value))}
                >
                  {surahs.map(s => (
                    <option key={s.id} value={s.id} className="text-black">
                      {s.id}. {s.name} ({s.nameArabic}) — {s.ayahCount} Ayat
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                    Ayat Mulai
                  </label>
                  <select 
                    className="bg-transparent text-[14px] outline-none cursor-pointer border-b pb-2 transition-colors"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                    value={startAyah}
                    onChange={e => handleStartAyahChange(Number(e.target.value))}
                  >
                    {Array.from({ length: totalAyahs }).map((_, i) => (
                      <option key={i+1} value={i+1} className="text-black">Ayat {i+1}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                    Ayat Akhir
                  </label>
                  <select 
                    className="bg-transparent text-[14px] outline-none cursor-pointer border-b pb-2 transition-colors"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                    value={endAyah}
                    onChange={e => handleEndAyahChange(Number(e.target.value))}
                  >
                    {Array.from({ length: totalAyahs }).map((_, i) => (
                      <option key={i+1} value={i+1} disabled={(i+1) < startAyah} className="text-black">
                        Ayat {i+1}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
                <div>
                  <label className="text-[14px] font-medium block" style={{ color: 'var(--color-text)' }}>Status Publikasi</label>
                  <span className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
                    {isPublished ? 'Paket dapat dibaca oleh santri/publik' : 'Disimpan sebagai draf privat'}
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={isPublished}
                    onChange={e => setIsPublished(e.target.checked)}
                  />
                  <div className="w-10 h-5 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" style={{ backgroundColor: isPublished ? 'var(--color-primary)' : 'var(--color-border)' }}></div>
                </label>
              </div>

              {/* Pin toggle */}
              <div className="pt-2 flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-amber-500">push_pin</span>
                    <label className="text-[14px] font-medium block" style={{ color: 'var(--color-text)' }}>Sematkan di Beranda (Pin)</label>
                  </div>
                  <span className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
                    {isPinned ? 'Paket akan tampil di Beranda/Dashboard utama santri' : 'Tidak disematkan di Beranda'}
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={isPinned}
                    onChange={e => setIsPinned(e.target.checked)}
                  />
                  <div className="w-10 h-5 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" style={{ backgroundColor: isPinned ? 'var(--color-primary)' : 'var(--color-border)' }}></div>
                </label>
              </div>
            </div>

            <div className="pt-6">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !volumeId || packageNumber === ''}
                className="w-full py-3.5 rounded-full text-[13px] tracking-widest uppercase font-semibold transition-opacity disabled:opacity-50 cursor-pointer shadow-sm hover:opacity-90"
                style={{ backgroundColor: 'var(--color-text)', color: 'var(--color-bg)' }}
              >
                {saving ? 'Menyimpan Paket...' : isEdit ? 'Simpan Perubahan' : isExistingNumber ? 'Perbarui Paket Ini' : 'Terbitkan Paket'}
              </button>
            </div>
          </div>

          {/* Ayah Text Live Preview & Editor */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-6 pb-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <h2 className="text-[15px] font-medium tracking-wide" style={{ color: 'var(--color-text)' }}>
                  Pratinjau & Sunting Ayat
                </h2>
                <span className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                  QS. {selectedSurah?.name || surahId} : {startAyah}–{endAyah} ({endAyah - startAyah + 1} Ayat)
                </span>
              </div>
              <button 
                type="button"
                onClick={() => fetchAyahs(surahId, startAyah, endAyah)}
                className="text-[11px] uppercase tracking-wider px-3 py-1 rounded transition-opacity hover:opacity-60"
                style={{ color: 'var(--color-primary)', backgroundColor: 'var(--color-surface-subtle)' }}
              >
                Muat Ulang Teks
              </button>
            </div>
            
            <div className="flex-1">
              {loadingAyahs ? (
                <div className="py-20 text-[13px] text-center animate-pulse-soft" style={{ color: 'var(--color-text-muted)' }}>
                  Memuat teks ayat dari mushaf...
                </div>
              ) : customAyahs.length === 0 ? (
                <div className="text-center py-20 text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
                  Ayat belum tersedia. Klik "Muat Ulang Teks" untuk mengambil dari dataset.
                </div>
              ) : (
                <div className="space-y-6 max-h-[560px] overflow-y-auto pr-2">
                  {customAyahs.map((ayah, idx) => (
                    <div key={ayah.ayahNumber} className="flex flex-col gap-2 p-3 rounded-lg" style={{ backgroundColor: 'var(--color-surface-subtle)' }}>
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] uppercase tracking-widest font-mono font-medium" style={{ color: 'var(--color-text-muted)' }}>
                          Ayat {ayah.ayahNumber}
                        </label>
                        {ayah.pageNumber && (
                          <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                            Halaman {ayah.pageNumber}
                          </span>
                        )}
                      </div>
                      <textarea
                        dir="rtl"
                        rows={2}
                        className="w-full bg-transparent outline-none transition-colors text-[22px] leading-loose resize-y border-b pb-1"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)', fontFamily: 'var(--font-arabic)' }}
                        value={ayah.text}
                        onChange={(e) => handleAyahChange(idx, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
