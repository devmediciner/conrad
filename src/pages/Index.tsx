import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/Navbar';
import { FiltersBar } from '@/components/FiltersBar';
import { CaseCard } from '@/components/CaseCard';
import { CaseModal } from '@/components/CaseModal';
import { useCases } from '@/hooks/useCases';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Activity, Instagram, Mail, FileText } from 'lucide-react';
import type { Case } from '@/types/case';
import type { Article } from '@/types/article';
import backImage from '@/assets/back.jpg';
import logo from '@/assets/logo.png';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { slugify, stripHtml } from '@/lib/utils';

const Index = () => {
  const [search, setSearch] = useState('');
  const [examType, setExamType] = useState('all');
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const navigate = useNavigate();

  const { data: cases, isLoading } = useCases({ search, examType });

  const [articles, setArticles] = useState<Article[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(false);

  useEffect(() => {
    const fetchArticles = async () => {
      setLoadingArticles(true);
      const { data } = await supabase.from('articles').select('*').eq('status', 'approved');
      if (data) setArticles(data);
      setLoadingArticles(false);
    };
    fetchArticles();
  }, []);

  const examLabels: Record<string, string> = {
    all: 'Todos',
    RX: 'Raio-X',
    TC: 'Tomografia',
    USG: 'Ultrassom',
    RM: 'Ressonância'
  };
  const examLabel = examLabels[examType] || examType;

  const filteredArticles = articles.filter(a => a.categoria?.toLowerCase() === examType.toLowerCase());

  return (
    
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center pt-28 pb-20 overflow-hidden">
        {/* Background elements */}
        <div className="absolute inset-0 z-0 bg-background">
          <img src={backImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-[0.05] sm:opacity-[0.1] mix-blend-luminosity pointer-events-none" />
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px] mix-blend-normal pointer-events-none" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/20 blur-[120px] mix-blend-normal pointer-events-none" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-transparent pointer-events-none" />
        </div>

        <div className="relative container mx-auto px-4 text-center z-10 flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="flex flex-col items-center mb-16"
          >
            

            <h1 className="flex flex-col items-center gap-3 text-5xl md:text-7xl font-extrabold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              <span className="text-2xl md:text-3xl font-medium text-muted-foreground tracking-normal uppercase">Bem-vindo à</span>
              <span className="flex items-center justify-center mt-2 text-7xl md:text-8xl lg:text-[9rem] text-foreground drop-shadow-sm">
                <span>C</span>
                <img src={logo} alt="O" className="w-[0.9em] h-[0.9em] object-contain mx-1 select-none pointer-events-none drop-shadow-lg" />
                <span>NRAD</span>
              </span>
            </h1>
            <p className="mt-0 text-[1.2rem] text-muted-foreground max-w-2xl text-center font-normal leading-relaxed">
              Liga Acadêmica de Radiologia e Diagnóstico por Imagem da UFSJ CCO. 
            </p>
          </motion.div>

          {/* Action Buttons / Modalities */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
            className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6 max-w-5xl mx-auto w-full"
          >
            {[
              { id: 'RX', title: 'RX', desc: 'Raio-X' },
              { id: 'TC', title: 'TC', desc: 'Tomografia' },
              { id: 'USG', title: 'USG', desc: 'Ultrassom' },
              { id: 'RM', title: 'RM', desc: 'Ressonância' },
            ].map((mod) => (
              <button
                key={mod.id}
                onClick={() => {
                  setExamType(mod.id);
                  document.getElementById('galeria')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="group relative flex flex-col items-center justify-center p-6 sm:p-8 rounded-3xl bg-card border border-border/60 shadow-sm hover:shadow-xl hover:border-primary/50 transition-all duration-500 hover:-translate-y-1 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <span className="relative z-10 text-4xl sm:text-5xl font-bold text-foreground group-hover:text-primary transition-colors duration-300">
                  {mod.title}
                </span>
                <span className="relative z-10 text-xs sm:text-sm text-muted-foreground mt-3 font-semibold uppercase tracking-widest group-hover:text-foreground transition-colors duration-300">
                  {mod.desc}
                </span>
              </button>
            ))}

            {/* ARTIGOS Button */}
            <button onClick={() => navigate('/artigos')} className="group relative flex flex-col items-center justify-center p-6 sm:p-8 rounded-3xl bg-card border border-border/60 shadow-sm hover:shadow-xl hover:border-primary/50 transition-all duration-500 hover:-translate-y-1 overflow-hidden col-span-2 md:col-span-1">
              <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <span className="relative z-10 text-3xl sm:text-4xl font-bold text-foreground group-hover:text-primary transition-colors duration-300">
                ARTIGOS
              </span>
              <span className="relative z-10 text-[10px] sm:text-xs text-muted-foreground mt-3 font-semibold uppercase tracking-widest text-center group-hover:text-foreground transition-colors duration-300">
                & Discussões
              </span>
            </button>
          </motion.div>
          
          {/* Jogar Quiz Action */}
          <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.8 }}
             className="mt-16 flex justify-center w-full"
          >
            <Button 
                size="lg" 
                className="h-14 px-8 rounded-full bg-primary text-primary-foreground hover:scale-105 transition-all duration-300 font-semibold text-base gap-3 shadow-[0_0_30px_-5px_hsl(var(--primary))] hover:shadow-[0_0_40px_-5px_hsl(var(--primary))]" 
                onClick={() => navigate('/game')}
              >
                <Activity className="w-5 h-5" /> 
                Desafie-se no Quiz Radiológico
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Filters */}
      <section id="galeria" className="px-4 pb-8 scroll-mt-24">
        <FiltersBar
          search={search}
          onSearchChange={setSearch}
          examType={examType}
          onExamTypeChange={setExamType}
        />
      </section>

      {/* Grid */}
      <section className="px-4 pb-20">
        <div className="container mx-auto">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-xl overflow-hidden">
                  <Skeleton className="aspect-square w-full" />
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : examType === 'all' ? (
            cases && cases.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {cases.map((c, i) => (
                  <CaseCard
                    key={c.id}
                    caseData={c}
                    index={i}
                    onClick={() => setSelectedCase(c)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <p className="text-muted-foreground">Nenhum caso encontrado.</p>
              </div>
            )
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
              {/* Coluna da Esquerda: Artigos */}
              <div className="lg:col-span-6 space-y-6">
                <div className="flex items-center justify-between border-b border-border/80 pb-4 mb-2">
                  <h3 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Artigos ({examLabel})
                  </h3>
                  <Link to={`/artigos`} className="text-xs font-semibold text-primary hover:underline">
                    Ver todos
                  </Link>
                </div>
                {loadingArticles ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-28 w-full rounded-3xl" />
                    ))}
                  </div>
                ) : filteredArticles.length > 0 ? (
                  <div className="space-y-4">
                    {filteredArticles.map(artigo => (
                      <Link 
                        key={artigo.id} 
                        to={`/artigo/${slugify(artigo.titulo)}`}
                        className="group flex gap-5 p-5 bg-card hover:bg-muted/30 rounded-3xl border border-border/40 hover:border-primary/30 transition-all duration-300 shadow-sm"
                      >
                        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-muted flex-shrink-0 border border-border/50 relative">
                          {artigo.imagem_capa ? (
                            <img src={artigo.imagem_capa} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs uppercase font-bold text-muted-foreground bg-secondary">{artigo.categoria}</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                          <div>
                            <h4 className="text-base sm:text-lg font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-snug mb-2">
                              {artigo.titulo}
                            </h4>
                            <p className="text-xs sm:text-sm text-muted-foreground/80 line-clamp-2 leading-relaxed mb-3">
                              {stripHtml(artigo.conteudo).substring(0, 110)}...
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground font-medium">
                            Por {artigo.autor?.split(' | ')[0]} • {new Date(artigo.data_publicacao).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-card rounded-2xl border border-dashed border-border/80">
                    <p className="text-sm text-muted-foreground">Nenhum artigo publicado nesta modalidade.</p>
                  </div>
                )}
              </div>

              {/* Coluna da Direita: Casos */}
              <div className="lg:col-span-6 space-y-6">
                <div className="border-b border-border/80 pb-4 mb-2">
                  <h3 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    Casos ({examLabel})
                  </h3>
                </div>
                {cases && cases.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {cases.map((c, i) => (
                      <CaseCard
                        key={c.id}
                        caseData={c}
                        index={i}
                        onClick={() => setSelectedCase(c)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-border/80">
                    <p className="text-muted-foreground">Nenhum caso encontrado nesta modalidade.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Contact section */}
      <section id="contato" className="px-4 py-24 border-t border-border bg-muted/20">
        <div className="container mx-auto max-w-3xl text-center space-y-8">
          <h2 className="font-heading text-3xl font-bold text-foreground">Acompanhe a CONRAD</h2>
          <p className="text-muted-foreground text-lg">
            Fique por dentro das nossas discussões de casos, aulas e eventos acadêmicos.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <a href="https://www.instagram.com/conradufsj/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-6 py-3 rounded-full bg-card border border-border hover:border-primary/50 hover:shadow-md transition-all">
              <Instagram className="w-5 h-5 text-pink-500" />
              <span className="font-medium text-foreground">@conradufsj</span>
            </a>
            <a href="mailto:conradufsj@gmail.com" className="flex items-center gap-3 px-6 py-3 rounded-full bg-card border border-border hover:border-primary/50 hover:shadow-md transition-all">
              <Mail className="w-5 h-5 text-blue-500" />
              <span className="font-medium text-foreground">conradufsj@gmail.com</span>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-4 py-10 bg-gradient-to-t from-primary/5 to-transparent">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img src={logo} alt="CONRAD" className="w-8 h-8 rounded-lg opacity-60" />
              <span className="text-sm text-muted-foreground">Feito com ❤️ pela <span className="text-foreground font-semibold">CONRAD</span></span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link to="/sobre" className="hover:text-foreground transition-colors">Sobre</Link>
              <Link to="/game" className="hover:text-foreground transition-colors">Quiz</Link>
              <Link to="/artigos" className="hover:text-foreground transition-colors">Artigos</Link>
              <Link to="/privacidade" className="hover:text-foreground transition-colors">Privacidade</Link>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-border/50 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} Liga Acadêmica de Radiologia — UFSJ CCO
          </div>
        </div>
      </footer>

      {/* Modals */}
      <CaseModal
        caseData={selectedCase}
        open={!!selectedCase}
        onOpenChange={(o) => !o && setSelectedCase(null)}
      />
    </div>
    
  );
};

export default Index;
