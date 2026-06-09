import { useState, useEffect } from 'react';
import type { Article } from '@/types/article';
import type { Case } from '@/types/case';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, User, Loader2, FileText, ArrowRight, X, ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { supabase } from '@/integrations/supabase/client';
import { slugify, stripHtml } from '@/lib/utils';
import { FormattedText } from '@/components/ui/FormattedText';
import { CaseModal } from '@/components/CaseModal';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import 'react-quill/dist/quill.snow.css';

export default function LerArtigo() {
  const { slug } = useParams();
  const [artigo, setArtigo] = useState<Article | null>(null);
  const [casosRelacionados, setCasosRelacionados] = useState<Case[]>([]);
  const [activeCaseModal, setActiveCaseModal] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'IMG') {
      const src = target.getAttribute('src');
      if (src) {
        setSelectedImageUrl(src);
      }
    }
  };

  useEffect(() => {
    const fetchArtigo = async () => {
      setLoading(true);
      let data: Article | null = null;

      // 1. Tenta carregar por ID caso o parâmetro seja um UUID (Retrocompatibilidade)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug || '');
      if (isUUID) {
        const { data: byId } = await supabase
          .from('articles')
          .select('*')
          .eq('id', slug)
          .single();
        if (byId) {
          data = byId;
        }
      }

      // 2. Se não for UUID ou não foi encontrado por ID, busca por slug do título
      if (!data && slug) {
        const { data: allArticles } = await supabase
          .from('articles')
          .select('*');
        
        if (allArticles) {
          data = allArticles.find(a => slugify(a.titulo) === slug) || null;
        }
      }

      if (data) {
        setArtigo(data);
        
        // Se o artigo tiver casos vinculados, busque todos eles da base de dados
        if (data.related_cases_ids && data.related_cases_ids.length > 0) {
          const { data: casosData } = await supabase
            .from('cases')
            .select('*')
            .in('id', data.related_cases_ids);
          if (casosData) setCasosRelacionados(casosData);
        }
      } else {
        setArtigo(null);
      }
      setLoading(false);
    };

    if (slug) fetchArtigo();
  }, [slug]);

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
                    {artigo.autor?.split(' | ')[0]?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span className="text-foreground font-semibold text-base">{artigo.autor?.split(' | ')[0] || 'Usuário Desconhecido'}</span>
                </div>
                <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full border border-border/50">
                  <Calendar className="w-4 h-4" /> 
                  {new Date(artigo.data_publicacao).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </div>
              </div>
            </div>

            {/* Imagem de Capa */}
            {artigo.imagem_capa && (
              <div className="w-full h-[350px] md:h-[480px] rounded-3xl overflow-hidden mb-16 border border-border/50 shadow-2xl relative bg-black/30 flex items-center justify-center">
                {/* Background blurred image to fill space beautifully without cropping the main content */}
                <img src={artigo.imagem_capa} alt="" className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-45 scale-105 pointer-events-none" />
                {/* Foreground image preserving its aspect ratio */}
                <img src={artigo.imagem_capa} alt={artigo.titulo} className="relative z-10 max-w-full max-h-full object-contain" />
                <div className="absolute inset-0 bg-gradient-to-t from-background/10 to-transparent pointer-events-none z-10"></div>
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
                onClick={handleContentClick}
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
                            {stripHtml(caso.clinical_case)}
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

      <CaseModal
        caseData={activeCaseModal}
        open={!!activeCaseModal}
        onOpenChange={(o) => !o && setActiveCaseModal(null)}
      />

      {/* Lightbox para Imagens do Corpo do Artigo */}
      <Dialog open={!!selectedImageUrl} onOpenChange={(o) => !o && setSelectedImageUrl(null)}>
        <DialogContent className="max-w-5xl bg-black/95 border-none p-0 overflow-hidden flex items-center justify-center max-h-[95vh] rounded-3xl">
          {selectedImageUrl && (
            <div className="relative w-full h-full flex items-center justify-center p-2">
              <img 
                src={selectedImageUrl} 
                alt="Imagem ampliada" 
                className="max-w-full max-h-[85vh] object-contain rounded-2xl select-none" 
              />
              <button 
                onClick={() => setSelectedImageUrl(null)} 
                className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors z-[110] backdrop-blur-md shadow-sm border border-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}