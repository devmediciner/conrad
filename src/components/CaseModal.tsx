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
import { FileImage, Stethoscope } from 'lucide-react';

interface CaseModalProps {
  caseData: Case | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}



export function CaseModal({ caseData, open, onOpenChange }: CaseModalProps) {
  const [showDiagnosis, setShowDiagnosis] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [viewingLaudoImages, setViewingLaudoImages] = useState(false);

  useEffect(() => {
    if (showDiagnosis && caseData?.laudo_images && caseData.laudo_images.length > 0) {
      setViewingLaudoImages(true);
    } else {
      setViewingLaudoImages(false);
    }
  }, [showDiagnosis, caseData]);

  useEffect(() => {
    setSelectedImage(0);
  }, [viewingLaudoImages]);

  if (!caseData) return null;

  const badgeClass = EXAM_TYPE_COLORS[caseData.exam_type as keyof typeof EXAM_TYPE_COLORS] ?? '';
  const examLabel = EXAM_TYPE_LABELS[caseData.exam_type as keyof typeof EXAM_TYPE_LABELS] ?? caseData.exam_type;
  const hasLaudoImages = !!(caseData.laudo_images && caseData.laudo_images.length > 0);
  const images = (viewingLaudoImages && hasLaudoImages)
    ? caseData.laudo_images!
    : (caseData.images ?? []);
  const currentImage = images[selectedImage];
  const caseNum = caseData.case_number;

  const handleClose = () => {
    onOpenChange(false);
    setShowDiagnosis(false);
    setSelectedImage(0);
    setViewingLaudoImages(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
        <DialogContent 
          className="max-w-6xl w-[95vw] max-h-[90vh] bg-card border-border md:h-[85vh] md:max-h-[85vh] md:overflow-hidden flex flex-col overflow-y-auto"
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
          <DialogHeader className="sr-only">
            <DialogTitle>Caso #{caseNum}</DialogTitle>
          </DialogHeader>

          {currentImage ? (
            <ImageViewer
              src={currentImage}
              alt="Imagem radiológica"
              images={images}
              selectedImage={selectedImage}
              setSelectedImage={setSelectedImage}
              examType={caseData.exam_type}
              layout="three-columns"
              imageSource={caseData.image_source}
              leftColumnExtra={
                hasLaudoImages && showDiagnosis ? (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Exibir Imagem
                    </span>
                    <div className="grid grid-cols-2 gap-1 bg-background border border-border/60 p-1 rounded-md">
                      <button
                        type="button"
                        onClick={() => setViewingLaudoImages(false)}
                        className={`flex items-center justify-center gap-1.5 text-[11px] py-1 rounded font-bold transition-all ${
                          !viewingLaudoImages
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'
                        }`}
                      >
                        <FileImage className="w-3.5 h-3.5" /> Caso
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewingLaudoImages(true)}
                        className={`flex items-center justify-center gap-1.5 text-[11px] py-1 rounded font-bold transition-all ${
                          viewingLaudoImages
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'
                        }`}
                      >
                        <Stethoscope className="w-3.5 h-3.5" /> Laudo
                      </button>
                    </div>
                  </div>
                ) : null
              }
              caseDetails={
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs px-3 py-1 rounded-full font-bold font-mono bg-secondary text-secondary-foreground">
                      Caso #{caseNum}
                    </span>
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
                      <div className="space-y-3.5 animate-fade-up">
                        {caseData.disease && (
                          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">
                              Diagnóstico
                            </h4>
                            <p className="text-sm font-semibold text-foreground">
                              {caseData.disease}
                            </p>
                          </div>
                        )}
                        
                        <div className="border border-border rounded-lg p-3 bg-muted/20">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-1.5">
                            Laudo Clínico
                          </h4>
                          <FormattedText content={caseData.diagnosis} className="text-sm text-foreground leading-relaxed" />
                        </div>

                        {caseData.comments && (
                          <div className="border border-border rounded-lg p-3 bg-muted/20 animate-fade-up">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-1.5">
                              Comentários
                            </h4>
                            <FormattedText content={caseData.comments} className="text-sm text-foreground leading-relaxed" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Author */}
                  {caseData.author && (
                    <div className="text-[11px] text-muted-foreground border-t border-border pt-3 mt-auto">
                      <p>
                        Caso elaborado por: <span className="font-semibold text-foreground/80">{caseData.author}</span>
                      </p>
                    </div>
                  )}
                </div>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="aspect-square rounded-lg bg-secondary flex items-center justify-center text-muted-foreground">
                Sem imagem
              </div>
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs px-3 py-1 rounded-full font-bold font-mono bg-secondary text-secondary-foreground">
                    Caso #{caseNum}
                  </span>
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
                    <div className="space-y-3.5 animate-fade-up">
                      {caseData.disease && (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">
                            Diagnóstico
                          </h4>
                          <p className="text-sm font-semibold text-foreground">
                            {caseData.disease}
                          </p>
                        </div>
                      )}
                      
                      <div className="border border-border rounded-lg p-3 bg-muted/20">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-1.5">
                          Laudo Clínico
                        </h4>
                        <FormattedText content={caseData.diagnosis} className="text-sm text-foreground leading-relaxed" />
                      </div>

                      {hasLaudoImages && (
                        <div className="border border-border rounded-lg p-3 bg-muted/20 animate-fade-up space-y-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
                            Exibir Imagem
                          </h4>
                          <div className="grid grid-cols-2 gap-1 bg-background border border-border/60 p-1 rounded-md">
                            <button
                              type="button"
                              onClick={() => setViewingLaudoImages(false)}
                              className={`flex items-center justify-center gap-1.5 text-[11px] py-1.5 rounded font-bold transition-all ${
                                !viewingLaudoImages
                                  ? 'bg-primary text-primary-foreground shadow-sm'
                                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'
                              }`}
                            >
                              <FileImage className="w-3.5 h-3.5" /> Caso
                            </button>
                            <button
                              type="button"
                              onClick={() => setViewingLaudoImages(true)}
                              className={`flex items-center justify-center gap-1.5 text-[11px] py-1.5 rounded font-bold transition-all ${
                                viewingLaudoImages
                                  ? 'bg-blue-600 text-white shadow-sm'
                                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'
                              }`}
                            >
                              <Stethoscope className="w-3.5 h-3.5" /> Laudo
                            </button>
                          </div>
                        </div>
                      )}

                      {caseData.comments && (
                        <div className="border border-border rounded-lg p-3 bg-muted/20 animate-fade-up">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-1.5">
                            Comentários
                          </h4>
                          <FormattedText content={caseData.comments} className="text-sm text-foreground leading-relaxed" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {/* Author */}
                {caseData.author && (
                  <div className="text-[11px] text-muted-foreground border-t border-border pt-3 mt-auto">
                    <p>
                      Caso elaborado por: <span className="font-semibold text-foreground/80">{caseData.author}</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </>
  );
}
