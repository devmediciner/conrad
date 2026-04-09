export type ExamType = 'RX' | 'TC' | 'RM' | 'USG';

export interface Case {
  id: string;
  case_number: number;
  images: string[] | null;
  exam_type: ExamType;
  age: number | null;
  sex: string | null;
  clinical_case: string;
  diagnosis: string;
  source: string | null;
  status: string;
  submitted_by: string | null;
  created_at: string;
  updated_at: string;
}

export const EXAM_TYPE_COLORS: Record<ExamType, string> = {
  RX: 'bg-blue-600/80 text-blue-100',
  TC: 'bg-emerald-600/80 text-emerald-100',
  RM: 'bg-purple-600/80 text-purple-100',
  USG: 'bg-amber-600/80 text-amber-100',
};

export const EXAM_TYPE_LABELS: Record<ExamType, string> = {
  RX: 'Raio-X',
  TC: 'Tomografia',
  RM: 'Ressonância',
  USG: 'Ultrassom',
};
