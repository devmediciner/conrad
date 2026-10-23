import { AnatomyLabel, SliceCoordinate } from '@/types/conrademia';
import { SLICER_ANATOMY_LABELS } from '@/data/slicerAnatomyLabels';
import {
  SLICER_LABELS_BY_PLANE,
  ViewingPlane,
  PLANE_CONFIG,
  PlaneInfo
} from '@/data/slicerAnatomyLabelsByPlane';
import { supabase } from '@/integrations/supabase/client';

export type { ViewingPlane, PlaneInfo };
export { PLANE_CONFIG };

const STORAGE_KEY_PREFIX = 'conrademia_labels_v11_';
const EVENT_NAME = 'conrademia_labels_updated';

/**
 * Calculates a clean default leader line label position offset away from center
 */
export function calculateDefaultLabelPosition(pinX: number, pinY: number): { x: number; y: number } {
  // Offset horizontally away from center
  let labelX = pinX < 50 ? Math.max(8, pinX - 22) : Math.min(92, pinX + 22);
  
  // Offset vertically slightly
  let labelY = pinY < 45 ? Math.max(8, pinY - 14) : Math.min(92, pinY + 12);

  // Keep within margins
  labelX = Math.max(6, Math.min(94, labelX));
  labelY = Math.max(6, Math.min(94, labelY));

  return { x: labelX, y: labelY };
}

/**
 * Gets the effective coordinates for an organ on a specific slice
 */
export function getCoordinatesForSlice(
  label: AnatomyLabel,
  sliceIndex: number
): {
  pinX: number;
  pinY: number;
  labelX: number;
  labelY: number;
  isSliceCustom: boolean;
} {
  const custom = label.slicePositions?.[sliceIndex];
  const pinX = custom?.x ?? label.x;
  const pinY = custom?.y ?? label.y;

  let labelX = custom?.labelX ?? label.labelX;
  let labelY = custom?.labelY ?? label.labelY;

  if (labelX === undefined || labelY === undefined) {
    const autoPos = calculateDefaultLabelPosition(pinX, pinY);
    labelX = labelX ?? autoPos.x;
    labelY = labelY ?? autoPos.y;
  }

  return {
    pinX,
    pinY,
    labelX,
    labelY,
    isSliceCustom: !!custom,
  };
}

export const conrademiaService = {
  /**
   * Load labels from localStorage or fallback for a specific plane
   */
  async getLabels(plane: ViewingPlane = 'axial'): Promise<AnatomyLabel[]> {
    const storageKey = `${STORAGE_KEY_PREFIX}${plane}`;
    try {
      const local = localStorage.getItem(storageKey);
      if (local) {
        const parsed = JSON.parse(local) as AnatomyLabel[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn(`Erro ao ler labels do localStorage para plano ${plane}:`, e);
    }

    return SLICER_LABELS_BY_PLANE[plane] || SLICER_ANATOMY_LABELS;
  },

  /**
   * Save labels locally for a specific plane
   */
  async saveLabels(labels: AnatomyLabel[], plane: ViewingPlane = 'axial'): Promise<boolean> {
    const storageKey = `${STORAGE_KEY_PREFIX}${plane}`;
    try {
      localStorage.setItem(storageKey, JSON.stringify(labels));
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { labels, plane } }));
      return true;
    } catch (e) {
      console.error('Erro ao salvar labels:', e);
      return false;
    }
  },

  /**
   * Reset all labels for a specific plane to default
   */
  async resetToDefaults(plane: ViewingPlane = 'axial'): Promise<AnatomyLabel[]> {
    const storageKey = `${STORAGE_KEY_PREFIX}${plane}`;
    localStorage.removeItem(storageKey);
    const defaults = SLICER_LABELS_BY_PLANE[plane] || SLICER_ANATOMY_LABELS;
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { labels: defaults, plane } }));
    return defaults;
  },

  /**
   * Export labels to formatted JSON string
   */
  exportToJson(labels: AnatomyLabel[]): string {
    return JSON.stringify(labels, null, 2);
  },

  /**
   * Import labels from JSON string
   */
  importFromJson(jsonStr: string): AnatomyLabel[] {
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) {
      throw new Error('O formato precisa ser uma lista de estruturas (Array JSON).');
    }

    for (const item of parsed) {
      if (!item.id || !item.namePt || !item.sliceRange || typeof item.x !== 'number' || typeof item.y !== 'number') {
        throw new Error(`Estrutura inválida encontrada: "${item.namePt || item.id}". Verifique os campos.`);
      }
    }

    this.saveLabels(parsed);
    return parsed;
  },

  /**
   * Listen for label updates across tabs/windows
   */
  onUpdate(callback: (labels: AnatomyLabel[]) => void): () => void {
    const localHandler = (e: Event) => {
      const customEvent = e as CustomEvent<AnatomyLabel[]>;
      if (customEvent.detail) {
        callback(customEvent.detail);
      }
    };
    window.addEventListener(EVENT_NAME, localHandler);

    // Cross-tab / multi-tab live sync
    const storageHandler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            callback(parsed);
          }
        } catch (err) {
          console.warn('Erro ao processar storage event:', err);
        }
      }
    };
    window.addEventListener('storage', storageHandler);

    return () => {
      window.removeEventListener(EVENT_NAME, localHandler);
      window.removeEventListener('storage', storageHandler);
    };
  },
};
