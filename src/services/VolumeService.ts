import { CurriculumService } from './CurriculumService';
import type { TartilVolume } from '@/core/types';

function layer1ToVolume(l1: any): TartilVolume {
  const matchNum = l1.title?.match(/\d+/);
  const num = matchNum ? parseInt(matchNum[0], 10) : (l1.order || 1);

  let totalItems = 0;
  for (const card of l1.cards || []) {
    totalItems += (card.items || []).length;
  }

  return {
    id: l1.id,
    number: num,
    name: l1.title,
    description: l1.description || '',
    isPublished: l1.isPublished,
    order: l1.order || 1,
    cardsCount: (l1.cards || []).length,
    itemsCount: totalItems,
  };
}

export class VolumeService {
  static async getAllVolumes(): Promise<TartilVolume[]> {
    const layers = await CurriculumService.getAllLayers();
    return layers.map(layer1ToVolume);
  }

  static async getPublishedVolumes(): Promise<TartilVolume[]> {
    const layers = await CurriculumService.getPublishedLayers();
    return layers.map(layer1ToVolume);
  }

  static async getVolume(volumeId: string): Promise<TartilVolume | null> {
    const l1 = await CurriculumService.getLayer1(volumeId);
    if (!l1) {
      // Try alias j1 -> first layer, j2 -> second layer
      const all = await CurriculumService.getAllLayers();
      if (volumeId === '1' || volumeId === 'j1') {
        const first = all[0];
        return first ? layer1ToVolume(first) : null;
      }
      if (volumeId === '2' || volumeId === 'j2') {
        const second = all[1];
        return second ? layer1ToVolume(second) : null;
      }
      return null;
    }
    return layer1ToVolume(l1);
  }
}
