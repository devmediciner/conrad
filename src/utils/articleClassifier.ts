export type ClassificationType = 'anatomia' | 'patologia' | 'geral';

export type SystemType =
  | 'cardiaco'
  | 'pulmonar'
  | 'neuro'
  | 'abdominal'
  | 'musculoesqueletico'
  | 'urogenital'
  | 'outro';

export interface ClassifiedArticle {
  type: ClassificationType;
  system: SystemType;
}

export const SYSTEM_LABELS: Record<SystemType, string> = {
  cardiaco: 'Cardíaco',
  pulmonar: 'Pulmonar',
  neuro: 'Neurológico',
  abdominal: 'Abdominal',
  musculoesqueletico: 'Musculoesquelético',
  urogenital: 'Urogenital',
  outro: 'Outros',
};

// Map system types to nice icons/colors for better visuals
export const SYSTEM_COLORS: Record<SystemType, string> = {
  cardiaco: 'text-red-500 bg-red-500/10 border-red-500/20',
  pulmonar: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  neuro: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  abdominal: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  musculoesqueletico: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
  urogenital: 'text-pink-500 bg-pink-500/10 border-pink-500/20',
  outro: 'text-slate-500 bg-slate-500/10 border-slate-500/20',
};

function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function classifyArticle(title: string, content: string): ClassifiedArticle {
  const normTitle = normalizeText(title);
  const normContent = normalizeText(content);

  // 1. Classification type: Anatomia vs Patologia vs Geral
  let type: ClassificationType = 'geral';

  const anatomyKeywords = [
    'anatomia',
    'anatomico',
    'anatomica',
    'estruturas',
    'normal',
    'aspectos normais',
    'variante anatomica',
    'variante de normalidade',
    'posicionamento',
    'incidencia normal',
    'segmentos',
    'segmentacao',
    'variacoes anatomicas',
    'variacao anatomica',
  ];

  const hasAnatomyKeywords = anatomyKeywords.some(
    (keyword) => normTitle.includes(keyword) || normContent.includes(keyword)
  );

  // Exclude disease/pathology keywords from anatomy
  const pathologyIndicators = [
    'patologia',
    'doenca',
    'lesao',
    'tumor',
    'fratura',
    'sindrome',
    'sintomas',
    'tratamento',
    'acomete',
    'acometimento',
    'ruptura',
    'derrame',
    'obstrucao',
    'estenose',
    'aneurisma',
    'infarto',
    'avc',
    'isquemia',
    'cancer',
    'carcinoma',
    'processo inflamatorio',
    'inflamacao',
    'infeccao',
    'pneumonia',
  ];

  const hasPathologyIndicatorsInTitle = pathologyIndicators.some((indicator) =>
    normTitle.includes(indicator)
  );

  const hasPathologyIndicators = pathologyIndicators.some(
    (indicator) => normTitle.includes(indicator) || normContent.includes(indicator)
  );

  if (
    (normTitle.includes('anatomia') || normTitle.includes('normal') || normTitle.includes('estruturas') || normTitle.includes('posicionamento')) &&
    !hasPathologyIndicatorsInTitle
  ) {
    type = 'anatomia';
  } else if (hasAnatomyKeywords && !hasPathologyIndicatorsInTitle) {
    // Check if it really has anatomy content and very few pathology terms
    type = 'anatomia';
  } else if (hasPathologyIndicators || hasPathologyIndicatorsInTitle) {
    type = 'patologia';
  }

  // 2. System determination
  let system: SystemType = 'outro';

  // Cardiac keywords
  const cardiacKeywords = [
    'cardi',
    'coracao',
    'cardiaco',
    'cardiaca',
    'pericardi',
    'aorta',
    'valvular',
    'valvopatia',
    'hipertensao',
    'vascul',
    'arteria',
    'veia',
    'coronaria',
    'miocardi',
    'infarto',
  ];

  // Pulmonary keywords
  const pulmonaryKeywords = [
    'pulmao',
    'pulmonar',
    'torax',
    'pleura',
    'pleural',
    'pneumo',
    'pneumonia',
    'bronqu',
    'alveol',
    'lobo',
    'traqueia',
    'tuberculose',
    'atelectasia',
    'derrame',
  ];

  // Neuro keywords
  const neuroKeywords = [
    'neuro',
    'encefal',
    'cerebr',
    'avc',
    'isquem',
    'hemorragia',
    'mening',
    'cranial',
    'cranio',
    'esclerose',
    'medula',
    'liquor',
    'ventriculo',
    'hidrocefalia',
    'sella turcica',
    'sela turcica',
    'hipofise',
  ];

  // Abdominal keywords
  const abdominalKeywords = [
    'abdomen',
    'abdominal',
    'figado',
    'vesicula',
    'baco',
    'estomago',
    'intestino',
    'colon',
    'apendic',
    'pancrea',
    'gastro',
    'biliar',
    'colecist',
    'hernia',
    'peritone',
  ];

  // Musculoskeletal keywords
  const mskKeywords = [
    'fratura',
    'osso',
    'articulac',
    'femur',
    'coluna',
    'vertebra',
    'ligament',
    'tendao',
    'muscul',
    'esquelet',
    'artrose',
    'artrite',
    'osteoporose',
    'patela',
    'joelho',
    'ombro',
    'quadril',
    'punho',
    'tornozelo',
    'mao',
    'pe',
    'radio',
    'ulna',
    'umero',
    'clavicula',
    'escapula',
  ];

  // Urogenital keywords
  const urogenitalKeywords = [
    'rim',
    'renal',
    'bexiga',
    'utero',
    'ovario',
    'prostata',
    'ureter',
    'uretra',
    'mioma',
    'nefro',
    'cistite',
    'gestacao',
    'feto',
    'obstetrico',
    'ginecologico',
  ];

  const scores = {
    cardiaco: 0,
    pulmonar: 0,
    neuro: 0,
    abdominal: 0,
    musculoesqueletico: 0,
    urogenital: 0,
  };

  // Title matches (weight: 10)
  cardiacKeywords.forEach((k) => {
    if (normTitle.includes(k)) scores.cardiaco += 10;
  });
  pulmonaryKeywords.forEach((k) => {
    if (normTitle.includes(k)) scores.pulmonar += 10;
  });
  neuroKeywords.forEach((k) => {
    if (normTitle.includes(k)) scores.neuro += 10;
  });
  abdominalKeywords.forEach((k) => {
    if (normTitle.includes(k)) scores.abdominal += 10;
  });
  mskKeywords.forEach((k) => {
    if (normTitle.includes(k)) scores.musculoesqueletico += 10;
  });
  urogenitalKeywords.forEach((k) => {
    if (normTitle.includes(k)) scores.urogenital += 10;
  });

  // Content matches (weight: 1 per occurrence)
  cardiacKeywords.forEach((k) => {
    const matches = normContent.split(k).length - 1;
    scores.cardiaco += matches;
  });
  pulmonaryKeywords.forEach((k) => {
    const matches = normContent.split(k).length - 1;
    scores.pulmonar += matches;
  });
  neuroKeywords.forEach((k) => {
    const matches = normContent.split(k).length - 1;
    scores.neuro += matches;
  });
  abdominalKeywords.forEach((k) => {
    const matches = normContent.split(k).length - 1;
    scores.abdominal += matches;
  });
  mskKeywords.forEach((k) => {
    const matches = normContent.split(k).length - 1;
    scores.musculoesqueletico += matches;
  });
  urogenitalKeywords.forEach((k) => {
    const matches = normContent.split(k).length - 1;
    scores.urogenital += matches;
  });

  // Find max score
  let maxScore = 0;
  let detectedSystem: SystemType | null = null;
  for (const [sys, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      detectedSystem = sys as SystemType;
    }
  }

  // Set the system if maxScore is significant enough
  if (detectedSystem && maxScore >= 1) {
    system = detectedSystem;
  }

  return { type, system };
}

