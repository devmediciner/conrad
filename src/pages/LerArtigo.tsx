import { useState, useEffect } from 'react';
import type { Article } from '@/types/article';
import type { Case } from '@/types/case';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, Loader2, FileText, ArrowRight, X, List, Sun, Moon, Share2 } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { Navbar } from '@/components/Navbar';
import { supabase } from '@/integrations/supabase/client';
import { slugify, stripHtml, formatDisplayDate } from '@/lib/utils';
import { CaseModal } from '@/components/CaseModal';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import 'react-quill/dist/quill.snow.css';

interface TocItem {
  id: string;
  text: string;
}

export default function LerArtigo() {
  const { slug } = useParams();
  const [artigo, setArtigo] = useState<Article | null>(null);
  const [casosRelacionados, setCasosRelacionados] = useState<Case[]>([]);
  const [activeCaseModal, setActiveCaseModal] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [processedContent, setProcessedContent] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'IMG') {
      const src = target.getAttribute('src');
      if (src) {
        setSelectedImageUrl(src);
      }
    }
  };

  const handleShare = async () => {
    if (!artigo) return;
    const shareUrl = window.location.href;
    const shareTitle = `${artigo.titulo} - CONRAD`;
    const cleanContent = stripHtml(artigo.conteudo);
    const shareText = `Confira este artigo na Liga Acadêmica de Radiologia CONRAD:\n\n"${artigo.titulo}"\n\n${cleanContent.substring(0, 120)}...`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        toast.success('Artigo compartilhado com sucesso!');
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
        toast.success('Link do artigo copiado para a área de transferência! 📋');
      })
      .catch(() => {
        toast.error('Erro ao copiar o link.');
      });
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

  useEffect(() => {
    if (artigo && artigo.conteudo) {
      // Remove old height restrictions that were stored in some articles
      const cleaned = artigo.conteudo
        .replace(/max-height:\s*280px;?/gi, '')
        .replace(/max-h-\[280px\]/gi, '');

      const parser = new DOMParser();
      const doc = parser.parseFromString(cleaned, 'text/html');

      // Assign heading IDs for Table of Contents
      const h2Elements = doc.querySelectorAll('h2');
      const items: TocItem[] = [];
      h2Elements.forEach((h2, index) => {
        const id = `heading-h2-${index}`;
        h2.setAttribute('id', id);
        items.push({ id, text: h2.textContent?.replace(/:/g, '').trim() || '' });
      });

      setToc(items);
      setProcessedContent(doc.body.innerHTML);
    } else {
      setToc([]);
      setProcessedContent('');
    }
  }, [artigo]);

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
        <Helmet>
          <title>Artigo não encontrado | CONRAD</title>
        </Helmet>
        <h1 className="text-3xl font-bold text-foreground">Artigo não encontrado</h1>
        <Link to="/" className="text-primary hover:underline">Voltar para a Página Inicial</Link>
      </div>
    );
  }

  const artigoResumo = stripHtml(artigo.conteudo).substring(0, 160) + '...';

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <Helmet>
        <title>{artigo.titulo} | CONRAD</title>
        <meta name="description" content={artigoResumo} />
        <meta property="og:title" content={`${artigo.titulo} | CONRAD`} />
        <meta property="og:description" content={artigoResumo} />
        {artigo.imagem_capa && <meta property="og:image" content={artigo.imagem_capa} />}
        <meta name="twitter:title" content={`${artigo.titulo} | CONRAD`} />
        <meta name="twitter:description" content={artigoResumo} />
        {artigo.imagem_capa && <meta name="twitter:image" content={artigo.imagem_capa} />}
      </Helmet>
      <Navbar />

      <article className="pt-24 md:pt-28 pb-20 px-2 sm:px-4 md:px-6">
        {/* Container do Cabeçalho e Capa - Mais largo e imersivo */}
        <div className="w-full max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
              <Link to="/artigos" className="inline-flex items-center gap-2 text-sm text-primary font-semibold hover:underline transition-colors">
                <ArrowLeft className="w-4 h-4" /> Voltar para Artigos
              </Link>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleTheme}
                  className={`rounded-full font-bold px-4 sm:px-5 h-9 text-xs transition-all duration-300 flex items-center gap-2 shadow-sm ${
                    theme === 'dark' 
                      ? 'bg-card/80 text-foreground border-border hover:bg-primary/20 hover:text-primary hover:border-primary' 
                      : 'bg-white text-slate-800 border-slate-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 shadow-[0_2px_10px_rgba(0,0,0,0.04)]'
                  }`}
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
                  <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                  className="rounded-full font-bold px-4 sm:px-5 h-9 text-xs border-border hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300 flex items-center gap-2 shadow-sm"
                >
                  <Share2 className="w-4 h-4" /> <span className="hidden sm:inline">Compartilhar Artigo</span><span className="sm:hidden">Compartilhar</span>
                </Button>
              </div>
            </div>

            {/* Cabeçalho do Artigo */}
            <div className="mb-10 text-center space-y-6">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground tracking-tight leading-[1.18]">
                {artigo.titulo}
              </h1>
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-muted-foreground font-medium pt-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shadow-sm">
                    {artigo.autor?.split(' | ')[0]?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span className="text-foreground font-semibold text-sm sm:text-base">{artigo.autor?.split(' | ')[0] || 'Usuário Desconhecido'}</span>
                </div>
                <div className="flex items-center gap-2 bg-muted/60 px-3.5 py-1.5 rounded-full border border-border/60 text-xs sm:text-sm">
                  <Calendar className="w-3.5 h-3.5 text-primary" /> 
                  {formatDisplayDate(artigo.data_publicacao, { day: '2-digit', month: 'long', year: 'numeric' })}
                </div>
              </div>
            </div>

            {/* Imagem de Capa */}
            {artigo.imagem_capa && (
              <div className="w-full h-[280px] sm:h-[380px] md:h-[480px] rounded-2xl sm:rounded-3xl overflow-hidden mb-12 sm:mb-16 border border-border/50 shadow-2xl relative bg-black/30 flex items-center justify-center">
                {/* Background blurred image to fill space beautifully without cropping the main content */}
                <img src={artigo.imagem_capa} alt="" className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-45 scale-105 pointer-events-none" />
                {/* Foreground image preserving its aspect ratio */}
                <img src={artigo.imagem_capa} alt={artigo.titulo} className="relative z-10 max-w-full max-h-full object-contain" />
                <div className="absolute inset-0 bg-gradient-to-t from-background/10 to-transparent pointer-events-none z-10"></div>
              </div>
            )}
          </motion.div>
        </div>

        {/* Container do Texto - Mais largo no PC e largura total no Celular */}
        <div className="w-full max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }}>
            <div className="w-full bg-card/60 [data-theme=light]:bg-white [data-theme=light]:shadow-[0_10px_40px_rgba(0,0,0,0.05)] [data-theme=light]:border-slate-200/90 border border-border/50 rounded-2xl sm:rounded-3xl p-3.5 sm:p-8 md:p-12 lg:p-14 transition-colors duration-300">
            {toc.length > 0 && (
              <div className="mb-10 p-5 sm:p-6 bg-muted/40 [data-theme=light]:bg-slate-50 [data-theme=light]:border-slate-200 border border-border/80 rounded-2xl sm:rounded-3xl shadow-sm backdrop-blur-sm">
                <h3 className="font-heading text-xs sm:text-sm font-bold text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
                  <List className="w-4 h-4 text-primary" /> Sumário do Artigo
                </h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
                  {toc.map((item) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          const el = document.getElementById(item.id);
                          if (el) {
                            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            window.history.pushState(null, '', `#${item.id}`);
                          }
                        }}
                        className="text-xs sm:text-sm text-muted-foreground [data-theme=light]:text-slate-700 hover:text-primary transition-colors hover:underline flex items-start gap-2 leading-relaxed"
                      >
                        <span className="text-primary font-bold font-mono">→</span>
                        <span>{item.text}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Conteúdo Renderizado - Fluido, intuitivo e com imagens sem corte de altura */}
            <div className="ql-snow">
               <div 
                onClick={handleContentClick}
                className="ql-editor !p-0 w-full max-w-none text-foreground/90 [data-theme=light]:text-slate-800 text-base md:text-[18px] lg:text-[19px] !leading-[1.85] tracking-[-0.01em] whitespace-pre-wrap break-words 
                  [&_h1]:!text-3xl md:[&_h1]:!text-4xl lg:[&_h1]:!text-5xl [&_h1]:!font-extrabold [&_h1]:!tracking-tight [&_h1]:!mt-14 [&_h1]:!mb-6 [&_h1]:!text-foreground [data-theme=light]:[&_h1]:!text-slate-900 [&_h1]:!leading-tight
                  [&_h2]:!text-2xl md:[&_h2]:!text-3xl lg:[&_h2]:!text-4xl [&_h2]:!font-bold [&_h2]:!tracking-tight [&_h2]:!mt-12 [&_h2]:!mb-4 [&_h2]:!text-foreground [data-theme=light]:[&_h2]:!text-slate-900 [&_h2]:!border-b [&_h2]:!border-border/50 [data-theme=light]:[&_h2]:!border-slate-200 [&_h2]:!pb-2.5 [&_h2]:scroll-mt-24
                  [&_h3]:!text-xl md:[&_h3]:!text-2xl lg:[&_h3]:!text-3xl [&_h3]:!font-semibold [&_h3]:!tracking-tight [&_h3]:!mt-8 [&_h3]:!mb-3.5 [&_h3]:!text-foreground [data-theme=light]:[&_h3]:!text-slate-900
                  [&_p]:!mb-6 [&_p]:text-foreground/85 [data-theme=light]:[&_p]:text-slate-700
                  [&_strong]:!font-bold [&_strong]:!text-foreground [data-theme=light]:[&_strong]:!text-slate-900
                  [&_a]:!text-primary [&_a]:!font-semibold [&_a]:!underline [&_a]:!underline-offset-4 [&_a]:!decoration-primary/30 hover:[&_a]:!decoration-primary [&_a]:transition-colors
                  [&_ul]:!list-disc [&_ul_li]:!list-disc [&_ul]:!pl-6 [&_ul]:!mb-6 [&_ul]:!space-y-2 [&_li]:!pl-1 [&_li]:marker:!text-primary [&_li::before]:!content-none [&_li]:!list-item [&_li_p]:!m-0
                  [&_ol]:!list-decimal [&_ol_li]:!list-decimal [&_ol]:!pl-6 [&_ol]:!mb-6 [&_ol]:!space-y-2 [&_li]:!pl-1 [&_li]:marker:!text-primary [&_li]:marker:!font-bold [&_li::before]:!content-none [&_li]:!list-item [&_li_p]:!m-0
                  [&_blockquote]:!border-l-4 [&_blockquote]:!border-primary [&_blockquote]:!pl-6 [&_blockquote]:!py-3 [&_blockquote]:!my-8 [&_blockquote]:!italic [&_blockquote]:!text-foreground/80 [data-theme=light]:[&_blockquote]:!text-slate-800 [&_blockquote]:!bg-muted/40 [data-theme=light]:[&_blockquote]:!bg-amber-500/[0.07] [&_blockquote]:!rounded-r-2xl
                  [&_iframe]:!w-full [&_iframe]:!aspect-video [&_iframe]:!rounded-2xl [&_iframe]:!shadow-xl [&_iframe]:!my-10 [&_iframe]:!border-0
                  [&_img]:!max-h-none [&_img]:!h-auto [&_img]:!object-contain [&_img]:rounded-2xl"
                dangerouslySetInnerHTML={{ __html: processedContent }} 
              />
            </div>

            {/* Listagem Dinâmica de Casos Relacionados */}
            {casosRelacionados.length > 0 && (
              <div className="mt-16 space-y-6">
                <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2 border-b border-border/50 [data-theme=light]:border-slate-200 pb-4">
                  <FileText className="w-5 h-5 text-primary" /> Estude {casosRelacionados.length > 1 ? 'estes Casos Práticos' : 'este Caso Prático'}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {casosRelacionados.map((caso) => (
                    <div 
                      key={caso.id} 
                      onClick={() => setActiveCaseModal(caso)} 
                      className="group flex flex-col p-4 bg-muted/20 [data-theme=light]:bg-slate-50 hover:bg-muted/45 [data-theme=light]:hover:bg-slate-100 rounded-3xl border border-border [data-theme=light]:border-slate-200 hover:border-primary/45 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer text-left"
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
                        <div className="mt-4 pt-3 border-t border-border/40 [data-theme=light]:border-slate-200 flex items-center justify-between text-xs text-primary font-semibold group-hover:underline decoration-primary/40 underline-offset-2">
                          <span>Estudar Caso</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            </div>
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
        <DialogContent className="max-w-5xl bg-background border border-border p-0 overflow-hidden flex items-center justify-center max-h-[95vh] rounded-3xl">
          {selectedImageUrl && (
            <div className="relative w-full h-full flex items-center justify-center p-2">
              <img 
                src={selectedImageUrl} 
                alt="Imagem ampliada" 
                className="max-w-full max-h-[85vh] object-contain rounded-2xl select-none" 
              />
              <button 
                onClick={() => setSelectedImageUrl(null)} 
                className="absolute top-4 right-4 p-2 bg-muted/80 hover:bg-muted text-foreground rounded-full transition-colors z-[110] backdrop-blur-md shadow-sm border border-border"
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