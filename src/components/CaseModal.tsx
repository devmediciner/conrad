import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Case } from '@/types/case';
import { EXAM_TYPE_COLORS, EXAM_TYPE_LABELS } from '@/types/case';
import ImageViewer from './ImageViewer';
import { FormattedText } from './ui/FormattedText';

interface CaseModalProps {
  caseData: Case | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}



export function CaseModal({ caseData, open, onOpenChange }: CaseModalProps) {
  const [showDiagnosis, setShowDiagnosis] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);

  if (!caseData) return null;

  const badgeClass = EXAM_TYPE_COLORS[caseData.exam_type as keyof typeof EXAM_TYPE_COLORS] ?? '';
  const examLabel = EXAM_TYPE_LABELS[caseData.exam_type as keyof typeof EXAM_TYPE_LABELS] ?? caseData.exam_type;
  const images = caseData.images ?? [];
  const currentImage = images[selectedImage];
  const caseNum = caseData.case_number;

  const handleClose = () => {
    onOpenChange(false);
    setShowDiagnosis(false);
    setSelectedImage(0);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
        <DialogContent 
          className="max-w-4xl bg-card border-border max-h-[90vh] overflow-y-auto"
          onPointerDownOutside={(e) => {
            if (document.getElementById('image-viewer-fullscreen')) {
              e.preventDefault();
            }
          }}
          onInteractOutside={(e) => {
            if (document.getElementById('image-viewer-fullscreen')) {
              e.preventDefault();
            }
          }}
          onEscapeKeyDown={(e) => {
            const fsCloseBtn = document.getElementById('image-viewer-fs-close');
            if (fsCloseBtn) {
              e.preventDefault();
              fsCloseBtn.click();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle className="font-heading text-xl text-foreground flex items-center gap-3">
              Caso Radiológico
              <span className="text-xs font-mono bg-secondary text-muted-foreground px-2 py-0.5 rounded">
                #{caseNum}
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              {currentImage ? (
                <ImageViewer
                  src={currentImage}
                  alt="Imagem radiológica"
                  images={images}
                  selectedImage={selectedImage}
                  setSelectedImage={setSelectedImage}
                />
              ) : (
                <div className="aspect-square rounded-lg bg-secondary flex items-center justify-center text-muted-foreground">
                  Sem imagem
                </div>
              )}
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedImage(i)}
                      className={`w-16 h-16 rounded-md overflow-hidden border-2 flex-shrink-0 transition-colors ${
                        i === selectedImage ? 'border-primary' : 'border-border'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${badgeClass}`}>{examLabel}</span>
                {caseData.age && (
                  <span className="text-xs px-3 py-1 rounded-full bg-secondary text-secondary-foreground">{caseData.age} anos</span>
                )}
                {caseData.sex && (
                  <span className="text-xs px-3 py-1 rounded-full bg-secondary text-secondary-foreground">
                    {caseData.sex === 'M' ? 'Masculino' : caseData.sex === 'F' ? 'Feminino' : 'Outro'}
                  </span>
                )}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-1">Caso Clínico</h4>
                <FormattedText content={caseData.clinical_case} className="text-sm text-foreground leading-relaxed" />
              </div>
              <div>
                {!showDiagnosis ? (
                  <Button onClick={() => setShowDiagnosis(true)} className="w-full">Ver Laudo</Button>
                ) : (
                  <div className="space-y-1 animate-fade-up">
                    <h4 className="text-sm font-semibold text-primary">Laudo</h4>
                    {(caseData as any).disease && (
                      <p className="text-sm font-semibold text-foreground mb-2">
                        Diagnóstico: <span className="font-bold text-foreground">{(caseData as any).disease}</span>
                      </p>
                    )}
                    <FormattedText content={caseData.diagnosis} className="text-sm text-foreground leading-relaxed" />
                  </div>
                )}
              </div>
              {/* Source */}
              {caseData.source && (
                <p className="text-xs text-muted-foreground border-t border-border pt-3 mt-auto">
                  Fonte: {caseData.source}
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </>
  );
}
