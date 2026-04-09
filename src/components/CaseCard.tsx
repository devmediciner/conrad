import { motion } from 'framer-motion';
import type { Case } from '@/types/case';
import { EXAM_TYPE_COLORS } from '@/types/case';

interface CaseCardProps {
  caseData: Case;
  index: number;
  onClick: () => void;
}

export function CaseCard({ caseData, index, onClick }: CaseCardProps) {
  const thumbnail = caseData.images?.[0];
  const badgeClass = EXAM_TYPE_COLORS[caseData.exam_type as keyof typeof EXAM_TYPE_COLORS] ?? 'bg-muted text-muted-foreground';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      onClick={onClick}
      className="group cursor-pointer rounded-xl bg-card border border-border overflow-hidden card-hover"
    >
      <div className="aspect-square overflow-hidden bg-secondary">
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
      </div>
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-semibold text-foreground">
            Caso #{caseData.case_number}
          </h3>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeClass}`}>
            {caseData.exam_type}
          </span>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {caseData.clinical_case}
        </p>
      </div>
    </motion.div>
  );
}