/**
 * Extracts explicit classification and system metadata stored in a hidden div in the article content.
 */
export function getMetadataFromContent(content: string): { type?: ClassificationType; system?: SystemType } {
  if (!content) return {};
  const match = content.match(/<div\s+id="article-metadata"\s+data-classification="([^"]+)"\s+data-system="([^"]+)"/i);
  if (match) {
    return {
      type: match[1] as ClassificationType,
      system: match[2] as SystemType,
    };
  }
  return {};
}

/**
 * Injects a hidden div with classification and system metadata into the article content.
 */
export function injectMetadataIntoContent(content: string, type: ClassificationType, system: SystemType): string {
  const clean = stripMetadataFromContent(content);
  return `${clean}\n<div id="article-metadata" data-classification="${type}" data-system="${system}" style="display: none;"></div>`;
}

/**
 * Removes the hidden metadata div from the article content (useful for editing in React Quill).
 */
export function stripMetadataFromContent(content: string): string {
  if (!content) return '';
  return content
    .replace(/<div\s+id="article-metadata"\s+data-classification="[^"]*"\s+data-system="[^"]*"\s*style="[^"]*"\s*><\/div>/gi, '')
    .replace(/<div\s+id="article-metadata"\s+data-classification="[^"]*"\s+data-system="[^"]*"\s*style="[^"]*"\s*\/>/gi, '')
    .trim();
}
