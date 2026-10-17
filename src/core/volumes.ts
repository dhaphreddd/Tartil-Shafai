/**
 * Tartil Shafa'i — Static Volume Data
 *
 * Two volumes as defined in the PRD.
 * Architecture allows adding more volumes without changing app structure.
 */

import type { TartilVolume } from './types';

export const VOLUMES: TartilVolume[] = [
  {
    id: 'jilid-1',
    number: 1,
    name: 'Jilid 1',
    isPublished: true,
    order: 1,
  },
  {
    id: 'jilid-2',
    number: 2,
    name: 'Jilid 2',
    isPublished: true,
    order: 2,
  },
];

export function getVolumeById(id: string): TartilVolume | undefined {
  return VOLUMES.find((v) => v.id === id);
}

export function getVolumeNumber(volumeId: string): number {
  const idx = VOLUMES.findIndex((v) => v.id === volumeId);
  return idx >= 0 ? idx + 1 : 0;
}
