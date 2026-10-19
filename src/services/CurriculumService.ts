import { db } from '../config/firebase';
import { collection, doc, getDocs, setDoc, deleteDoc, serverTimestamp, query, orderBy, onSnapshot } from 'firebase/firestore';
import type { Layer1Card, Layer2Card, Layer3Item } from '@/core/types';
import fixtureData from '../data/tartil-packages-fixture.json';

const LOCAL_STORAGE_KEY = 'tartil_curriculum_layers_v2';
const COLLECTION_NAME = 'curriculum_layers';

// Purge any legacy dummy cache keys from previous versions
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem('tartil_curriculum_layers_cache');
    localStorage.removeItem('tartil_admin_packages_cache');
  }
} catch {}

function sanitizeForFirestore<T>(data: T): T {
  if (Array.isArray(data)) {
    return data.map(sanitizeForFirestore) as unknown as T;
  }
  if (data !== null && typeof data === 'object') {
    const clean: any = {};
    for (const [key, value] of Object.entries(data as any)) {
      if (value !== undefined) {
        clean[key] = sanitizeForFirestore(value);
      }
    }
    return clean;
  }
  return data;
}

function getLocalCache(): Record<string, Layer1Card> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalCache(layers: Layer1Card[]) {
  try {
    const record: Record<string, Layer1Card> = {};
    for (const l of layers) {
      record[l.id] = l;
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(record));
  } catch (e) {
    console.warn('[CurriculumService] Failed to cache layers locally', e);
  }
}

function healAyahPage(surahId?: number, ayah?: { ayahNumber: number; pageNumber?: number }) {
  if (!surahId || !ayah) return;
  if (surahId === 87) {
    if (ayah.ayahNumber >= 1 && ayah.ayahNumber <= 15 && ayah.pageNumber !== 591) {
      ayah.pageNumber = 591;
    } else if (ayah.ayahNumber >= 16 && ayah.ayahNumber <= 19 && ayah.pageNumber !== 592) {
      ayah.pageNumber = 592;
    }
  } else if (surahId === 88) {
    if (ayah.ayahNumber >= 1 && ayah.ayahNumber <= 26 && ayah.pageNumber !== 592) {
      ayah.pageNumber = 592;
    }
  } else if (surahId === 93) {
    if (ayah.ayahNumber >= 1 && ayah.ayahNumber <= 11 && ayah.pageNumber !== 596) {
      ayah.pageNumber = 596;
    }
  } else if (surahId === 5 && ayah.ayahNumber === 77 && ayah.pageNumber !== 121) {
    ayah.pageNumber = 121;
  } else if (surahId === 55 && (ayah.ayahNumber === 17 || ayah.ayahNumber === 18) && ayah.pageNumber !== 532) {
    ayah.pageNumber = 532;
  }
}

function healAyahPages(layers: Layer1Card[]): void {
  for (const l1 of layers) {
    for (const l2 of l1.cards || []) {
      for (const item of l2.items || []) {
        if (Array.isArray(item.customAyahs)) {
          for (const a of item.customAyahs) {
            healAyahPage(item.surahId, a);
          }
        }
        if (Array.isArray(item.sections)) {
          for (const sec of item.sections) {
            if (Array.isArray(sec.customAyahs)) {
              for (const a of sec.customAyahs) {
                healAyahPage(sec.surahId, a);
              }
            }
          }
        }
      }
    }
  }
}

export class CurriculumService {
  private static cachedLayers: Layer1Card[] | null = null;
  private static listeners = new Set<(layers: Layer1Card[]) => void>();
  private static firestoreUnsub: (() => void) | null = null;
  private static firestoreDocsMap = new Map<string, Layer1Card>();
  private static isInitialized = false;

  /**
   * Merge starter fixture + local cache + Firestore live data.
   */
  private static mergeLayers(): Layer1Card[] {
    const layerMap = new Map<string, Layer1Card>();

    // 1. Initial Starter Fixture
    const initialLayers = (fixtureData as any).layers || [];
    for (const l of initialLayers) {
      layerMap.set(l.id, l);
    }

    // 2. Overlay LocalStorage Cache
    const local = getLocalCache();
    for (const [id, item] of Object.entries(local)) {
      if ((item as any).isDeleted) {
        layerMap.delete(id);
      } else {
        layerMap.set(id, item);
      }
    }

    // 3. Overlay Firestore documents
    for (const [id, data] of this.firestoreDocsMap.entries()) {
      if ((data as any).isDeleted) {
        layerMap.delete(id);
      } else {
        layerMap.set(id, data);
      }
    }

    const result = Array.from(layerMap.values()).sort((a, b) => (a.order || 0) - (b.order || 0));
    healAyahPages(result);
    this.cachedLayers = result;
    saveLocalCache(result);
    return result;
  }

