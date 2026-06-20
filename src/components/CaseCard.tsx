import { motion } from 'framer-motion';
import type { Case } from '@/types/case';
import { EXAM_TYPE_COLORS } from '@/types/case';
import { stripHtml } from '@/lib/utils';

interface CaseCardProps {
  caseData: Case;
  index: number;
  onClick: () => void;
  showDiagnosis?: boolean;
}

export function CaseCard({ caseData, index, onClick, showDiagnosis = false }: CaseCardProps) {
  const thumbnail = caseData.images?.[0];
  const badgeClass = EXAM_TYPE_COLORS[caseData.exam_type as keyof typeof EXAM_TYPE_COLORS] ?? 'bg-muted text-muted-foreground';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      onClick={onClick}
      className="group cursor-pointer rounded-2xl bg-card/60 backdrop-blur-sm border border-border/60 hover:border-primary/40 overflow-hidden card-hover transition-all duration-300 shadow-sm hover:shadow-md"
    >
      <div className="aspect-square overflow-hidden bg-secondary relative">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={`Caso ${index + 1}`}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
            Sem imagem
          </div>
        )}
        
        {/* Floating modality badge */}
        <span className={`absolute top-3 right-3 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${badgeClass} shadow-md`}>
          {caseData.exam_type}
        </span>
      </div>
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-bold text-foreground truncate max-w-[190px]" title={showDiagnosis ? (caseData.disease || `Caso #${caseData.case_number}`) : `Caso #${caseData.case_number}`}>
            {showDiagnosis ? (caseData.disease || `Caso #${caseData.case_number}`) : `Caso #${caseData.case_number}`}
          </h3>
          {caseData.sex && (
            <span className="text-[10px] text-muted-foreground font-semibold flex-shrink-0">
              {caseData.sex === 'M' || caseData.sex?.toLowerCase() === 'masculino' ? 'M' : 'F'}, {caseData.age}a
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {stripHtml(caseData.clinical_case)}
        </p>
      </div>
    </motion.div>
  );
}
