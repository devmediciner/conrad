import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Maximize2, X, ZoomIn, ZoomOut, Sun, Contrast, RotateCcw } from 'lucide-react';
import type { Case } from '@/types/case';
import { EXAM_TYPE_COLORS, EXAM_TYPE_LABELS } from '@/types/case';

interface CaseModalProps {
  caseData: Case | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ImageViewer({ src, alt }: { src: string; alt: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [invert, setInvert] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom <= 1) return;
    e.preventDefault();
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }, [zoom, pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    setPan({
      x: dragStart.current.panX + (e.clientX - dragStart.current.x),
      y: dragStart.current.panY + (e.clientY - dragStart.current.y),
    });
  }, [dragging]);

  const handleMouseUp = useCallback(() => setDragging(false), []);

  useEffect(() => { setPan({ x: 0, y: 0 }); }, [zoom, src]);

  const resetControls = () => {
    setZoom(1); setBrightness(100); setContrast(100); setInvert(false); setPan({ x: 0, y: 0 });
  };

  const filterStyle = `brightness(${brightness}%) contrast(${contrast}%)${invert ? ' invert(1)' : ''}`;

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        className="relative w-full aspect-square rounded-lg overflow-hidden bg-secondary"
        style={{ cursor: zoom > 1 ? (dragging ? 'grabbing' : 'grab') : 'default' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="w-full h-full object-contain transition-transform duration-200 select-none"
          style={{
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            filter: filterStyle,
          }}
        />
      </div>

      <div className="bg-secondary/50 rounded-lg p-3 space-y-2">
        <div className="flex items-center gap-3">
          <ZoomOut className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <Slider value={[zoom]} onValueChange={([v]) => setZoom(v)} min={0.5} max={3} step={0.1} className="flex-1" />
          <ZoomIn className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <span className="text-xs text-muted-foreground w-10 text-right">{Math.round(zoom * 100)}%</span>
        </div>
        <div className="flex items-center gap-3">
          <Sun className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <Slider value={[brightness]} onValueChange={([v]) => setBrightness(v)} min={20} max={300} step={5} className="flex-1" />
          <span className="text-xs text-muted-foreground w-10 text-right">{brightness}%</span>
        </div>
        <div className="flex items-center gap-3">
          <Contrast className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <Slider value={[contrast]} onValueChange={([v]) => setContrast(v)} min={20} max={300} step={5} className="flex-1" />
          <span className="text-xs text-muted-foreground w-10 text-right">{contrast}%</span>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Button variant={invert ? 'default' : 'outline'} size="sm" className="text-xs h-7" onClick={() => setInvert(!invert)}>
            Inverter
          </Button>
          <Button variant="outline" size="sm" className="text-xs h-7" onClick={resetControls}>
            <RotateCcw className="w-3 h-3 mr-1" /> Resetar
          </Button>
        </div>
      </div>
    </div>
  );
}

export function CaseModal({ caseData, open, onOpenChange }: CaseModalProps) {
  const [showDiagnosis, setShowDiagnosis] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [fsBrightness, setFsBrightness] = useState(100);
  const [fsContrast, setFsContrast] = useState(100);
  const [fsInvert, setFsInvert] = useState(false);

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
    setFullscreen(false);
  };

  return (
    <>
      <Dialog open={open && !fullscreen} onOpenChange={(o) => { if (!o) handleClose(); }}>
        <DialogContent className="max-w-4xl bg-card border-border max-h-[90vh] overflow-y-auto">
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
                <div className="relative">
                  <ImageViewer src={currentImage} alt="Imagem radiológica" />
                  <button
                    onClick={(e) => { e.stopPropagation(); setFullscreen(true); }}
                    className="absolute top-2 right-2 bg-background/70 hover:bg-background/90 rounded-md p-1.5 transition-colors z-20"
                  >
                    <Maximize2 className="w-4 h-4 text-foreground" />
                  </button>
                </div>
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
                <p className="text-sm text-foreground leading-relaxed">{caseData.clinical_case}</p>
              </div>
              <div>
                {!showDiagnosis ? (
                  <Button onClick={() => setShowDiagnosis(true)} className="w-full">Ver Diagnóstico</Button>
                ) : (
                  <div className="space-y-1 animate-fade-up">
                    <h4 className="text-sm font-semibold text-primary">Diagnóstico</h4>
                    <p className="text-sm text-foreground leading-relaxed">{caseData.diagnosis}</p>
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

      {/* Fullscreen overlay */}
      {fullscreen && currentImage && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
          <div className="flex items-center justify-between p-4">
            <span className="text-white/60 text-sm font-mono">Caso #{caseNum}</span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFsInvert(!fsInvert)}
                  className={`text-xs px-3 py-1 rounded ${fsInvert ? 'bg-white text-black' : 'bg-white/10 text-white/80 hover:bg-white/20'}`}
                >
                  Inverter
                </button>
                <label className="text-white/60 text-xs flex items-center gap-1">
                  <Sun className="w-3 h-3" />
                  <input type="range" min={20} max={300} value={fsBrightness} onChange={(e) => setFsBrightness(Number(e.target.value))} className="w-20 accent-primary" />
                </label>
                <label className="text-white/60 text-xs flex items-center gap-1">
                  <Contrast className="w-3 h-3" />
                  <input type="range" min={20} max={300} value={fsContrast} onChange={(e) => setFsContrast(Number(e.target.value))} className="w-20 accent-primary" />
                </label>
              </div>
              <button
                onClick={() => setFullscreen(false)}
                className="bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center p-4 min-h-0">
            <img
              src={currentImage}
              alt="Imagem radiológica em tela cheia"
              className="max-w-full max-h-full object-contain"
              style={{
                filter: `brightness(${fsBrightness}%) contrast(${fsContrast}%)${fsInvert ? ' invert(1)' : ''}`,
              }}
            />
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 justify-center p-4">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setSelectedImage(i); }}
                  className={`w-14 h-14 rounded-md overflow-hidden border-2 flex-shrink-0 transition-colors ${
                    i === selectedImage ? 'border-primary' : 'border-white/20'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