  /**
   * Notify all active subscribers in real-time.
   */
  private static notifySubscribers(): void {
    const layers = this.mergeLayers();
    for (const listener of this.listeners) {
      try {
        listener(layers);
      } catch (err) {
        console.error('[CurriculumService] Error in realtime listener:', err);
      }
    }
  }

  /**
   * Initialize Firestore realtime listener & cross-tab events.
   */
  private static initRealtime(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Load initial local data
    this.mergeLayers();

    // Listen to local changes across browser windows/tabs
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key === LOCAL_STORAGE_KEY) {
          this.notifySubscribers();
        }
      });

      window.addEventListener('tartil_curriculum_change', () => {
        this.notifySubscribers();
      });
    }

    // Listen to Firestore real-time snapshots
    try {
      const q = query(collection(db, COLLECTION_NAME), orderBy('order', 'asc'));
      this.firestoreUnsub = onSnapshot(
        q,
        (snapshot) => {
          this.firestoreDocsMap.clear();
          for (const docSnap of snapshot.docs) {
            const data = { id: docSnap.id, ...docSnap.data() } as Layer1Card;
            this.firestoreDocsMap.set(data.id, data);
          }
          this.notifySubscribers();
        },
        (error) => {
          console.warn('[CurriculumService] Firestore realtime listener warning, falling back to local:', error);
        }
      );
    } catch (e) {
      console.warn('[CurriculumService] Failed to establish Firestore onSnapshot:', e);
    }
  }

  /**
   * Subscribe to all layers in real-time.
   * Callback is invoked immediately with the current state and whenever data changes.
   */
  static subscribeToAllLayers(callback: (layers: Layer1Card[]) => void): () => void {
    this.initRealtime();
    this.listeners.add(callback);

    // Initial immediate call with current state
    const current = this.cachedLayers || this.mergeLayers();
    try {
      callback(current);
    } catch (err) {
      console.error(err);
    }

    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Stop Firestore realtime listener and reset subscriptions (e.g. for testing or full cleanup).
   */
  static stopRealtime(): void {
    if (this.firestoreUnsub) {
      this.firestoreUnsub();
      this.firestoreUnsub = null;
    }
    this.isInitialized = false;
    this.listeners.clear();
  }

  /**
   * Filter only published Layer 1 cards and their published cards/items.
   */
  static filterPublishedLayers(layers: Layer1Card[]): Layer1Card[] {
    return layers
      .filter((l1) => l1.isPublished)
      .map((l1) => ({
        ...l1,
        cards: (l1.cards || [])
          .filter((l2) => l2.isPublished)
          .map((l2) => ({
            ...l2,
            items: (l2.items || []).filter((l3) => l3.isPublished).sort((a, b) => a.order - b.order),
          }))
          .sort((a, b) => a.order - b.order),
      }))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  /**
   * Flatten all published Layer 3 items from published layers.
   */
  static flattenPublishedItems(publishedLayers: Layer1Card[]): Layer3Item[] {
    const allItems: Layer3Item[] = [];
    for (const l1 of publishedLayers) {
      for (const l2 of l1.cards || []) {
        for (const item of l2.items || []) {
          allItems.push({
            ...item,
            layer1Id: l1.id,
            layer2Id: l2.id,
          });
        }
      }
    }
    return allItems;
  }

  /**
   * Filter pinned items from published layers.
   */
  static filterPinnedItems(publishedLayers: Layer1Card[]): Layer3Item[] {
    return this.flattenPublishedItems(publishedLayers).filter((item) => item.isPinned === true);
  }

  /**
   * Get synchronously the initial published layers from cache/fixture to enable instant first paint.
   */
  static getInitialPublishedLayers(): Layer1Card[] {
    const current = this.cachedLayers || this.mergeLayers();
    return this.filterPublishedLayers(current);
  }

  /**
   * Subscribe to published layers in real-time.
   */
  static subscribeToPublishedLayers(callback: (layers: Layer1Card[]) => void): () => void {
    return this.subscribeToAllLayers((allLayers) => {
      callback(this.filterPublishedLayers(allLayers));
    });
  }

  /**
   * Subscribe to published items in real-time.
   */
  static subscribeToPublishedItems(callback: (items: Layer3Item[]) => void): () => void {
    return this.subscribeToPublishedLayers((publishedLayers) => {
      callback(this.flattenPublishedItems(publishedLayers));
    });
  }

  /**
   * Subscribe to pinned items in real-time.
   */
  static subscribeToPinnedItems(callback: (pinned: Layer3Item[]) => void): () => void {
    return this.subscribeToPublishedLayers((publishedLayers) => {
      callback(this.filterPinnedItems(publishedLayers));
    });
  }

  /**
   * Subscribe to a single Layer 1 card in real-time.
   */
  static subscribeToLayer1(layer1Id: string, callback: (layer: Layer1Card | null) => void): () => void {
    return this.subscribeToAllLayers((allLayers) => {
      const found = allLayers.find((l) => l.id === layer1Id || l.id.toLowerCase() === layer1Id.toLowerCase());
      callback(found || null);
    });
  }

  /**
   * Subscribe to a single Layer 3 item by ID in real-time.
   */
  static subscribeToLayer3Item(
    itemId: string,
    callback: (found: { item: Layer3Item; layer2: Layer2Card; layer1: Layer1Card } | null) => void
  ): () => void {
    return this.subscribeToAllLayers((allLayers) => {
      for (const l1 of allLayers) {
        for (const l2 of l1.cards || []) {
          for (const item of l2.items || []) {
            if (item.id === itemId) {
              callback({ item, layer2: l2, layer1: l1 });
              return;
            }
          }
        }
      }
      callback(null);
    });
  }

  /**
   * Get all Layer 1 root cards.
   */
  static async getAllLayers(): Promise<Layer1Card[]> {
    this.initRealtime();
    return this.cachedLayers || this.mergeLayers();
  }

  /**
   * Get only published Layer 1 cards.
   */
  static async getPublishedLayers(): Promise<Layer1Card[]> {
    const all = await this.getAllLayers();
    return this.filterPublishedLayers(all);
  }

  /**
   * Get a single Layer 1 card by ID.
   */
  static async getLayer1(layer1Id: string): Promise<Layer1Card | null> {
    const layers = await this.getAllLayers();
    const found = layers.find((l) => l.id === layer1Id || l.id === layer1Id.toLowerCase());
    return found || null;
  }

  /**
   * Find a Layer 3 item by its ID across all layers.
   */
  static async getLayer3Item(itemId: string): Promise<{
    item: Layer3Item;
    layer2: Layer2Card;
    layer1: Layer1Card;
  } | null> {
    const layers = await this.getAllLayers();
    for (const l1 of layers) {
      for (const l2 of l1.cards || []) {
        for (const item of l2.items || []) {
          if (item.id === itemId) {
            return { item, layer2: l2, layer1: l1 };
          }
        }
      }
    }
    return null;
  }

  /**
   * Get all published Layer 3 items flattened from all layers.
   */
  static async getAllPublishedItems(): Promise<Layer3Item[]> {
    const publishedLayers = await this.getPublishedLayers();
    return this.flattenPublishedItems(publishedLayers);
  }

  /**
   * Get all pinned items for featured display.
   */
  static async getPinnedItems(): Promise<Layer3Item[]> {
    const published = await this.getPublishedLayers();
    return this.filterPinnedItems(published);
  }

  /**
   * Save (create or update) a Layer 1 card with instant real-time notification.
   */
  static async saveLayer1(layer1: Layer1Card): Promise<void> {
    const clean = sanitizeForFirestore(layer1);

    // Save in local cache & firestore cache map immediately
    const current = getLocalCache();
    current[clean.id] = clean;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(current));
    this.firestoreDocsMap.set(clean.id, clean);

    // Instant optimistic notification to all active subscribers (0 ms)
    this.notifySubscribers();

    // Broadcast cross-tab event
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('tartil_curriculum_change'));
      } catch {}
    }

    // Save in Firestore cloud
    try {
      const docRef = doc(db, COLLECTION_NAME, clean.id);
      await setDoc(docRef, {
        ...clean,
        isDeleted: false,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (e) {
      console.warn('[CurriculumService] Firestore saveLayer1 error (saved locally):', e);
    }
  }

  /**
   * Delete a Layer 1 card with instant real-time notification.
   */
  static async deleteLayer1(layer1Id: string): Promise<void> {
    const current = getLocalCache();
    current[layer1Id] = { id: layer1Id, isDeleted: true } as any;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(current));
    this.firestoreDocsMap.delete(layer1Id);

    // Instant optimistic notification to all active subscribers
    this.notifySubscribers();

    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('tartil_curriculum_change'));
      } catch {}
    }

    try {
      const docRef = doc(db, COLLECTION_NAME, layer1Id);
      await setDoc(docRef, { isDeleted: true, updatedAt: serverTimestamp() }, { merge: true });
      await deleteDoc(docRef);
    } catch (e) {
      console.warn('[CurriculumService] Firestore deleteLayer1 error:', e);
    }
  }

  /**
   * Add a new Layer 2 card inside a Layer 1 card.
   */
  static async addLayer2(layer1Id: string, cardData: Omit<Layer2Card, 'id' | 'items'>): Promise<Layer2Card> {
    const l1 = await this.getLayer1(layer1Id);
    if (!l1) throw new Error(`Layer 1 "${layer1Id}" tidak ditemukan.`);

    const newId = `${layer1Id}-sub-${Date.now().toString(36)}`;
    const newCard: Layer2Card = {
      id: newId,
      layer1Id,
      title: cardData.title,
      description: cardData.description || '',
      order: cardData.order ?? (l1.cards?.length || 0) + 1,
      isPublished: cardData.isPublished ?? true,
      items: [],
    };

    l1.cards = [...(l1.cards || []), newCard];
    await this.saveLayer1(l1);
    return newCard;
  }

  /**
   * Update a Layer 2 card inside a Layer 1 card.
   */
  static async updateLayer2(layer1Id: string, layer2Id: string, updates: Partial<Layer2Card>): Promise<void> {
    const l1 = await this.getLayer1(layer1Id);
    if (!l1) throw new Error(`Layer 1 "${layer1Id}" tidak ditemukan.`);

    l1.cards = (l1.cards || []).map((card) => {
      if (card.id === layer2Id) {
        return { ...card, ...updates };
      }
      return card;
    });

    await this.saveLayer1(l1);
  }

  /**
   * Delete a Layer 2 card from a Layer 1 card.
   */
  static async deleteLayer2(layer1Id: string, layer2Id: string): Promise<void> {
    const l1 = await this.getLayer1(layer1Id);
    if (!l1) return;

    l1.cards = (l1.cards || []).filter((c) => c.id !== layer2Id);
    await this.saveLayer1(l1);
  }

  /**
   * Add a new Layer 3 item inside a Layer 2 card.
   */
  static async addLayer3Item(
    layer1Id: string,
    layer2Id: string,
    itemData: Omit<Layer3Item, 'id'>
  ): Promise<Layer3Item> {
    const l1 = await this.getLayer1(layer1Id);
    if (!l1) throw new Error(`Layer 1 "${layer1Id}" tidak ditemukan.`);

    const targetCard = (l1.cards || []).find((c) => c.id === layer2Id);
    if (!targetCard) throw new Error(`Layer 2 "${layer2Id}" tidak ditemukan.`);

    const newId = `${layer2Id}-item-${Date.now().toString(36)}`;
    const newItem: Layer3Item = {
      ...itemData,
      id: newId,
      layer1Id,
      layer2Id,
    };

    targetCard.items = [...(targetCard.items || []), newItem];
    await this.saveLayer1(l1);
    return newItem;
  }

  /**
   * Update a Layer 3 item.
   */
  static async updateLayer3Item(
    layer1Id: string,
    layer2Id: string,
    itemId: string,
    updates: Partial<Layer3Item>
  ): Promise<void> {
    const l1 = await this.getLayer1(layer1Id);
    if (!l1) throw new Error(`Layer 1 "${layer1Id}" tidak ditemukan.`);

    const targetCard = (l1.cards || []).find((c) => c.id === layer2Id);
    if (!targetCard) throw new Error(`Layer 2 "${layer2Id}" tidak ditemukan.`);

    targetCard.items = (targetCard.items || []).map((item) => {
      if (item.id === itemId) {
        return { ...item, ...updates };
      }
      return item;
    });

    await this.saveLayer1(l1);
  }

  /**
   * Delete a Layer 3 item.
   */
  static async deleteLayer3Item(layer1Id: string, layer2Id: string, itemId: string): Promise<void> {
    const l1 = await this.getLayer1(layer1Id);
    if (!l1) return;

    const targetCard = (l1.cards || []).find((c) => c.id === layer2Id);
    if (!targetCard) return;

    targetCard.items = (targetCard.items || []).filter((item) => item.id !== itemId);
    await this.saveLayer1(l1);
  }

  /**
   * Toggle Pin status for a Layer 3 item.
   */
  static async togglePinItem(itemId: string): Promise<boolean> {
    const found = await this.getLayer3Item(itemId);
    if (!found) throw new Error('Item tidak ditemukan.');

    const nextState = !found.item.isPinned;
    await this.updateLayer3Item(found.layer1.id, found.layer2.id, itemId, {
      isPinned: nextState,
    });
    return nextState;
  }

  /**
   * Reset all curriculum data completely to clean starter.
   */
  static async resetAllData(): Promise<void> {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    localStorage.removeItem('tartil_admin_packages_cache');
    this.firestoreDocsMap.clear();
    this.cachedLayers = null;
    this.notifySubscribers();

    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('tartil_curriculum_change'));
      } catch {}
    }

    try {
      const q = query(collection(db, COLLECTION_NAME));
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        await deleteDoc(d.ref);
      }
    } catch (e) {
      console.warn('[CurriculumService] Error resetting Firestore:', e);
    }
  }
}
