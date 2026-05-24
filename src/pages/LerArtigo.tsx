import { useState, useEffect } from 'react';
import type { Article } from '@/types/article';
import type { Case } from '@/types/case';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, User, Loader2, FileText, ArrowRight, X, ZoomIn, ZoomOut, Sun, Contrast, ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { supabase } from '@/integrations/supabase/client';
import 'react-quill/dist/quill.snow.css';

export default function LerArtigo() {
  const { id } = useParams();
  const [artigo, setArtigo] = useState<Article | null>(null);
  const [casosRelacionados, setCasosRelacionados] = useState<Case[]>([]);
  const [activeCaseModal, setActiveCaseModal] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);

  // Estados Avançados do Modal de Imagem
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showDiagnosis, setShowDiagnosis] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Reseta as configurações visuais toda vez que abrir um caso novo
  useEffect(() => {
    if (activeCaseModal) {
      setActiveImageIndex(0);
      setShowDiagnosis(false);
      setZoom(1);
      setBrightness(100);
      setContrast(100);
      setPosition({ x: 0, y: 0 });
    }
  }, [activeCaseModal]);

  useEffect(() => {
    const fetchArtigo = async () => {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) {
        setArtigo(data);
        
        // Se o artigo tiver casos vinculados, busque todos eles da base de dados
        if (data.related_cases_ids && data.related_cases_ids.length > 0) {
          const { data: casosData } = await supabase.from('cases').select('*').in('id', data.related_cases_ids);
          if (casosData) setCasosRelacionados(casosData);
        }
      }
      setLoading(false);
    };

    if (id) fetchArtigo();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!artigo) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4">
        <h1 className="text-3xl font-bold text-foreground">Artigo não encontrado</h1>
        <Link to="/" className="text-primary hover:underline">Voltar para a Página Inicial</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <article className="pt-28 pb-20 px-4">
        {/* Container do Cabeçalho e Capa - Mais largo para impacto visual */}
        <div className="container mx-auto max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Link to="/artigos" className="inline-flex items-center gap-2 text-sm text-primary font-semibold hover:underline mb-10 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Voltar para Artigos
            </Link>

            {/* Cabeçalho do Artigo */}
            <div className="mb-10 text-center space-y-6">
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground tracking-tight leading-[1.15]">
                {artigo.titulo}
              </h1>
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-muted-foreground font-medium pt-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shadow-sm">
                    {artigo.autor?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span className="text-foreground font-semibold text-base">{artigo.autor || 'Usuário Desconhecido'}</span>
                </div>
                <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full border border-border/50">
                  <Calendar className="w-4 h-4" /> 
                  {new Date(artigo.data_publicacao).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </div>
              </div>
            </div>

            {/* Imagem de Capa */}
            {artigo.imagem_capa && (
              <div className="w-full h-[400px] md:h-[500px] rounded-3xl overflow-hidden mb-16 border border-border/50 shadow-2xl relative">
                <img src={artigo.imagem_capa} alt={artigo.titulo} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-background/10 to-transparent pointer-events-none"></div>
              </div>
            )}
          </motion.div>
        </div>

        {/* Container do Texto - Mais estreito para melhor leitura */}
        <div className="container mx-auto max-w-[750px]">
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }}>
            {/* Conteúdo Renderizado */}
            <div className="ql-snow">
              <div 
                className="ql-editor !p-0 w-full max-w-none text-foreground/90 md:text-lg !leading-loose whitespace-pre-wrap break-words 
                  [&_h1]:!text-4xl md:[&_h1]:!text-5xl [&_h1]:!font-extrabold [&_h1]:!tracking-tight [&_h1]:!mt-14 [&_h1]:!mb-6 [&_h1]:!text-foreground [&_h1]:!leading-tight
                  [&_h2]:!text-3xl md:[&_h2]:!text-4xl [&_h2]:!font-bold [&_h2]:!tracking-tight [&_h2]:!mt-12 [&_h2]:!mb-4 [&_h2]:!text-foreground [&_h2]:!border-b [&_h2]:!border-border/50 [&_h2]:!pb-2
                  [&_h3]:!text-2xl md:[&_h3]:!text-3xl [&_h3]:!font-semibold [&_h3]:!tracking-tight [&_h3]:!mt-8 [&_h3]:!mb-4 [&_h3]:!text-foreground
                  [&_p]:!mb-6 [&_p]:!text-foreground/80
                  [&_strong]:!font-bold [&_strong]:!text-foreground
                  [&_a]:!text-primary [&_a]:!font-semibold [&_a]:!underline [&_a]:!underline-offset-4 [&_a]:!decoration-primary/30 hover:[&_a]:!decoration-primary [&_a]:transition-colors
                  [&_ul]:!list-disc [&_ul_li]:!list-disc [&_ul]:!pl-6 [&_ul]:!mb-6 [&_ul]:!space-y-2 [&_li]:!pl-1 [&_li]:marker:!text-primary/70 [&_li::before]:!content-none [&_li]:!list-item [&_li_p]:!m-0
                  [&_ol]:!list-decimal [&_ol_li]:!list-decimal [&_ol]:!pl-6 [&_ol]:!mb-6 [&_ol]:!space-y-2 [&_li]:!pl-1 [&_li]:marker:!text-primary/70 [&_li]:marker:!font-bold [&_li::before]:!content-none [&_li]:!list-item [&_li_p]:!m-0
                  [&_blockquote]:!border-l-4 [&_blockquote]:!border-primary [&_blockquote]:!pl-6 [&_blockquote]:!py-2 [&_blockquote]:!my-8 [&_blockquote]:!italic [&_blockquote]:!text-foreground/70 [&_blockquote]:!bg-muted/30 [&_blockquote]:!rounded-r-xl
                  [&_img]:!rounded-2xl [&_img]:mx-auto [&_img]:!shadow-xl [&_img]:!mt-12 [&_img]:!mb-3 [&_img]:!max-w-full [&_img]:!border [&_img]:!border-border/20 [&_img]:!object-cover
                  [&_iframe]:!w-full [&_iframe]:!aspect-video [&_iframe]:!rounded-2xl [&_iframe]:!shadow-xl [&_iframe]:!my-12 [&_iframe]:!border-0"
                dangerouslySetInnerHTML={{ __html: artigo.conteudo }} 
              />
            </div>

            {/* Listagem Dinâmica de Casos Relacionados */}
            {casosRelacionados.length > 0 && (
              <div className="mt-16 space-y-6">
                <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2 border-b border-border/50 pb-4">
                  <FileText className="w-5 h-5 text-primary" /> Estude {casosRelacionados.length > 1 ? 'estes Casos Práticos' : 'este Caso Prático'}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {casosRelacionados.map((caso) => (
                    <div 
                      key={caso.id} 
                      onClick={() => setActiveCaseModal(caso)} 
                      className="group flex flex-col p-4 bg-muted/20 hover:bg-muted/45 rounded-3xl border border-border hover:border-primary/45 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer text-left"
                    >
                      {/* Imagem do Caso */}
                      <div className="w-full h-40 rounded-2xl overflow-hidden bg-background border border-border/50 shadow-inner shrink-0 relative mb-4">
                        {caso.images?.[0] ? (
                          <img src={caso.images[0]} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Imagem do Caso" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted/30 uppercase font-bold text-lg">{caso.exam_type}</div>
                        )}
                        <span className="absolute top-2.5 right-2.5 text-[9px] px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/10 uppercase font-bold tracking-wider">
                          {caso.exam_type}
                        </span>
                      </div>

                      {/* Conteúdo e Informações */}
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          {/* Idade e Sexo */}
                          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <span>{caso.age} anos</span>
                            <span className="text-border/80">•</span>
                            <span>{caso.sex}</span>
                          </div>
                          
                          {/* Caso Clínico */}
                          <p className="text-sm text-foreground/85 font-medium leading-relaxed line-clamp-3 mt-2 group-hover:text-foreground transition-colors duration-200">
                            {caso.clinical_case}
                          </p>
                        </div>

                        {/* Botão de Rodapé */}
                        <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs text-primary font-semibold group-hover:underline decoration-primary/40 underline-offset-2">
                          <span>Estudar Caso</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </article>

      {/* Modal Avançado (Estilo Viewer Profissional) */}
      {activeCaseModal && (
        <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md flex items-center justify-center p-2 sm:p-6 overflow-hidden">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full h-full max-w-7xl max-h-[90vh] bg-card rounded-3xl border border-border shadow-2xl overflow-hidden relative flex flex-col md:flex-row"
          >
            <button onClick={() => setActiveCaseModal(null)} className="absolute top-4 right-4 md:right-auto md:left-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors z-[110] backdrop-blur-md shadow-sm">
              <X className="w-5 h-5" />
            </button>
            
            {/* Lado Esquerdo: Visualizador de Imagem */}
            <div className="w-full md:w-[60%] lg:w-[65%] bg-black relative flex flex-col items-center justify-center overflow-hidden h-[40vh] md:h-full group select-none">
              
              {/* Barra de Ferramentas da Imagem */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 sm:gap-2 bg-black/60 backdrop-blur-md px-3 sm:px-4 py-2 rounded-full z-20 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity border border-white/10 shadow-lg">
                <button onClick={() => setZoom(z => Math.max(1, z - 0.2))} className="text-white hover:text-primary transition-colors"><ZoomOut className="w-4 h-4" /></button>
                <span className="text-white text-[10px] sm:text-xs font-mono w-7 sm:w-8 text-center">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(z => Math.min(4, z + 0.2))} className="text-white hover:text-primary transition-colors"><ZoomIn className="w-4 h-4" /></button>
                <div className="w-px h-4 bg-white/20 mx-0 sm:mx-1" />
                
                <button onClick={() => setBrightness(b => Math.max(50, b - 10))} className="text-white hover:text-primary transition-colors"><Sun className="w-4 h-4" /></button>
                <span className="text-white text-[10px] sm:text-xs font-mono w-7 sm:w-8 text-center">{brightness}%</span>
                <button onClick={() => setBrightness(b => Math.min(200, b + 10))} className="text-white hover:text-primary transition-colors"><Sun className="w-4 h-4" /></button>
                <div className="w-px h-4 bg-white/20 mx-0 sm:mx-1" />

                <button onClick={() => setContrast(c => Math.max(50, c - 10))} className="text-white hover:text-primary transition-colors"><Contrast className="w-4 h-4" /></button>
                <span className="text-white text-[10px] sm:text-xs font-mono w-7 sm:w-8 text-center">{contrast}%</span>
                <button onClick={() => setContrast(c => Math.min(200, c + 10))} className="text-white hover:text-primary transition-colors"><Contrast className="w-4 h-4" /></button>
                <div className="w-px h-4 bg-white/20 mx-0 sm:mx-1" />
                
                <button onClick={() => { setZoom(1); setBrightness(100); setContrast(100); setPosition({x:0, y:0}); }} className="text-white hover:text-primary text-[10px] font-bold uppercase tracking-wider transition-colors">Reset</button>
              </div>

              {/* Imagem com suporte a Arrastar/Touch */}
              <div 
                className={`w-full h-full flex items-center justify-center ${zoom > 1 ? 'cursor-grab active:cursor-grabbing' : ''}`}
                onMouseDown={(e) => { if (zoom > 1) { setIsDragging(true); setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y }); } }}
                onMouseMove={(e) => { if (isDragging && zoom > 1) setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }); }}
                onMouseUp={() => setIsDragging(false)}
                onMouseLeave={() => setIsDragging(false)}
                onTouchStart={(e) => { if (zoom > 1) { setIsDragging(true); setDragStart({ x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y }); } }}
                onTouchMove={(e) => { if (isDragging && zoom > 1) setPosition({ x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y }); }}
                onTouchEnd={() => setIsDragging(false)}
              >
                {activeCaseModal.images?.[activeImageIndex] ? (
                  <img 
                    src={activeCaseModal.images[activeImageIndex]} 
                    alt="Visualização do Caso" 
                    className="max-w-full max-h-full object-contain transition-transform duration-75"
                    style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`, filter: `brightness(${brightness}%) contrast(${contrast}%)` }}
                    draggable={false}
                  />
                ) : (
                  <div className="text-white/50 uppercase font-bold tracking-widest text-xl">{activeCaseModal.exam_type}</div>
                )}
              </div>

              {/* Navegação de Múltiplas Imagens do Paciente */}
              {activeCaseModal.images?.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full z-20 border border-white/10 shadow-lg">
                  <button disabled={activeImageIndex === 0} onClick={() => { setActiveImageIndex(i => i - 1); setZoom(1); setPosition({x:0, y:0}); }} className="text-white disabled:opacity-30 hover:text-primary p-1 transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-white text-xs font-semibold px-2">{activeImageIndex + 1} / {activeCaseModal.images.length}</span>
                  <button disabled={activeImageIndex === activeCaseModal.images.length - 1} onClick={() => { setActiveImageIndex(i => i + 1); setZoom(1); setPosition({x:0, y:0}); }} className="text-white disabled:opacity-30 hover:text-primary p-1 transition-colors">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
            
            {/* Lado Direito: Informações e Diagnóstico do Caso */}
            <div className="w-full md:w-[40%] lg:w-[35%] bg-card flex flex-col h-[50vh] md:h-full relative border-l border-border/50">
              <div className="p-6 md:p-8 overflow-y-auto flex-1 custom-scrollbar">
                <div className="flex flex-wrap items-center gap-3 mb-6">
                <span className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold uppercase tracking-wider">
                    {activeCaseModal.exam_type}
                </span>
                  <span className="text-sm font-semibold text-muted-foreground bg-muted px-3 py-1 rounded-full border border-border">
                    {activeCaseModal.age} anos • {activeCaseModal.sex}
                </span>
              </div>
              
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">História Clínica</h3>
                <p className="text-foreground text-sm md:text-base leading-relaxed mb-8 whitespace-pre-wrap">{activeCaseModal.clinical_case}</p>
              
                <div className="mt-8 border-t border-border pt-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Diagnóstico</h3>
                    <button 
                      onClick={() => setShowDiagnosis(!showDiagnosis)}
                      className={`text-xs px-3 py-1.5 rounded-full font-bold flex items-center transition-all ${showDiagnosis ? 'bg-secondary text-secondary-foreground' : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'}`}
                    >
                      {showDiagnosis ? <EyeOff className="w-3.5 h-3.5 mr-1.5" /> : <Eye className="w-3.5 h-3.5 mr-1.5" />}
                      {showDiagnosis ? 'Ocultar' : 'Revelar'}
                    </button>
                  </div>
                  
                  {showDiagnosis ? (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-primary/10 text-primary rounded-xl border border-primary/20 font-bold text-base md:text-lg">
                      {activeCaseModal.diagnosis}
                    </motion.div>
                  ) : (
                    <div className="p-4 bg-muted/50 rounded-xl border border-border border-dashed flex items-center justify-center">
                      <p className="text-sm text-muted-foreground font-medium">Analise a imagem antes de revelar</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}