import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CurriculumService } from '@/services/CurriculumService';
import { getSurahsMetadata, resolveAyahRange } from '@/services/QuranService';
import type { Layer1Card, Layer2Card, Layer3Item, SurahMetadata, Ayah } from '@/core/types';
import { useAuth } from '@/contexts/AuthContext';
import { formatSurahsTitle } from '@/utils/PackageTitleFormatter';
import { SurahNameModal } from '@/components/admin/SurahNameModal';

export default function AdminPackagesPage() {
  const { logout } = useAuth();

  const [layers, setLayers] = useState<Layer1Card[]>([]);
  const [surahs, setSurahs] = useState<SurahMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isL1ModalOpen, setIsL1ModalOpen] = useState(false);
  const [editingL1, setEditingL1] = useState<Layer1Card | null>(null);
  const [l1Form, setL1Form] = useState({ title: '', description: '', badge: '', order: 1, isPublished: true });

  const [isL2ModalOpen, setIsL2ModalOpen] = useState(false);
  const [parentL1IdForL2, setParentL1IdForL2] = useState<string>('');
  const [editingL2, setEditingL2] = useState<Layer2Card | null>(null);
  const [l2Form, setL2Form] = useState({ title: '', description: '', order: 1, isPublished: true });

  interface AdminFormSection {
    id: string;
    surahId: number;
    startAyah: number;
    endAyah: number;
    customAyahs: Ayah[];
    loading?: boolean;
  }

  const [isL3ModalOpen, setIsL3ModalOpen] = useState(false);
  const [isSurahNameModalOpen, setIsSurahNameModalOpen] = useState(false);
  const [parentL1IdForL3, setParentL1IdForL3] = useState<string>('');
  const [parentL2IdForL3, setParentL2IdForL3] = useState<string>('');
  const [editingL3, setEditingL3] = useState<Layer3Item | null>(null);
  const [l3Form, setL3Form] = useState({
    title: '',
    description: '',
    sections: [
      {
        id: 'sec-1',
        surahId: 1,
        startAyah: 1,
        endAyah: 7,
        customAyahs: [] as Ayah[],
        loading: false,
      },
    ] as AdminFormSection[],
    order: 1,
    isPublished: true,
    isPinned: false,
  });
  const [saving, setSaving] = useState(false);

  // Load Data & Subscribe Real-time
  const loadData = async () => {
    try {
      const allLayers = await CurriculumService.getAllLayers();
      setLayers(allLayers);
    } catch (err) {
      console.error('Error loading layers in admin:', err);
    }
  };

  useEffect(() => {
    let isMounted = true;
    getSurahsMetadata().then((meta) => {
      if (isMounted) setSurahs(meta);
    });

    const unsubscribe = CurriculumService.subscribeToAllLayers((allLayers) => {
      if (!isMounted) return;
      setLayers(allLayers);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Compute stats
  const stats = useMemo(() => {
    let totalL2 = 0;
    let totalL3 = 0;
    let totalPinned = 0;
    for (const l1 of layers) {
      for (const l2 of l1.cards || []) {
        totalL2++;
        for (const l3 of l2.items || []) {
          totalL3++;
          if (l3.isPinned) totalPinned++;
        }
      }
    }
    return {
      totalL1: layers.length,
      totalL2,
      totalL3,
      totalPinned,
    };
  }, [layers]);

  // Helpers
  const getSurahName = (id: number) => {
    return surahs.find((s) => s.id === id)?.name || `Surat ${id}`;
  };

  // ================= LAYER 1 CRUD =================
  const handleOpenCreateL1 = () => {
    setEditingL1(null);
    setL1Form({
      title: `Jilid ${layers.length + 1}`,
      description: 'Koleksi materi pembelajaran',
      badge: `Jilid ${layers.length + 1}`,
      order: layers.length + 1,
      isPublished: true,
    });
    setIsL1ModalOpen(true);
  };

  const handleOpenEditL1 = (l1: Layer1Card) => {
    setEditingL1(l1);
    setL1Form({
      title: l1.title,
      description: l1.description || '',
      badge: l1.badge || '',
      order: l1.order || 1,
      isPublished: l1.isPublished,
    });
    setIsL1ModalOpen(true);
  };

  const handleSaveL1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!l1Form.title.trim()) {
      alert('Judul Layer 1 tidak boleh kosong.');
      return;
    }
    setSaving(true);
    try {
      if (editingL1) {
        const updated: Layer1Card = {
          ...editingL1,
          title: l1Form.title.trim(),
          description: l1Form.description.trim(),
          badge: l1Form.badge.trim() || l1Form.title.trim(),
          order: Number(l1Form.order),
          isPublished: l1Form.isPublished,
        };
        await CurriculumService.saveLayer1(updated);
        setLayers((prev) => prev.map((l) => (l.id === editingL1.id ? updated : l)));
      } else {
        const newId = `l1-${Date.now().toString(36)}`;
        const newCard: Layer1Card = {
          id: newId,
          title: l1Form.title.trim(),
          description: l1Form.description.trim(),
          badge: l1Form.badge.trim() || l1Form.title.trim(),
          order: Number(l1Form.order),
          isPublished: l1Form.isPublished,
          cards: [],
        };
        await CurriculumService.saveLayer1(newCard);
        setLayers((prev) => [...prev, newCard].sort((a, b) => a.order - b.order));
      }
      setIsL1ModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan Layer 1');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteL1 = async (l1: Layer1Card) => {
    const confirmMsg = `HAPUS LAYER 1: "${l1.title}"?\n\nSemua card di dalamnya (${(l1.cards || []).length} sub-card) juga akan terhapus. Lanjutkan?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await CurriculumService.deleteLayer1(l1.id);
      setLayers((prev) => prev.filter((l) => l.id !== l1.id));
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus Layer 1');
    }
  };

  // ================= LAYER 2 CRUD =================
  const handleOpenCreateL2 = (l1Id: string) => {
    const l1 = layers.find((l) => l.id === l1Id);
    const count = (l1?.cards || []).length;
    setParentL1IdForL2(l1Id);
    setEditingL2(null);
    setL2Form({
      title: `Bagian ${count + 1}`,
      description: 'Latihan maqra\' dan tajwid',
      order: count + 1,
      isPublished: true,
    });
    setIsL2ModalOpen(true);
  };

  const handleOpenEditL2 = (l1Id: string, l2: Layer2Card) => {
    setParentL1IdForL2(l1Id);
    setEditingL2(l2);
    setL2Form({
      title: l2.title,
      description: l2.description || '',
      order: l2.order || 1,
      isPublished: l2.isPublished,
    });
    setIsL2ModalOpen(true);
  };

  const handleSaveL2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!l2Form.title.trim()) {
      alert('Judul Sub-Card tidak boleh kosong.');
      return;
    }
    setSaving(true);
    try {
      if (editingL2) {
        await CurriculumService.updateLayer2(parentL1IdForL2, editingL2.id, {
          title: l2Form.title.trim(),
          description: l2Form.description.trim(),
          order: Number(l2Form.order),
          isPublished: l2Form.isPublished,
        });
      } else {
        await CurriculumService.addLayer2(parentL1IdForL2, {
          title: l2Form.title.trim(),
          description: l2Form.description.trim(),
          order: Number(l2Form.order),
          isPublished: l2Form.isPublished,
        });
      }
      await loadData();
      setIsL2ModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan Sub-Card Layer 2');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteL2 = async (l1Id: string, l2: Layer2Card) => {
    const confirmMsg = `Hapus Sub-Card: "${l2.title}"?\n\nSemua materi (${(l2.items || []).length} materi) di dalamnya akan ikut terhapus.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await CurriculumService.deleteLayer2(l1Id, l2.id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus Sub-Card');
    }
  };

  // ================= LAYER 3 CRUD =================
  const fetchL3AyahsForSection = async (secIndex: number, sId: number, start: number, end: number) => {
    setL3Form((prev) => {
      const nextSecs = [...prev.sections];
      if (nextSecs[secIndex]) {
        nextSecs[secIndex] = { ...nextSecs[secIndex], loading: true };
      }
      return { ...prev, sections: nextSecs };
    });

    try {
      const res = await resolveAyahRange(sId, start, end);
      setL3Form((prev) => {
        const nextSecs = [...prev.sections];
        if (nextSecs[secIndex]) {
          nextSecs[secIndex] = {
            ...nextSecs[secIndex],
            surahId: sId,
            startAyah: start,
            endAyah: end,
            customAyahs: res,
            loading: false,
          };
        }
        return { ...prev, sections: nextSecs };
      });
    } catch (e) {
      console.warn(`Failed to fetch ayahs for section ${secIndex}`, e);
      setL3Form((prev) => {
        const nextSecs = [...prev.sections];
        if (nextSecs[secIndex]) {
          nextSecs[secIndex] = { ...nextSecs[secIndex], loading: false };
        }
        return { ...prev, sections: nextSecs };
      });
    }
  };

  const handleOpenCreateL3 = async (l1Id: string, l2Id: string) => {
    const l1 = layers.find((l) => l.id === l1Id);
    const l2 = l1?.cards?.find((c) => c.id === l2Id);
    const count = (l2?.items || []).length;
    const padNum = String(count + 1).padStart(2, '0');

    const defaultSec: AdminFormSection = {
      id: `sec-${Date.now()}-1`,
      surahId: 1,
      startAyah: 1,
      endAyah: 7,
      customAyahs: [],
      loading: false,
    };

    setParentL1IdForL3(l1Id);
    setParentL2IdForL3(l2Id);
    setEditingL3(null);
    setL3Form({
      title: `Paket ${padNum}`,
      description: '',
      sections: [defaultSec],
      order: count + 1,
      isPublished: true,
      isPinned: false,
    });
    setIsL3ModalOpen(true);
    await fetchL3AyahsForSection(0, 1, 1, 7);
  };

  const handleOpenEditL3 = async (l1Id: string, l2Id: string, item: Layer3Item) => {
    setParentL1IdForL3(l1Id);
    setParentL2IdForL3(l2Id);
    setEditingL3(item);

    const rawSecs: AdminFormSection[] =
      item.sections && item.sections.length > 0
        ? item.sections.map((s, idx) => ({
            id: s.id || `sec-${idx}-${Date.now()}`,
            surahId: s.surahId,
            startAyah: s.startAyah,
            endAyah: s.endAyah,
            customAyahs: s.customAyahs || [],
            loading: false,
          }))
        : [
            {
              id: `sec-0-${Date.now()}`,
              surahId: item.surahId || 1,
              startAyah: item.startAyah || 1,
              endAyah: item.endAyah || 7,
              customAyahs: item.customAyahs || [],
              loading: false,
            },
          ];

    setL3Form({
      title: item.title,
      description: item.description || '',
      sections: rawSecs,
      order: item.order || 1,
      isPublished: item.isPublished,
      isPinned: item.isPinned || false,
    });
    setIsL3ModalOpen(true);

    rawSecs.forEach((sec, idx) => {
      if (!sec.customAyahs || sec.customAyahs.length === 0) {
        fetchL3AyahsForSection(idx, sec.surahId, sec.startAyah, sec.endAyah);
      }
    });
  };

  const handleAddSection = async () => {
    const newSec: AdminFormSection = {
      id: `sec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      surahId: 112,
      startAyah: 1,
      endAyah: 4,
      customAyahs: [],
      loading: false,
    };
    const newSecs = [...l3Form.sections, newSec];
    const newIdx = newSecs.length - 1;
    setL3Form((prev) => ({ ...prev, sections: newSecs }));
    await fetchL3AyahsForSection(newIdx, 112, 1, 4);
  };

  const handleRemoveSection = (secIdx: number) => {
    if (l3Form.sections.length <= 1) return;
    setL3Form((prev) => ({
      ...prev,
      sections: prev.sections.filter((_, idx) => idx !== secIdx),
    }));
  };

  const handleSectionSurahChange = async (secIdx: number, newSurahId: number) => {
    const sMeta = surahs.find((s) => s.id === newSurahId);
    const maxA = sMeta?.ayahCount || 7;
    const newEnd = Math.min(7, maxA);
    await fetchL3AyahsForSection(secIdx, newSurahId, 1, newEnd);
  };

  const handleSectionStartAyahChange = async (secIdx: number, newStart: number) => {
    const sec = l3Form.sections[secIdx];
    if (!sec) return;
    const newEnd = Math.max(newStart, sec.endAyah);
    await fetchL3AyahsForSection(secIdx, sec.surahId, newStart, newEnd);
  };

  const handleSectionEndAyahChange = async (secIdx: number, newEnd: number) => {
    const sec = l3Form.sections[secIdx];
    if (!sec) return;
    await fetchL3AyahsForSection(secIdx, sec.surahId, sec.startAyah, newEnd);
  };

  const handleAutoGenerateL3Title = () => {
    if (l3Form.sections.length === 0) return;
    if (l3Form.sections.length === 1) {
      const s = l3Form.sections[0];
      setL3Form((prev) => ({
        ...prev,
        title: `QS. ${getSurahName(s.surahId)} (${s.startAyah}–${s.endAyah})`,
      }));
    } else {
      const formatted = formatSurahsTitle(l3Form.sections, (id) => getSurahName(id));
      setL3Form((prev) => ({
        ...prev,
        title: formatted,
      }));
    }
  };

  const handleAyahTextChange = (secIdx: number, ayahIdx: number, text: string) => {
    setL3Form((prev) => {
      const nextSecs = [...prev.sections];
      const sec = nextSecs[secIdx];
      if (sec && sec.customAyahs) {
        const nextAyahs = [...sec.customAyahs];
        nextAyahs[ayahIdx] = { ...nextAyahs[ayahIdx], text };
        nextSecs[secIdx] = { ...sec, customAyahs: nextAyahs };
      }
      return { ...prev, sections: nextSecs };
    });
  };

  const handleSaveL3 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!l3Form.title.trim()) {
      alert('Judul Materi tidak boleh kosong.');
      return;
    }
    for (let i = 0; i < l3Form.sections.length; i++) {
      const sec = l3Form.sections[i];
      if (sec.startAyah > sec.endAyah) {
        alert(`Ayat mulai harus lebih kecil atau sama dengan ayat akhir pada Surat ke-${i + 1}.`);
        return;
      }
    }

    setSaving(true);
    try {
      const primarySec = l3Form.sections[0];
      const cleanSections = l3Form.sections.map((s) => ({
        id: s.id,
        surahId: s.surahId,
        startAyah: s.startAyah,
        endAyah: s.endAyah,
        customAyahs: s.customAyahs,
      }));

      const payload: Partial<Layer3Item> = {
        title: l3Form.title.trim(),
        description: l3Form.description.trim(),
        surahId: primarySec.surahId,
        startAyah: primarySec.startAyah,
        endAyah: primarySec.endAyah,
        customAyahs: primarySec.customAyahs,
        sections: cleanSections,
        order: Number(l3Form.order),
        isPublished: l3Form.isPublished,
        isPinned: l3Form.isPinned,
      };

      if (editingL3) {
        await CurriculumService.updateLayer3Item(parentL1IdForL3, parentL2IdForL3, editingL3.id, payload);
      } else {
        await CurriculumService.addLayer3Item(parentL1IdForL3, parentL2IdForL3, payload as Omit<Layer3Item, 'id'>);
      }
      await loadData();
      setIsL3ModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan Materi Layer 3');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteL3 = async (l1Id: string, l2Id: string, item: Layer3Item) => {
    if (!window.confirm(`Hapus materi "${item.title}"?`)) return;
    try {
      await CurriculumService.deleteLayer3Item(l1Id, l2Id, item.id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus materi');
    }
  };

  const handleTogglePinL3 = async (item: Layer3Item) => {
    try {
      await CurriculumService.togglePinItem(item.id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal menyematkan materi');
    }
  };

  const handleExportData = () => {
    try {
      const raw = localStorage.getItem('tartil_curriculum_layers_v2');
      const parsed = raw ? JSON.parse(raw) : {};
      const layersList = Object.values(parsed);
      const dataToExport = layersList.length > 0 ? layersList : layers;

      const exportObj = {
        layers: dataToExport,
        volumes: [],
        packages: [],
      };
      const jsonStr = JSON.stringify(exportObj, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tartil-packages-fixture.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Gagal mengekspor data: ' + err.message);
    }
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        const layersToImport = parsed.layers || (Array.isArray(parsed) ? parsed : Object.values(parsed));
        if (!Array.isArray(layersToImport)) {
          alert('Format file JSON tidak valid. Pastikan berisi array "layers".');
          return;
        }
        for (const layer of layersToImport) {
          await CurriculumService.saveLayer1(layer);
        }
        await loadData();
        alert(`Berhasil mengimpor ${layersToImport.length} data Jilid / Layer!`);
      } catch (err: any) {
        alert('Gagal mengimpor file: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSyncToCloud = async () => {
    if (!layers || layers.length === 0) {
      alert('Tidak ada data layer untuk disinkronkan ke cloud.');
      return;
    }
    setSaving(true);
    try {
      for (const l of layers) {
        await CurriculumService.saveLayer1(l);
      }
      alert('Berhasil menyinkronkan data ke Firestore Cloud!');
    } catch (err: any) {
      alert('Gagal sinkronisasi ke cloud: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen pb-32 transition-colors" style={{ backgroundColor: 'var(--color-bg)' }}>
      {/* Top Navbar */}
      <div className="sticky top-0 z-30 backdrop-blur-md pb-4 pt-6 border-b" style={{ borderColor: 'var(--color-border)', backgroundColor: 'rgba(255,255,255,0.7)' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={`${import.meta.env.BASE_URL}logo-128.png`} alt="Logo Jalsah" className="w-7 h-7 object-contain" width="28" height="28" />
              <div>
                <h1 className="text-[15px] font-semibold tracking-wide leading-tight" style={{ color: 'var(--color-text)' }}>
                  Panel Admin Tartil Shafa'i
                </h1>
                <span className="text-[11px] block" style={{ color: 'var(--color-text-muted)' }}>
                  Sistem Struktur 3-Layer Terkustomisasi
                </span>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <Link
                to="/"
                className="text-[12px] uppercase tracking-widest transition-opacity hover:opacity-60 flex items-center gap-1.5 font-medium"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                Lihat Web
              </Link>
              <button
                onClick={logout}
                className="text-[12px] uppercase tracking-widest transition-opacity hover:opacity-50 font-medium"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Keluar
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Title & Top Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-[28px] font-light tracking-tight" style={{ color: 'var(--color-text)' }}>
              Pengelolaan Struktur & Card
            </h2>
            <p className="text-[13px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
              Hierarki 3-Layer: <strong style={{ color: 'var(--color-text)' }}>Layer 1</strong> (Koleksi / Jilid) → <strong style={{ color: 'var(--color-text)' }}>Layer 2</strong> (Sub-Card / Bab) → <strong style={{ color: 'var(--color-text)' }}>Layer 3</strong> (Materi / Maqra')
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handleExportData}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12px] uppercase tracking-wider font-semibold border transition-all hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer shadow-2xs"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              title="Download backup data JSON (bisa disalin ke tartil-packages-fixture.json)"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              Ekspor JSON
            </button>

            <label
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12px] uppercase tracking-wider font-semibold border transition-all hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer shadow-2xs"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              title="Import data dari file backup JSON"
            >
              <span className="material-symbols-outlined text-[16px]">upload</span>
              Impor JSON
              <input type="file" accept=".json" onChange={handleImportData} className="hidden" />
            </label>

            <button
              type="button"
              onClick={handleSyncToCloud}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12px] uppercase tracking-wider font-semibold border transition-all hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer shadow-2xs"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              title="Kirim dan sinkronkan data lokal ke Firebase Firestore"
            >
              <span className="material-symbols-outlined text-[16px]">cloud_sync</span>
              {saving ? 'Syncing...' : 'Sync Cloud'}
            </button>

            <button
              type="button"
              onClick={() => setIsSurahNameModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12px] uppercase tracking-wider font-semibold border transition-all hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer shadow-2xs"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              title="Atur transliterasi standar Indonesia atau kustomisasi penamaan surat"
            >
              <span className="material-symbols-outlined text-[16px]">edit_note</span>
              Nama Surat
            </button>

            <button
              type="button"
              onClick={handleOpenCreateL1}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] uppercase tracking-wider font-semibold transition-opacity hover:opacity-85 shadow-sm cursor-pointer"
              style={{ backgroundColor: 'var(--color-text)', color: 'var(--color-bg)' }}
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              Tambah Jilid
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="p-4 rounded-2xl border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <span className="text-[11px] uppercase tracking-wider font-semibold block" style={{ color: 'var(--color-text-muted)' }}>
              Layer 1 (Koleksi)
            </span>
            <span className="text-[24px] font-semibold mt-1 block" style={{ color: 'var(--color-text)' }}>
              {stats.totalL1}
            </span>
          </div>

          <div className="p-4 rounded-2xl border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <span className="text-[11px] uppercase tracking-wider font-semibold block" style={{ color: 'var(--color-text-muted)' }}>
              Layer 2 (Sub-Card)
            </span>
            <span className="text-[24px] font-semibold mt-1 block" style={{ color: 'var(--color-text)' }}>
              {stats.totalL2}
            </span>
          </div>

          <div className="p-4 rounded-2xl border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <span className="text-[11px] uppercase tracking-wider font-semibold block" style={{ color: 'var(--color-text-muted)' }}>
              Layer 3 (Materi Maqra')
            </span>
            <span className="text-[24px] font-semibold mt-1 block" style={{ color: 'var(--color-primary)' }}>
              {stats.totalL3}
            </span>
          </div>

          <div className="p-4 rounded-2xl border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <span className="text-[11px] uppercase tracking-wider font-semibold block" style={{ color: 'var(--color-text-muted)' }}>
              Disematkan di Beranda
            </span>
            <span className="text-[24px] font-semibold mt-1 block" style={{ color: 'var(--color-text)' }}>
              {stats.totalPinned}
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative w-full sm:w-80">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] pointer-events-none" style={{ color: 'var(--color-text-muted)' }}>
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Saring card atau judul materi..."
              className="w-full h-10 pl-9 pr-8 rounded-xl text-[13px] bg-transparent outline-none transition-colors border"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text)',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[12px] hover:opacity-60"
                style={{ color: 'var(--color-text-muted)' }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* ================= HIERARCHICAL CARD-IN-CARD LIST ================= */}
        {loading ? (
          <div className="py-24 text-center text-[13px] tracking-wide animate-pulse-soft" style={{ color: 'var(--color-text-muted)' }}>
            Memuat hierarki 3-layer...
          </div>
        ) : layers.length === 0 ? (
          <div className="py-20 text-center rounded-2xl border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <span className="material-symbols-outlined text-[48px] mb-3 block opacity-40">dashboard_customize</span>
            <h3 className="text-[16px] font-medium mb-1" style={{ color: 'var(--color-text)' }}>
              Belum ada card di sistem
            </h3>
            <p className="text-[13px] mb-6" style={{ color: 'var(--color-text-muted)' }}>
              Klik tombol di bawah untuk membuat Layer 1 (misal: "Jilid 1"), lalu tambahkan sub-card di dalamnya.
            </p>
            <button
              type="button"
              onClick={handleOpenCreateL1}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[12px] uppercase tracking-widest font-semibold shadow-sm cursor-pointer"
              style={{ backgroundColor: 'var(--color-text)', color: 'var(--color-bg)' }}
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              Buat Card Layer 1 Sekarang
            </button>
          </div>
        ) : (
          <div className="space-y-10">
            {layers.map((l1, idx) => {
              const q = searchQuery.toLowerCase().trim();
              const l2List = (l1.cards || []).filter((l2) => {
                if (!q) return true;
                const matchL2 = l2.title.toLowerCase().includes(q);
                const matchL3 = (l2.items || []).some((item) => {
                  const matchTitle = item.title.toLowerCase().includes(q);
                  const matchMainSurah = getSurahName(item.surahId).toLowerCase().includes(q);
                  const matchSections = (item.sections || []).some((s) =>
                    getSurahName(s.surahId).toLowerCase().includes(q)
                  );
                  return matchTitle || matchMainSurah || matchSections;
                });
                return matchL2 || matchL3;
              });

              return (
                /* LAYER 1 CARD CONTAINER */
                <div
                  key={l1.id}
                  className="rounded-3xl border p-6 sm:p-8 transition-all relative overflow-hidden"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                    boxShadow: '0 8px 30px -10px rgba(0,0,0,0.06)',
                  }}
                >
                  {/* Layer 1 Header */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-6 border-b gap-4" style={{ borderColor: 'var(--color-border)' }}>
                    <div className="flex items-start sm:items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-[14px] shrink-0"
                        style={{ backgroundColor: 'rgba(154, 119, 56, 0.15)', color: 'var(--color-primary)' }}
                      >
                        {String(idx + 1).padStart(2, '0')}
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-black/5 dark:bg-white/5" style={{ color: 'var(--color-text-muted)' }}>
                            Layer 1
                          </span>
                          <h3 className="text-[22px] font-semibold tracking-tight" style={{ color: 'var(--color-text)' }}>
                            {l1.title}
                          </h3>
                          <span
                            className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: l1.isPublished ? 'rgba(16, 185, 129, 0.12)' : 'rgba(0,0,0,0.06)',
                              color: l1.isPublished ? '#10b981' : 'var(--color-text-muted)',
                            }}
                          >
                            {l1.isPublished ? 'Diterbitkan' : 'Draf'}
                          </span>
                        </div>
                        {l1.description && (
                          <p className="text-[13px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                            {l1.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Layer 1 Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleOpenCreateL2(l1.id)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[12px] font-semibold border transition-colors hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                        style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
                      >
                        <span className="material-symbols-outlined text-[15px]">add</span>
                        Tambah Sub-Card (Layer 2)
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEditL1(l1)}
                        className="p-1.5 rounded-lg border transition-colors hover:bg-black/5 text-[12px] cursor-pointer"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                        title="Edit Layer 1"
                      >
                        <span className="material-symbols-outlined text-[16px] block">edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteL1(l1)}
                        className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 text-[12px] cursor-pointer"
                        title="Hapus Layer 1"
                      >
                        <span className="material-symbols-outlined text-[16px] block">delete</span>
                      </button>
                    </div>
                  </div>

                  {/* LAYER 2 CARDS INSIDE LAYER 1 */}
                  {l2List.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl border border-dashed text-[13px]" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
                      Belum ada sub-card di dalam {l1.title}.
                      <br />
                      <button
                        type="button"
                        onClick={() => handleOpenCreateL2(l1.id)}
                        className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold underline cursor-pointer"
                        style={{ color: 'var(--color-primary)' }}
                      >
                        + Tambah Card Layer 2 Sekarang
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {l2List.map((l2) => {
                        return (
                          /* LAYER 2 CARD */
                          <div
                            key={l2.id}
                            className="rounded-2xl border p-5 sm:p-6 transition-all"
                            style={{
                              backgroundColor: 'var(--color-surface-subtle)',
                              borderColor: 'var(--color-border)',
                            }}
                          >
                            {/* Layer 2 Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b gap-3" style={{ borderColor: 'var(--color-border)' }}>
                              <div className="flex items-center gap-2.5">
                                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-black/5 dark:bg-white/5" style={{ color: 'var(--color-text-muted)' }}>
                                  Layer 2
                                </span>
                                <h4 className="text-[16px] font-semibold" style={{ color: 'var(--color-text)' }}>
                                  {l2.title}
                                </h4>
                                {l2.description && (
                                  <span className="text-[12px] hidden md:inline" style={{ color: 'var(--color-text-muted)' }}>
                                    • {l2.description}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleOpenCreateL3(l1.id, l2.id)}
                                  className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-semibold text-white shadow-xs cursor-pointer"
                                  style={{ backgroundColor: 'var(--color-primary)' }}
                                >
                                  <span className="material-symbols-outlined text-[14px]">add</span>
                                  Tambah Materi (Layer 3)
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleOpenEditL2(l1.id, l2)}
                                  className="p-1 rounded text-stone-500 hover:text-stone-800 cursor-pointer"
                                  title="Edit Sub-Card"
                                >
                                  <span className="material-symbols-outlined text-[16px] block">edit</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteL2(l1.id, l2)}
                                  className="p-1 rounded text-red-400 hover:text-red-600 cursor-pointer"
                                  title="Hapus Sub-Card"
                                >
                                  <span className="material-symbols-outlined text-[16px] block">delete</span>
                                </button>
                              </div>
                            </div>

                            {/* LAYER 3 ITEMS INSIDE LAYER 2 */}
                            {(l2.items || []).length === 0 ? (
                              <div className="py-6 text-center text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
                                Belum ada materi di dalam {l2.title}. Klik "+ Tambah Materi (Layer 3)".
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {(l2.items || []).map((item) => {
                                  const sName = getSurahName(item.surahId);
                                  const hasMultiSurah = (item.sections || []).length > 1;
                                  const surahListText = hasMultiSurah
                                    ? formatSurahsTitle(item.sections!, (id) => getSurahName(id))
                                    : `QS. ${sName}`;
                                  const totalAyahSpan = hasMultiSurah
                                    ? item.sections!.reduce((sum, s) => sum + (s.endAyah - s.startAyah + 1), 0)
                                    : item.endAyah - item.startAyah + 1;

                                  return (
                                    /* LAYER 3 ITEM CARD */
                                    <div
                                      key={item.id}
                                      className="rounded-xl p-3.5 border flex flex-col justify-between transition-all hover:shadow-xs group"
                                      style={{
                                        backgroundColor: 'var(--color-surface)',
                                        borderColor: 'var(--color-border)',
                                      }}
                                    >
                                      <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                          <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-black/5" style={{ color: 'var(--color-primary)' }}>
                                            {item.title}
                                          </span>

                                          <div className="flex items-center gap-1">
                                            {/* Pin toggle */}
                                            <button
                                              type="button"
                                              onClick={() => handleTogglePinL3(item)}
                                              title={item.isPinned ? 'Lepas sematan dari Beranda' : 'Sematkan di Beranda Utama'}
                                              className={`p-1 rounded transition-colors ${item.isPinned ? 'text-amber-500 bg-amber-50' : 'text-stone-300 hover:text-stone-600'
                                                }`}
                                            >
                                              <span className="material-symbols-outlined text-[15px] block">push_pin</span>
                                            </button>

                                            <span
                                              className="w-1.5 h-1.5 rounded-full"
                                              style={{ backgroundColor: item.isPublished ? '#10b981' : '#9ca3af' }}
                                              title={item.isPublished ? 'Diterbitkan' : 'Draf'}
                                            />
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <h5 className="text-[13px] font-semibold truncate max-w-[200px]" style={{ color: 'var(--color-text)' }} title={surahListText}>
                                            {surahListText}
                                          </h5>
                                          {hasMultiSurah && (
                                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400">
                                              {item.sections!.length} Surat
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                                          {hasMultiSurah
                                            ? `${item.sections!.length} Surat • Total ${totalAyahSpan} ayat`
                                            : `Ayat ${item.startAyah}–${item.endAyah} • ${totalAyahSpan} ayat`}
                                        </p>
                                      </div>

                                      <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t text-[11px]" style={{ borderColor: 'var(--color-border)' }}>
                                        <Link
                                          to={`/paket/${item.id}`}
                                          className="text-stone-500 hover:text-stone-800 inline-flex items-center gap-0.5"
                                        >
                                          Baca <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                                        </Link>

                                        <div className="flex items-center gap-2">
                                          <button
                                            type="button"
                                            onClick={() => handleOpenEditL3(l1.id, l2.id, item)}
                                            className="text-amber-700 hover:underline cursor-pointer"
                                          >
                                            Edit
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteL3(l1.id, l2.id, item)}
                                            className="text-red-500 hover:underline cursor-pointer"
                                          >
                                            Hapus
                                          </button>
                                        </div>
                                      </div>
                                    </div>
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
            })}
          </div>
        )}
      </div>

      {/* ================= MODAL LAYER 1 ================= */}
      {isL1ModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-xs overflow-hidden">
          <div
            className="w-full max-w-lg max-h-[92vh] sm:max-h-[90vh] flex flex-col rounded-2xl sm:rounded-3xl border shadow-2xl overflow-hidden animate-fade-in"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            {/* Header */}
            <div className="shrink-0 px-5 sm:px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <h3 className="text-[16px] sm:text-[18px] font-semibold" style={{ color: 'var(--color-text)' }}>
                  {editingL1 ? 'Edit Card Layer 1' : 'Tambah Card Layer 1 (Koleksi / Jilid)'}
                </h3>
                <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                  Tingkat teratas kurikulum pembacaan
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsL1ModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[18px] opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Body */}
            <form id="l1-form" onSubmit={handleSaveL1} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 overscroll-contain">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1" style={{ color: 'var(--color-text-muted)' }}>
                  Judul Card (misal: "Jilid 1", "Tingkat Ula")
                </label>
                <input
                  type="text"
                  required
                  value={l1Form.title}
                  onChange={(e) => setL1Form({ ...l1Form, title: e.target.value })}
                  className="w-full h-10 px-3.5 rounded-xl border text-[13px] bg-transparent outline-none"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1" style={{ color: 'var(--color-text-muted)' }}>
                  Deskripsi Singkat
                </label>
                <textarea
                  rows={2}
                  value={l1Form.description}
                  onChange={(e) => setL1Form({ ...l1Form, description: e.target.value })}
                  className="w-full p-3 rounded-xl border text-[13px] bg-transparent outline-none resize-none"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1" style={{ color: 'var(--color-text-muted)' }}>
                    Badge Label
                  </label>
                  <input
                    type="text"
                    value={l1Form.badge}
                    placeholder="Opsional"
                    onChange={(e) => setL1Form({ ...l1Form, badge: e.target.value })}
                    className="w-full h-10 px-3.5 rounded-xl border text-[13px] bg-transparent outline-none"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1" style={{ color: 'var(--color-text-muted)' }}>
                    Nomor Urutan
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={l1Form.order}
                    onChange={(e) => setL1Form({ ...l1Form, order: Number(e.target.value) })}
                    className="w-full h-10 px-3.5 rounded-xl border text-[13px] bg-transparent outline-none"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2.5 text-[13px] font-medium cursor-pointer" style={{ color: 'var(--color-text)' }}>
                  <input
                    type="checkbox"
                    checked={l1Form.isPublished}
                    onChange={(e) => setL1Form({ ...l1Form, isPublished: e.target.checked })}
                    className="w-4 h-4 rounded accent-[#9a7738] cursor-pointer"
                  />
                  Status Terbitkan (Tampilkan ke Publik)
                </label>
              </div>
            </form>

            {/* Footer */}
            <div className="shrink-0 px-5 sm:px-6 py-3.5 sm:py-4 border-t flex items-center justify-end gap-3" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={() => setIsL1ModalOpen(false)}
                className="px-4 py-2 sm:py-2.5 rounded-xl text-[12px] sm:text-[13px] font-medium border cursor-pointer hover:bg-black/5"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              >
                Batal
              </button>
              <button
                type="submit"
                form="l1-form"
                disabled={saving}
                className="px-5 py-2 sm:py-2.5 rounded-xl text-[12px] sm:text-[13px] font-semibold text-white shadow-xs cursor-pointer hover:opacity-90"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {saving ? 'Menyimpan...' : 'Simpan Layer 1'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL LAYER 2 ================= */}
      {isL2ModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-xs overflow-hidden">
          <div
            className="w-full max-w-lg max-h-[92vh] sm:max-h-[90vh] flex flex-col rounded-2xl sm:rounded-3xl border shadow-2xl overflow-hidden animate-fade-in"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            {/* Header */}
            <div className="shrink-0 px-5 sm:px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <h3 className="text-[16px] sm:text-[18px] font-semibold" style={{ color: 'var(--color-text)' }}>
                  {editingL2 ? 'Edit Sub-Card Layer 2' : 'Tambah Sub-Card (Layer 2)'}
                </h3>
                <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                  Sub-koleksi / Bab pembelajaraan
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsL2ModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[18px] opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Body */}
            <form id="l2-form" onSubmit={handleSaveL2} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 overscroll-contain">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1" style={{ color: 'var(--color-text-muted)' }}>
                  Judul Sub-Card (misal: "Bagian 1", "Bab 1: Makhorijul Huruf")
                </label>
                <input
                  type="text"
                  required
                  value={l2Form.title}
                  onChange={(e) => setL2Form({ ...l2Form, title: e.target.value })}
                  className="w-full h-10 px-3.5 rounded-xl border text-[13px] bg-transparent outline-none"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1" style={{ color: 'var(--color-text-muted)' }}>
                  Deskripsi / Keterangan Sub-Card
                </label>
                <textarea
                  rows={2}
                  value={l2Form.description}
                  onChange={(e) => setL2Form({ ...l2Form, description: e.target.value })}
                  className="w-full p-3 rounded-xl border text-[13px] bg-transparent outline-none resize-none"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1" style={{ color: 'var(--color-text-muted)' }}>
                    Nomor Urutan
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={l2Form.order}
                    onChange={(e) => setL2Form({ ...l2Form, order: Number(e.target.value) })}
                    className="w-full h-10 px-3.5 rounded-xl border text-[13px] bg-transparent outline-none"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2.5 text-[13px] font-medium cursor-pointer pb-2" style={{ color: 'var(--color-text)' }}>
                    <input
                      type="checkbox"
                      checked={l2Form.isPublished}
                      onChange={(e) => setL2Form({ ...l2Form, isPublished: e.target.checked })}
                      className="w-4 h-4 rounded accent-[#9a7738] cursor-pointer"
                    />
                    Status Terbitkan
                  </label>
                </div>
              </div>
            </form>

            {/* Footer */}
            <div className="shrink-0 px-5 sm:px-6 py-3.5 sm:py-4 border-t flex items-center justify-end gap-3" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={() => setIsL2ModalOpen(false)}
                className="px-4 py-2 sm:py-2.5 rounded-xl text-[12px] sm:text-[13px] font-medium border cursor-pointer hover:bg-black/5"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              >
                Batal
              </button>
              <button
                type="submit"
                form="l2-form"
                disabled={saving}
                className="px-5 py-2 sm:py-2.5 rounded-xl text-[12px] sm:text-[13px] font-semibold text-white shadow-xs cursor-pointer hover:opacity-90"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {saving ? 'Menyimpan...' : 'Simpan Sub-Card'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL LAYER 3 (MATERI / MAQRA') ================= */}
      {isL3ModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 md:p-6 bg-black/60 backdrop-blur-xs overflow-hidden">
          <div
            className="w-full max-w-3xl max-h-[92vh] sm:max-h-[90vh] flex flex-col rounded-2xl sm:rounded-3xl border shadow-2xl overflow-hidden animate-fade-in"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            {/* Header */}
            <div className="shrink-0 px-5 sm:px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <h3 className="text-[17px] sm:text-[19px] font-semibold" style={{ color: 'var(--color-text)' }}>
                  {editingL3 ? 'Edit Materi (Layer 3)' : 'Tambah Materi / Maqra\' (Layer 3)'}
                </h3>
                <span className="text-[11px] sm:text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
                  Satu paket dapat berisi lebih dari satu surat mushaf Al-Qur'an
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsL3ModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[18px] opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form id="l3-form" onSubmit={handleSaveL3} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 overscroll-contain">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold uppercase tracking-wider block" style={{ color: 'var(--color-text-muted)' }}>
                      Judul Card Materi
                    </label>
                    <button
                      type="button"
                      onClick={handleAutoGenerateL3Title}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 cursor-pointer inline-flex items-center gap-1"
                      title="Format judul otomatis (1 surat, 2 surat '&', atau 3+ surat '-')"
                    >
                      <span className="material-symbols-outlined text-[12px]">auto_fix_high</span>
                      Otomatiskan Judul
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={l3Form.title}
                    onChange={(e) => setL3Form({ ...l3Form, title: e.target.value })}
                    className="w-full h-10 px-3.5 rounded-xl border text-[13px] bg-transparent outline-none"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1" style={{ color: 'var(--color-text-muted)' }}>
                    Nomor Urutan
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={l3Form.order}
                    onChange={(e) => setL3Form({ ...l3Form, order: Number(e.target.value) })}
                    className="w-full h-10 px-3.5 rounded-xl border text-[13px] bg-transparent outline-none"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1" style={{ color: 'var(--color-text-muted)' }}>
                  Deskripsi / Catatan (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={l3Form.description}
                  onChange={(e) => setL3Form({ ...l3Form, description: e.target.value })}
                  placeholder="Catatan tajwid atau maqra'..."
                  className="w-full p-3 rounded-xl border text-[13px] bg-transparent outline-none resize-none"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <label className="flex items-center gap-2.5 text-[13px] font-medium cursor-pointer" style={{ color: 'var(--color-text)' }}>
                  <input
                    type="checkbox"
                    checked={l3Form.isPinned}
                    onChange={(e) => setL3Form({ ...l3Form, isPinned: e.target.checked })}
                    className="w-4 h-4 rounded accent-[#9a7738] cursor-pointer"
                  />
                  Sematkan di Beranda Utama (Pin)
                </label>

                <label className="flex items-center gap-2.5 text-[13px] font-medium cursor-pointer" style={{ color: 'var(--color-text)' }}>
                  <input
                    type="checkbox"
                    checked={l3Form.isPublished}
                    onChange={(e) => setL3Form({ ...l3Form, isPublished: e.target.checked })}
                    className="w-4 h-4 rounded accent-[#9a7738] cursor-pointer"
                  />
                  Status Terbitkan (Publik)
                </label>
              </div>

              {/* ================= MULTI-SURAH SECTIONS ================= */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
                  <div>
                    <h4 className="text-[14px] font-semibold" style={{ color: 'var(--color-text)' }}>
                      Daftar Surat dalam Paket ({l3Form.sections.length} Surat)
                    </h4>
                    <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                      Tambahkan satu atau lebih surat Al-Qur'an untuk maqra' ini
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddSection}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold border transition-all hover:opacity-80 active:scale-95 shadow-xs cursor-pointer"
                    style={{
                      borderColor: 'var(--color-primary)',
                      color: 'var(--color-primary)',
                      backgroundColor: 'rgba(154, 119, 56, 0.08)',
                    }}
                  >
                    <span className="material-symbols-outlined text-[15px]">add</span>
                    Tambah Surat
                  </button>
                </div>

                <div className="space-y-4">
                  {l3Form.sections.map((sec, secIdx) => {
                    const currentMeta = surahs.find((s) => s.id === sec.surahId);
                    const totalAyahs = currentMeta?.ayahCount || 7;

                    return (
                      <div
                        key={sec.id}
                        className="rounded-2xl border p-4 sm:p-5 space-y-4 transition-all"
                        style={{
                          backgroundColor: 'var(--color-surface-subtle)',
                          borderColor: 'var(--color-border)',
                        }}
                      >
                        {/* Section Header */}
                        <div className="flex items-center justify-between gap-3 pb-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                          <div className="flex items-center gap-2">
                            <span
                              className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px]"
                              style={{ backgroundColor: 'var(--color-primary)', color: '#fff' }}
                            >
                              {secIdx + 1}
                            </span>
                            <span className="text-[13px] font-semibold" style={{ color: 'var(--color-text)' }}>
                              Surat ke-{secIdx + 1}: QS. {currentMeta?.name || sec.surahId}
                            </span>
                            {currentMeta?.nameArabic && (
                              <span className="text-[15px] font-arabic" dir="rtl" style={{ color: 'var(--color-primary)' }}>
                                ({currentMeta.nameArabic})
                              </span>
                            )}
                          </div>

                          {l3Form.sections.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSection(secIdx)}
                              className="text-red-500 hover:text-red-700 text-[11px] inline-flex items-center gap-1 font-medium cursor-pointer p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/20"
                              title="Hapus surat ini dari paket"
                            >
                              <span className="material-symbols-outlined text-[15px]">delete</span>
                              Hapus Surat
                            </button>
                          )}
                        </div>

                        {/* Surah Selector */}
                        <div>
                          <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1" style={{ color: 'var(--color-text-muted)' }}>
                            Pilih Surat Mushaf
                          </label>
                          <select
                            value={sec.surahId}
                            onChange={(e) => handleSectionSurahChange(secIdx, Number(e.target.value))}
                            className="w-full h-10 px-3 rounded-xl border text-[13px] bg-white text-black dark:bg-stone-800 dark:text-white outline-none cursor-pointer"
                            style={{ borderColor: 'var(--color-border)' }}
                          >
                            {surahs.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.id}. QS. {s.name} ({s.nameArabic}) — {s.ayahCount} Ayat
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Start and End Ayahs */}
                        <div className="grid grid-cols-2 gap-3 sm:gap-4">
                          <div>
                            <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1" style={{ color: 'var(--color-text-muted)' }}>
                              Ayat Mulai
                            </label>
                            <select
                              value={sec.startAyah}
                              onChange={(e) => handleSectionStartAyahChange(secIdx, Number(e.target.value))}
                              className="w-full h-10 px-3 rounded-xl border text-[13px] bg-white text-black dark:bg-stone-800 dark:text-white outline-none cursor-pointer"
                              style={{ borderColor: 'var(--color-border)' }}
                            >
                              {Array.from({ length: totalAyahs }).map((_, i) => (
                                <option key={i + 1} value={i + 1}>
                                  Ayat {i + 1}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1" style={{ color: 'var(--color-text-muted)' }}>
                              Ayat Akhir
                            </label>
                            <select
                              value={sec.endAyah}
                              onChange={(e) => handleSectionEndAyahChange(secIdx, Number(e.target.value))}
                              className="w-full h-10 px-3 rounded-xl border text-[13px] bg-white text-black dark:bg-stone-800 dark:text-white outline-none cursor-pointer"
                              style={{ borderColor: 'var(--color-border)' }}
                            >
                              {Array.from({ length: totalAyahs }).map((_, i) => (
                                <option key={i + 1} value={i + 1} disabled={i + 1 < sec.startAyah}>
                                  Ayat {i + 1}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Ayahs Preview & Editor */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                              Pratinjau Teks Mushaf ({sec.customAyahs?.length || 0} Ayat)
                            </span>
                            <button
                              type="button"
                              onClick={() => fetchL3AyahsForSection(secIdx, sec.surahId, sec.startAyah, sec.endAyah)}
                              className="text-[11px] uppercase tracking-wider underline cursor-pointer"
                              style={{ color: 'var(--color-primary)' }}
                            >
                              Muat Ulang dari Mushaf
                            </button>
                          </div>

                          <div
                            className="max-h-48 overflow-y-auto rounded-xl border p-3 space-y-2.5 overscroll-contain"
                            style={{
                              backgroundColor: 'var(--color-surface)',
                              borderColor: 'var(--color-border)',
                            }}
                          >
                            {sec.loading ? (
                              <div className="py-6 text-center text-[12px] animate-pulse-soft">Memuat ayat mushaf...</div>
                            ) : !sec.customAyahs || sec.customAyahs.length === 0 ? (
                              <div className="py-6 text-center text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
                                Teks belum dimuat.
                              </div>
                            ) : (
                              sec.customAyahs.map((a, aIdx) => (
                                <div key={`${sec.surahId}-${a.ayahNumber}-${aIdx}`} className="flex flex-col gap-1 p-2 rounded bg-black/5 dark:bg-white/5">
                                  <span className="text-[10px] font-mono text-stone-500">Ayat {a.ayahNumber}</span>
                                  <textarea
                                    dir="rtl"
                                    rows={2}
                                    className="w-full bg-transparent text-[17px] sm:text-[18px] outline-none resize-none leading-loose font-arabic"
                                    value={a.text}
                                    onChange={(e) => handleAyahTextChange(secIdx, aIdx, e.target.value)}
                                  />
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Add Another Section Button */}
                <button
                  type="button"
                  onClick={handleAddSection}
                  className="w-full py-3 rounded-2xl border border-dashed flex items-center justify-center gap-2 text-[12px] font-semibold transition-all hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                  style={{
                    borderColor: 'var(--color-primary)',
                    color: 'var(--color-primary)',
                  }}
                >
                  <span className="material-symbols-outlined text-[17px]">add_circle</span>
                  Tambah Surat Lain ke Paket Ini
                </button>
              </div>
            </form>

            {/* Fixed Footer */}
            <div className="shrink-0 px-5 sm:px-6 py-3.5 sm:py-4 border-t flex items-center justify-end gap-3" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={() => setIsL3ModalOpen(false)}
                className="px-4 py-2 sm:py-2.5 rounded-xl text-[12px] sm:text-[13px] font-medium border cursor-pointer hover:bg-black/5"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              >
                Batal
              </button>
              <button
                type="submit"
                form="l3-form"
                disabled={saving}
                className="px-5 py-2 sm:py-2.5 rounded-xl text-[12px] sm:text-[13px] font-semibold text-white shadow-xs cursor-pointer hover:opacity-90"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {saving ? 'Menyimpan...' : 'Simpan Materi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL KUSTOMISASI NAMA SURAT ================= */}
      <SurahNameModal
        isOpen={isSurahNameModalOpen}
        onClose={() => setIsSurahNameModalOpen(false)}
        onSaved={loadData}
      />
    </div>
  );
}