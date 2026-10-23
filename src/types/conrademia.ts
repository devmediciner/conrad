export interface SliceCoordinate {
  x: number;       // percentage 0-100 on the image
  y: number;       // percentage 0-100 on the image
  labelX?: number; // percentage 0-100 for the leader line label badge
  labelY?: number; // percentage 0-100 for the leader line label badge
}

export type AnatomyCategory = 
  | 'digestivo' 
  | 'urinario' 
  | 'vascular' 
  | 'linfatico' 
  | 'musculoesqueletico' 
  | 'reprodutor'
  | 'outro';

export interface AnatomyLabel {
  id: string;
  name: string;        // English name
  namePt: string;      // Portuguese name
  color: string;       // Hex color (e.g. #e74c3c)
  sliceRange: [number, number]; // [startSlice, endSlice] 0-based index
  x: number;           // default pin X (0-100%)
  y: number;           // default pin Y (0-100%)
  labelX?: number;     // default label badge X (0-100%)
  labelY?: number;     // default label badge Y (0-100%)
  description: string;
  category?: AnatomyCategory;
  slicePositions?: Record<number, SliceCoordinate>; // slice-specific overrides
}
