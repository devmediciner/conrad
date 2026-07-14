import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Share2, Loader2, FileImage, Stethoscope } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { supabase } from '@/integrations/supabase/client';
import type { Case } from '@/types/case';
import { EXAM_TYPE_COLORS, EXAM_TYPE_LABELS } from '@/types/case';
import ImageViewer from '@/components/ImageViewer';
import { FormattedText } from '@/components/ui/FormattedText';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { stripHtml } from '@/lib/utils';

export default function LerCaso() {
  const { idOrNum } = useParams();
  const [caso, setCaso] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDiagnosis, setShowDiagnosis] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [viewingLaudoImages, setViewingLaudoImages] = useState(false);

  useEffect(() => {
    if (showDiagnosis && caso?.laudo_images && caso.laudo_images.length > 0) {
      setViewingLaudoImages(true);
    } else {
      setViewingLaudoImages(false);
    }
  }, [showDiagnosis, caso]);

  useEffect(() => {
    setSelectedImage(0);
  }, [viewingLaudoImages]);

  useEffect(() => {
    const fetchCaso = async () => {
      if (!idOrNum) return;
      setLoading(true);
      
      let data: Case | null = null;
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrNum);
      
      try {
        if (isUUID) {
          const { data: byId, error } = await supabase
            .from('cases')
            .select('*')
            .eq('id', idOrNum)
            .single();
          if (error) throw error;
          if (byId) data = byId;
        } else {
          const num = parseInt(idOrNum, 10);
          if (!isNaN(num)) {
            const { data: byNum, error } = await supabase
              .from('cases')
              .select('*')
              .eq('case_number', num)
              .single();
            if (error) throw error;
            if (byNum) data = byNum;
          }
        }
      } catch (err) {
        console.error('Erro ao buscar o caso clínico:', err);
      }

      setCaso(data);
      setLoading(false);
    };

    fetchCaso();
  }, [idOrNum]);

  useEffect(() => {
    if (caso) {
      const examLabel = EXAM_TYPE_LABELS[caso.exam_type as keyof typeof EXAM_TYPE_LABELS] || caso.exam_type;
      const diseaseSuffix = caso.disease ? ` - ${caso.disease}` : '';
      document.title = `Caso Clínico #${caso.case_number} (${examLabel})${diseaseSuffix} | CONRAD`;
    } else if (!loading) {
      document.title = 'Caso Clínico não encontrado | CONRAD';
    }
    return () => {
      document.title = 'GALERIA - CONRAD';
    };
  }, [caso, loading]);

  const handleShare = async () => {
    if (!caso) return;
    const shareUrl = `${window.location.origin}/caso/${caso.case_number}`;
    const shareTitle = `Caso Clínico #${caso.case_number} - Galeria Radiológica CONRAD`;
    const shareText = `Confira este caso clínico de ${EXAM_TYPE_LABELS[caso.exam_type as keyof typeof EXAM_TYPE_LABELS] || caso.exam_type} no site da CONRAD:\n ${shareUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
        });
        toast.success('Caso compartilhado com sucesso!');
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          copyToClipboard(shareUrl);
        }
      }
    } else {
      copyToClipboard(shareUrl);
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url)
      .then(() => {
        toast.success('Link do caso copiado para a área de transferência! 📋');
      })
      .catch(() => {
        toast.error('Erro ao copiar o link.');
      });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!caso) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4">
        <h1 className="text-3xl font-bold text-foreground">Caso não encontrado</h1>
        <Link to="/" className="text-primary hover:underline font-semibold">Voltar para a Página Inicial</Link>
      </div>
    );
  }

  const badgeClass = EXAM_TYPE_COLORS[caso.exam_type as keyof typeof EXAM_TYPE_COLORS] ?? '';
  const examLabel = EXAM_TYPE_LABELS[caso.exam_type as keyof typeof EXAM_TYPE_LABELS] ?? caso.exam_type;
  const hasLaudoImages = !!(caso.laudo_images && caso.laudo_images.length > 0);
  const images = (viewingLaudoImages && hasLaudoImages)
    ? caso.laudo_images!
    : (caso.images ?? []);
  const currentImage = images[selectedImage];
  const caseNum = caso.case_number;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-28 pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            {/* Header row */}
            <div className="mb-4">
              <Link 
                to="/" 
                className="inline-flex items-center gap-2 text-sm text-primary font-semibold hover:underline transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Voltar para o Início
              </Link>
            </div>

            {/* Main Content card */}
            <div className="bg-card/40 backdrop-blur-md border border-border/80 rounded-3xl p-6 md:p-8 shadow-xl">
              {currentImage ? (
                <ImageViewer
                  src={currentImage}
                  alt="Imagem radiológica do caso"
                  images={images}
                  selectedImage={selectedImage}
                  setSelectedImage={setSelectedImage}
                  examType={caso.exam_type}
                  layout="three-columns"
                  imageSource={caso.image_source}
                  leftColumnTop={
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleShare}
                      className="w-full h-8 rounded-lg border-border hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300 flex items-center justify-center gap-1.5 text-xs font-bold px-2"
                    >
                      <Share2 className="w-3.5 h-3.5" /> Compartilhar
                    </Button>
                  }
                  leftColumnExtra={null}
                  imageTopContent={
                    hasLaudoImages && showDiagnosis ? (
                      <div className="grid grid-cols-2 gap-2 bg-background border border-border/60 p-1.5 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setViewingLaudoImages(false)}
                          className={`flex items-center justify-center gap-2 text-xs py-2.5 rounded-lg font-bold transition-all ${
                            !viewingLaudoImages
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
                          }`}
                        >
                          <FileImage className="w-4 h-4" /> Imagem do Caso
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewingLaudoImages(true)}
                          className={`flex items-center justify-center gap-2 text-xs py-2.5 rounded-lg font-bold transition-all ${
                            viewingLaudoImages
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
                          }`}
                        >
                          <Stethoscope className="w-4 h-4" /> Imagem Detalhada
                        </button>
                      </div>
                    ) : null
                  }
                  caseDetails={
                    <div className="space-y-4">
                      <div className="flex flex-nowrap items-center gap-1.5 w-full overflow-x-auto">
                        <span className="text-[11px] px-2.5 py-1 rounded-full font-bold font-mono bg-secondary text-secondary-foreground whitespace-nowrap flex-shrink-0">
                          Caso #{caseNum}
                        </span>
                        <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium whitespace-nowrap flex-shrink-0 ${badgeClass}`}>{examLabel}</span>
                        {caso.age && (
                          <span className="text-[11px] px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground whitespace-nowrap flex-shrink-0">{caso.age}a</span>
                        )}
                        {caso.sex && (
                          <span className="text-[11px] px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground whitespace-nowrap flex-shrink-0">
                            {caso.sex === 'M' || caso.sex?.toLowerCase() === 'masculino' ? 'Masc.' : caso.sex === 'F' || caso.sex?.toLowerCase() === 'feminino' ? 'Fem.' : 'Outro'}
                          </span>
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-muted-foreground mb-1">Caso Clínico</h4>
                        <FormattedText content={caso.clinical_case} className="text-sm text-foreground leading-relaxed" />
                      </div>
                      <div>
                        {!showDiagnosis ? (
                          <Button onClick={() => setShowDiagnosis(true)} className="w-full">Ver Laudo</Button>
                        ) : (
                          <div className="space-y-3.5 animate-fade-up">
                            {caso.disease && (
                              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">
                                  Diagnóstico
                                </h4>
                                <p className="text-sm font-semibold text-foreground">
                                  {caso.disease}
                                </p>
                              </div>
                            )}
                            
                            <div className="border border-border rounded-lg p-3 bg-muted/20">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-1.5">
                                Laudo Radiológico
                              </h4>
                              <FormattedText content={caso.diagnosis} className="text-sm text-foreground leading-relaxed" />
                            </div>

                            {caso.comments && (
                              <div className="border border-border rounded-lg p-3 bg-muted/20 animate-fade-up">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-1.5">
                                  Comentários
                                </h4>
                                <FormattedText content={caso.comments} className="text-sm text-foreground leading-relaxed" />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {/* Author */}
                      {caso.author && (
                        <div className="text-[11px] text-muted-foreground border-t border-border pt-3 mt-auto">
                          <p>
                            Caso elaborado por: <span className="font-semibold text-foreground/80">{caso.author}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  }
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="aspect-square rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground">
                    Sem imagem
                  </div>
                  <div className="space-y-4">
                    <div className="flex flex-nowrap items-center gap-1.5 w-full overflow-x-auto">
                      <span className="text-[11px] px-2.5 py-1 rounded-full font-bold font-mono bg-secondary text-secondary-foreground whitespace-nowrap flex-shrink-0">
                        Caso #{caseNum}
                      </span>
                      <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium whitespace-nowrap flex-shrink-0 ${badgeClass}`}>{examLabel}</span>
                      {caso.age && (
                        <span className="text-[11px] px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground whitespace-nowrap flex-shrink-0">{caso.age}a</span>
                      )}
                      {caso.sex && (
                        <span className="text-[11px] px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground whitespace-nowrap flex-shrink-0">
                          {caso.sex === 'M' || caso.sex?.toLowerCase() === 'masculino' ? 'Masc.' : caso.sex === 'F' || caso.sex?.toLowerCase() === 'feminino' ? 'Fem.' : 'Outro'}
                        </span>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleShare}
                        className="ml-auto h-7 px-2.5 rounded-full border-border hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300 flex items-center gap-1.5 text-[11px] font-bold"
                      >
                        <Share2 className="w-3.5 h-3.5" /> Compartilhar
                      </Button>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground mb-1">Caso Clínico</h4>
                      <FormattedText content={caso.clinical_case} className="text-sm text-foreground leading-relaxed" />
                    </div>
                    <div>
                      {!showDiagnosis ? (
                        <Button onClick={() => setShowDiagnosis(true)} className="w-full">Ver Laudo</Button>
                      ) : (
                        <div className="space-y-3.5 animate-fade-up">
                          {caso.disease && (
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">
                                Diagnóstico
                              </h4>
                              <p className="text-sm font-semibold text-foreground">
                                {caso.disease}
                              </p>
                            </div>
                          )}
                          
                          <div className="border border-border rounded-lg p-3 bg-muted/20">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-1.5">
                              Laudo Radiológico
                            </h4>
                            <FormattedText content={caso.diagnosis} className="text-sm text-foreground leading-relaxed" />
                          </div>

                          {hasLaudoImages && (
                            <div className="border border-border rounded-lg p-3 bg-muted/20 animate-fade-up space-y-2">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
                                Exibir Imagem
                              </h4>
                              <div className="grid grid-cols-2 gap-1.5 bg-background border border-border/60 p-1.5 rounded-lg">
                                <button
                                  type="button"
                                  onClick={() => setViewingLaudoImages(false)}
                                  className={`flex items-center justify-center gap-1.5 text-[11px] py-2 rounded-md font-bold transition-all ${
                                    !viewingLaudoImages
                                      ? 'bg-primary text-primary-foreground shadow-sm'
                                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'
                                  }`}
                                >
                                  <FileImage className="w-3.5 h-3.5" /> Imagem do Caso
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setViewingLaudoImages(true)}
                                  className={`flex items-center justify-center gap-1.5 text-[11px] py-2 rounded-md font-bold transition-all ${
                                    viewingLaudoImages
                                      ? 'bg-blue-600 text-white shadow-sm'
                                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'
                                  }`}
                                >
                                  <Stethoscope className="w-3.5 h-3.5" /> Imagem Detalhada
                                </button>
                              </div>
                            </div>
                          )}

                          {caso.comments && (
                            <div className="border border-border rounded-lg p-3 bg-muted/20 animate-fade-up">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-1.5">
                                Comentários
                              </h4>
                              <FormattedText content={caso.comments} className="text-sm text-foreground leading-relaxed" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {/* Author */}
                    {caso.author && (
                      <div className="text-[11px] text-muted-foreground border-t border-border pt-3 mt-auto">
                        <p>
                          Caso elaborado por: <span className="font-semibold text-foreground/80">{caso.author}</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
