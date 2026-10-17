import { CurriculumService } from './CurriculumService';
import type { TartilPackage } from '@/core/types';

function layer3ToTartilPackage(item: any, volumeId?: string): TartilPackage {
  // Extract number from title or order
  const matchNum = item.title?.match(/\d+/);
  const pkgNum = matchNum ? parseInt(matchNum[0], 10) : (item.order || 1);

  return {
    id: item.id,
    volumeId: item.layer1Id || volumeId || 'j1',
    sectionId: item.layer2Id,
    title: item.title,
    packageNumber: pkgNum,
    surahId: item.surahId,
    startAyah: item.startAyah,
    endAyah: item.endAyah,
    isPublished: item.isPublished,
    isPinned: item.isPinned || false,
    order: item.order || 1,
    customAyahs: item.customAyahs,
    sections: item.sections,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export class PackageService {
  /**
   * Get all packages for a volume (Layer 1).
   */
  static async getAllPackages(volumeId: string): Promise<TartilPackage[]> {
    const l1 = await CurriculumService.getLayer1(volumeId);
    if (!l1) return [];

    const pkgs: TartilPackage[] = [];
    for (const card of l1.cards || []) {
      for (const item of card.items || []) {
        pkgs.push(layer3ToTartilPackage(item, l1.id));
      }
    }
    return pkgs.sort((a, b) => a.order - b.order);
  }

  /**
   * Get published packages for a volume.
   */
  static async getPublishedPackages(volumeId: string): Promise<TartilPackage[]> {
    const all = await this.getAllPackages(volumeId);
    return all.filter((p) => p.isPublished);
  }

  /**
   * Get all published packages across all volumes.
   */
  static async getAllPublishedPackages(): Promise<TartilPackage[]> {
    const items = await CurriculumService.getAllPublishedItems();
    return items.map((item) => layer3ToTartilPackage(item, item.layer1Id));
  }

  /**
   * Get all pinned published packages across all volumes.
   */
  static async getPinnedPackages(): Promise<TartilPackage[]> {
    const pinned = await CurriculumService.getPinnedItems();
    return pinned.map((item) => layer3ToTartilPackage(item, item.layer1Id));
  }

  /**
   * Subscribe to published packages across all volumes in real-time.
   */
  static subscribeToAllPublishedPackages(callback: (packages: TartilPackage[]) => void): () => void {
    return CurriculumService.subscribeToPublishedLayers((publishedLayers) => {
      const items = CurriculumService.flattenPublishedItems(publishedLayers);
      callback(items.map((item) => layer3ToTartilPackage(item, item.layer1Id)));
    });
  }

  /**
   * Subscribe to pinned packages in real-time.
   */
  static subscribeToPinnedPackages(callback: (packages: TartilPackage[]) => void): () => void {
    return CurriculumService.subscribeToPublishedLayers((publishedLayers) => {
      const pinned = CurriculumService.filterPinnedItems(publishedLayers);
      callback(pinned.map((item) => layer3ToTartilPackage(item, item.layer1Id)));
    });
  }

  /**
   * Subscribe to a single package by ID in real-time.
   */
  static subscribeToPackage(packageId: string, callback: (pkg: TartilPackage | null) => void): () => void {
    return CurriculumService.subscribeToLayer3Item(packageId, (found) => {
      if (!found) {
        callback(null);
      } else {
        callback(layer3ToTartilPackage(found.item, found.layer1.id));
      }
    });
  }

  /**
   * Toggle pin status for a package.
   */
  static async setPackagePin(packageId: string, isPinned: boolean): Promise<void> {
    const found = await CurriculumService.getLayer3Item(packageId);
    if (!found) throw new Error('Paket tidak ditemukan.');

    await CurriculumService.updateLayer3Item(found.layer1.id, found.layer2.id, packageId, {
      isPinned,
    });
  }

  /**
   * Get a single package by ID.
   */
  static async getPackage(packageId: string): Promise<TartilPackage | null> {
    const found = await CurriculumService.getLayer3Item(packageId);
    if (!found) return null;
    return layer3ToTartilPackage(found.item, found.layer1.id);
  }

  /**
   * Create or upsert a package in Layer 1 & Layer 2.
   */
  static async createPackage(pkg: Omit<TartilPackage, 'createdAt' | 'updatedAt'>): Promise<void> {
    const volId = pkg.volumeId || 'j1';
    let l1 = await CurriculumService.getLayer1(volId);
    if (!l1) {
      // Create Layer 1 if does not exist
      l1 = {
        id: volId,
        title: volId === 'j2' ? 'Jilid 2' : 'Jilid 1',
        description: `Koleksi ${volId}`,
        order: 1,
        isPublished: true,
        cards: [],
      };
      await CurriculumService.saveLayer1(l1);
    }

    // Find or create default Layer 2 card
    let targetCard = l1.cards?.[0];
    if (!targetCard) {
      targetCard = {
        id: `${volId}-sub-1`,
        layer1Id: volId,
        title: 'Bagian 1',
        order: 1,
        isPublished: true,
        items: [],
      };
      l1.cards = [targetCard];
    }

    const newItem = {
      id: pkg.id,
      layer1Id: volId,
      layer2Id: targetCard.id,
      title: pkg.title || `Paket ${String(pkg.packageNumber).padStart(2, '0')}`,
      surahId: pkg.surahId,
      startAyah: pkg.startAyah,
      endAyah: pkg.endAyah,
      customAyahs: pkg.customAyahs,
      sections: pkg.sections,
      order: pkg.order || pkg.packageNumber,
      isPublished: pkg.isPublished,
      isPinned: pkg.isPinned || false,
    };

    targetCard.items = [...(targetCard.items || []).filter((i) => i.id !== pkg.id), newItem];
    await CurriculumService.saveLayer1(l1);
  }

  /**
   * Update a package.
   */
  static async updatePackage(packageId: string, data: Partial<TartilPackage>): Promise<void> {
    const found = await CurriculumService.getLayer3Item(packageId);
    if (!found) throw new Error('Paket tidak ditemukan.');

    const updates: any = {};
    if (data.title !== undefined) updates.title = data.title;
    if (data.surahId !== undefined) updates.surahId = data.surahId;
    if (data.startAyah !== undefined) updates.startAyah = data.startAyah;
    if (data.endAyah !== undefined) updates.endAyah = data.endAyah;
    if (data.customAyahs !== undefined) updates.customAyahs = data.customAyahs;
    if (data.sections !== undefined) updates.sections = data.sections;
    if (data.isPublished !== undefined) updates.isPublished = data.isPublished;
    if (data.isPinned !== undefined) updates.isPinned = data.isPinned;
    if (data.order !== undefined) updates.order = data.order;

    await CurriculumService.updateLayer3Item(found.layer1.id, found.layer2.id, packageId, updates);
  }

  /**
   * Delete a package.
   */
  static async deletePackage(packageId: string): Promise<void> {
    const found = await CurriculumService.getLayer3Item(packageId);
    if (found) {
      await CurriculumService.deleteLayer3Item(found.layer1.id, found.layer2.id, packageId);
    }
  }

  /**
   * Delete multiple packages in batch.
   */
  static async deletePackages(packageIds: string[]): Promise<void> {
    for (const id of packageIds) {
      await this.deletePackage(id);
    }
  }
}
