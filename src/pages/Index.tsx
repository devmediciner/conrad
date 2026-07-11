import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/Navbar';
import { FiltersBar } from '@/components/FiltersBar';
import { CaseCard } from '@/components/CaseCard';
import { CaseModal } from '@/components/CaseModal';
import { useCases } from '@/hooks/useCases';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Activity, Instagram, Mail, FileText, Folder, FolderOpen, ChevronRight, ArrowLeft, Trophy, Sparkles, Eye, BookOpen, HelpCircle, CheckCircle2, XCircle, Heart, MessageCircle, ExternalLink, RefreshCw } from 'lucide-react';
import type { Case } from '@/types/case';
import type { Article } from '@/types/article';
import backImage from '@/assets/back.jpg';
import logo from '@/assets/logo.png';
import rxImage from '@/assets/rx.png';
import tcImage from '@/assets/tc.png';
import usgImage from '@/assets/usg.png';
import rmImage from '@/assets/rm.png';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { slugify, stripHtml, formatDisplayDate } from '@/lib/utils';
import { classifyArticle, getMetadataFromContent, SYSTEM_LABELS, SYSTEM_COLORS, SystemType } from '@/utils/articleClassifier';
import { EXAM_TYPE_COLORS } from '@/types/case';

const Index = () => {
  const [search, setSearch] = useState('');
  const [examType, setExamType] = useState('all');
  const [selectedModality, setSelectedModality] = useState<string | null>(null);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [showDiagnosis, setShowDiagnosis] = useState(true);
  const [revealedClues, setRevealedClues] = useState<boolean[]>([false, false, false]);
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [selectedTipIndex, setSelectedTipIndex] = useState<number | null>(null);
  const navigate = useNavigate();

  const { data: cases, isLoading } = useCases({ search, examType });

  const caseDaSemana = cases?.find(c => c.is_case_of_the_week) || (cases && cases.length > 0 ? cases[0] : null);

  const [articles, setArticles] = useState<Article[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(false);
  
  const [activeClassification, setActiveClassification] = useState<'anatomia' | 'patologia' | 'geral'>('geral');
  const [selectedSystemFolder, setSelectedSystemFolder] = useState<SystemType | null>(null);

  // Reset selected folder when modal/exam type changes
  useEffect(() => {
    setSelectedSystemFolder(null);
  }, [examType]);

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

  const filteredArticles = articles.filter(a => a.categoria?.toLowerCase() === (selectedModality || '').toLowerCase());

  // Classify and group articles
  const classifiedArticles = filteredArticles.map(artigo => {
    const metadata = getMetadataFromContent(artigo.conteudo || '');
    const fallback = classifyArticle(artigo.titulo || '', artigo.conteudo || '');
    return {
      ...artigo,
      _type: metadata.type || fallback.type,
      _system: metadata.system || fallback.system
    };
  });

  const anatomyArticles = classifiedArticles.filter(a => a._type === 'anatomia');
  const pathologyArticles = classifiedArticles.filter(a => a._type === 'patologia');
  const generalArticles = classifiedArticles.filter(a => a._type === 'geral');

  const currentClassificationArticles = 
    activeClassification === 'anatomia' 
      ? anatomyArticles 
      : activeClassification === 'patologia' 
      ? pathologyArticles 
      : generalArticles;

  // Group by system
  const systemGroups: Record<SystemType, typeof currentClassificationArticles> = {
    cardiaco: [],
    pulmonar: [],
    neuro: [],
    abdominal: [],
    musculoesqueletico: [],
    urogenital: [],
    outro: []
  };

  currentClassificationArticles.forEach(a => {
    if (systemGroups[a._system]) {
      systemGroups[a._system].push(a);
    } else {
      systemGroups.outro.push(a);
    }
  });

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
              { id: 'RX', title: 'RX', desc: 'Raio-X', img: rxImage },
              { id: 'TC', title: 'TC', desc: 'Tomografia', img: tcImage },
              { id: 'USG', title: 'USG', desc: 'Ultrassom', img: usgImage },
              { id: 'RM', title: 'RM', desc: 'Ressonância', img: rmImage },
            ].map((mod) => (
              <button
                key={mod.id}
                onClick={() => {
                  setSelectedModality(mod.id);
                  setTimeout(() => {
                    document.getElementById('artigos-modality')?.scrollIntoView({ behavior: 'smooth' });
                  }, 50);
                }}
                className="group relative flex flex-col items-center justify-center p-6 sm:p-8 rounded-3xl bg-card border border-border/60 shadow-sm hover:shadow-xl hover:border-primary/50 transition-all duration-500 hover:-translate-y-1 overflow-hidden"
              >
                {/* Imagem de fundo no hover */}
                <div 
                  className="absolute inset-0 bg-cover bg-center opacity-0 group-hover:opacity-25 scale-100 group-hover:scale-110 transition-all duration-700 ease-out pointer-events-none"
                  style={{ backgroundImage: `url(${mod.img})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <span className="relative z-10 text-4xl sm:text-5xl font-bold text-foreground group-hover:text-primary transition-colors duration-300">
                  {mod.title}
                </span>
                <span className="relative z-10 text-xs sm:text-sm text-muted-foreground mt-3 font-semibold uppercase tracking-widest group-hover:text-foreground transition-colors duration-300">
                  {mod.desc}
                </span>
              </button>
            ))}

            {/* CASOS Button */}
            <button 
              onClick={() => {
                setSelectedModality(null);
                setExamType('all');
                setTimeout(() => {
                  document.getElementById('galeria')?.scrollIntoView({ behavior: 'smooth' });
                }, 50);
              }}
              className="group relative flex flex-col items-center justify-center p-6 sm:p-8 rounded-3xl bg-card border border-border/60 shadow-sm hover:shadow-xl hover:border-primary/50 transition-all duration-500 hover:-translate-y-1 overflow-hidden col-span-2 md:col-span-1"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <span className="relative z-10 text-3xl sm:text-4xl font-bold text-foreground group-hover:text-primary transition-colors duration-300">
                CASOS
              </span>
              <span className="relative z-10 text-[10px] sm:text-xs text-muted-foreground mt-3 font-semibold uppercase tracking-widest text-center group-hover:text-foreground transition-colors duration-300">
                e Discussões
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

      {/* Grid */}
      <section className="px-4 pb-20">
        <div className="container mx-auto">
          {selectedModality ? (
            // Modality Articles Section (separated by anatomy/pathology)
            <div id="artigos-modality" className="space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto scroll-mt-24">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-6">
                <div>
                  <h3 className="font-heading font-extrabold text-2xl md:text-3xl text-foreground flex items-center gap-2">
                    <FileText className="w-6 h-6 text-primary" />
                    Artigos de {examLabels[selectedModality]} ({selectedModality})
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Explore os artigos científicos e materiais educativos de {examLabels[selectedModality]} separados por anatomia, patologia e geral.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setSelectedModality(null)}
                  className="rounded-full font-bold px-4 text-xs h-9 gap-1.5 hover:bg-secondary transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao Início
                </Button>
              </div>

              {loadingArticles ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-28 w-full rounded-3xl" />
                  ))}
                </div>
              ) : filteredArticles.length > 0 ? (
                <div className="space-y-4">
                  {/* Classificações Tabs */}
                  <div className="flex bg-muted p-1 rounded-2xl w-full mb-6">
                    <button
                      onClick={() => {
                        setActiveClassification('geral');
                        setSelectedSystemFolder(null);
                      }}
                      className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                        activeClassification === 'geral'
                          ? 'bg-card text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Geral ({generalArticles.length})
                    </button>
                    <button
                      onClick={() => {
                        setActiveClassification('anatomia');
                        setSelectedSystemFolder(null);
                      }}
                      className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                        activeClassification === 'anatomia'
                          ? 'bg-card text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Anatomia ({anatomyArticles.length})
                    </button>
                    <button
                      onClick={() => {
                        setActiveClassification('patologia');
                        setSelectedSystemFolder(null);
                      }}
                      className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                        activeClassification === 'patologia'
                          ? 'bg-card text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Patologia ({pathologyArticles.length})
                    </button>
                  </div>

                  {selectedSystemFolder === null ? (
                    currentClassificationArticles.length === 0 ? (
                      <div className="text-center py-12 bg-card rounded-2xl border border-dashed border-border/80">
                        <p className="text-sm text-muted-foreground">
                          {activeClassification === 'geral'
                            ? 'Nenhum artigo geral nesta modalidade.'
                            : `Nenhum artigo de ${activeClassification} nesta modalidade.`}
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-300">
                        {Object.entries(SYSTEM_LABELS).map(([key, label]) => {
                          const sysKey = key as SystemType;
                          const count = systemGroups[sysKey].length;
                          const colorClass = SYSTEM_COLORS[sysKey];
                          return (
                            <button
                              key={sysKey}
                              onClick={() => {
                                if (count > 0) {
                                  setSelectedSystemFolder(sysKey);
                                }
                              }}
                              disabled={count === 0}
                              className={`group relative flex items-center justify-between p-4 rounded-2xl bg-card border border-border/60 shadow-sm transition-all duration-300 ${
                                count > 0
                                  ? 'hover:shadow-md hover:border-primary/45 cursor-pointer hover:bg-muted/10'
                                  : 'opacity-50 cursor-not-allowed'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-xl border ${colorClass} transition-colors group-hover:scale-105 duration-300`}>
                                  <Folder className="w-5 h-5 fill-current opacity-70" />
                                </div>
                                <div className="text-left">
                                  <span className="text-sm font-bold text-foreground block group-hover:text-primary transition-colors">
                                    {label}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground">
                                    {count === 1 ? '1 artigo' : `${count} artigos`}
                                  </span>
                                </div>
                              </div>
                              {count > 0 && (
                                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )
                  ) : (
                    <div className="space-y-4 animate-in fade-in duration-300">
                      <div className="flex items-center gap-2 mb-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedSystemFolder(null)}
                          className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground pl-1.5"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          Voltar para pastas
                        </Button>
                        <span className="text-xs text-muted-foreground">/</span>
                        <span className="text-xs font-semibold text-foreground uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-full">
                          {SYSTEM_LABELS[selectedSystemFolder]}
                        </span>
                      </div>
                      
                      {systemGroups[selectedSystemFolder].map((artigo) => (
                        <Link
                          key={artigo.id}
                          to={`/artigo/${slugify(artigo.titulo)}`}
                          className="group flex gap-5 p-5 bg-card hover:bg-muted/30 rounded-3xl border border-border/40 hover:border-primary/30 transition-all duration-300 shadow-sm animate-in fade-in-50 duration-200"
                        >
                          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-muted flex-shrink-0 border border-border/50 relative">
                            {artigo.imagem_capa ? (
                              <img
                                src={artigo.imagem_capa}
                                alt=""
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs uppercase font-bold text-muted-foreground bg-secondary">
                                {artigo.categoria}
                              </div>
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
                              Por {artigo.autor?.split(' | ')[0]} • {formatDisplayDate(artigo.data_publicacao)}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 bg-card rounded-2xl border border-dashed border-border/80">
                  <p className="text-sm text-muted-foreground">Nenhum artigo publicado nesta modalidade.</p>
                </div>
              )}
            </div>
          ) : (
            // Home / Search Area
            <div className="space-y-12">
              {/* Conditionally show Spotlights if search is empty (using CSS display hidden to preserve focus and layout DOM nodes) */}
              <div className={`space-y-16 animate-in fade-in duration-700 ${search ? 'hidden' : ''}`}>
                {/* Seção 1: Destaques (Caso da Semana ao lado de Últimos Artigos) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  {/* Coluna Esquerda: Caso da Semana */}
                  <div className="lg:col-span-8 space-y-4">
                    <h3 className="font-heading font-extrabold text-xl text-foreground flex items-center gap-2 mb-2">
                      <Trophy className="w-5 h-5 text-primary" /> Caso da Semana
                    </h3>
                    {isLoading ? (
                      <div className="relative overflow-hidden rounded-3xl border border-border bg-card/40 p-6 md:p-8 min-h-[460px] h-full animate-pulse flex flex-col justify-between backdrop-blur-md">
                        <div className="space-y-6">
                          <div className="flex gap-2">
                            <Skeleton className="h-4 w-12 rounded-full" />
                            <Skeleton className="h-4 w-24 rounded-full" />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                            <div className="md:col-span-6 space-y-4">
                              <Skeleton className="h-8 w-1/3" />
                              <div className="space-y-2 border-l-2 border-primary/20 pl-4 py-1.5">
                                <Skeleton className="h-3 w-full" />
                                <Skeleton className="h-3 w-full" />
                                <Skeleton className="h-3 w-5/6" />
                              </div>
                            </div>
                            <div className="md:col-span-6 flex justify-center md:justify-end">
                              <Skeleton className="aspect-square w-full max-w-[260px] rounded-3xl" />
                            </div>
                          </div>
                        </div>
                        <div className="pt-6 border-t border-border/40 mt-6 flex justify-between items-center">
                          <Skeleton className="h-3.5 w-32" />
                          <Skeleton className="h-9 w-44 rounded-full" />
                        </div>
                      </div>
                    ) : caseDaSemana ? (
                      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card/40 p-6 md:p-8 shadow-sm flex flex-col justify-between min-h-[460px] h-full group/card hover:border-primary/30 transition-all duration-300 backdrop-blur-md">
                        <div className="space-y-6">
                          {/* Header Row */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border shadow-sm ${
                              caseDaSemana.exam_type === 'RX' ? 'bg-blue-500/10 border-blue-500/25 text-blue-400' :
                              caseDaSemana.exam_type === 'TC' ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' :
                              caseDaSemana.exam_type === 'RM' ? 'bg-purple-500/10 border-purple-500/25 text-purple-400' :
                              'bg-amber-500/10 border-amber-500/25 text-amber-400'
                            }`}>
                              {caseDaSemana.exam_type}
                            </span>
                            {caseDaSemana.sex && (
                              <span className="text-[9px] px-2.5 py-0.5 rounded-full bg-secondary/80 border border-border/60 text-muted-foreground font-semibold flex items-center gap-1">
                                👤 {caseDaSemana.sex === 'M' || caseDaSemana.sex?.toLowerCase() === 'masculino' ? 'Masculino' : 'Feminino'}, {caseDaSemana.age} anos
                              </span>
                            )}
                          </div>

                          {/* Split Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                            {/* Left text column */}
                            <div className="md:col-span-6 space-y-4">
                              <h4 className="text-2xl md:text-3xl font-extrabold tracking-tight font-heading text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                                Caso #{caseDaSemana.case_number}
                              </h4>
                              <div className="border-l-2 border-primary/40 pl-4 py-1.5 bg-primary/[0.01] rounded-r-xl">
                                <p className="text-muted-foreground text-xs md:text-sm leading-relaxed line-clamp-6 italic font-medium">
                                  "{stripHtml(caseDaSemana.clinical_case)}"
                                </p>
                              </div>
                            </div>

                            {/* Right image column */}
                            <div className="md:col-span-6 flex justify-center md:justify-end">
                              <div className="relative w-full flex justify-center">
                                <div 
                                  onClick={() => setSelectedCase(caseDaSemana)}
                                  className="relative cursor-pointer aspect-square w-full min-w-[200px] max-w-[260px] md:max-w-[280px] rounded-3xl p-1.5 border border-border bg-zinc-950/80 shadow-md hover:shadow-lg hover:border-primary/45 transition-all duration-300 hover:-translate-y-0.5"
                                >
                                  <div className="w-full h-full rounded-[22px] overflow-hidden relative bg-black/60">
                                    {caseDaSemana.images?.[0] ? (
                                      <img
                                        src={caseDaSemana.images[0]}
                                        alt={`Caso ${caseDaSemana.case_number}`}
                                        className="w-full h-full object-contain transition-transform duration-500 group-hover/card:scale-102"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-4">
                                        <BookOpen className="w-8 h-8 mb-2 text-muted-foreground/45" />
                                        <span className="text-[10px] font-semibold">Sem imagem</span>
                                      </div>
                                    )}
                                    
                                    {/* Glass Overlay hover */}
                                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] opacity-0 group-hover/card:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-1.5">
                                      <div className="p-2.5 rounded-full bg-white/10 border border-white/20 text-white shadow-lg">
                                        <Eye className="w-4 h-4" />
                                      </div>
                                      <span className="text-[9px] font-bold text-white tracking-widest uppercase">Visualizar Exame</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Footer Button */}
                        <div className="pt-6 border-t border-border/40 mt-6 flex items-center justify-between gap-4">
                          {caseDaSemana.author ? (
                            <span className="text-[10px] text-muted-foreground/60 font-medium select-none">
                              Elaborado por: <span className="font-semibold text-muted-foreground/80">{caseDaSemana.author}</span>
                            </span>
                          ) : (
                            <div />
                          )}
                          <Button
                            onClick={() => setSelectedCase(caseDaSemana)}
                            size="sm"
                            variant="outline"
                            className="rounded-full font-bold px-5 h-9 text-xs border-border hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300"
                          >
                            Explorar Caso & Diagnóstico <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-card rounded-3xl border border-dashed border-border min-h-[460px] flex items-center justify-center">
                        <p className="text-muted-foreground text-sm">Nenhum caso em destaque cadastrado.</p>
                      </div>
                    )}
                  </div>

                  {/* Coluna Direita: Últimos Artigos */}
                  <div className="lg:col-span-4 space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-heading font-extrabold text-xl text-foreground flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary" /> Últimos Artigos
                      </h3>
                      <Link to="/artigos" className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5">
                        Ver todos <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>

                    {articles.length > 0 ? (
                      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-sm flex flex-col justify-between min-h-[460px] h-full">
                        <div className="space-y-3 w-full">
                          {articles.slice(0, 3).map((artigo) => (
                            <Link
                              key={artigo.id}
                              to={`/artigo/${slugify(artigo.titulo)}`}
                              className="group flex gap-3 p-3 bg-secondary/30 hover:bg-secondary/60 rounded-2xl border border-border hover:border-primary/20 transition-all duration-300 shadow-sm"
                            >
                              <div className="w-12 h-12 rounded-xl overflow-hidden bg-secondary border border-border flex-shrink-0">
                                {artigo.imagem_capa ? (
                                  <img
                                    src={artigo.imagem_capa}
                                    alt=""
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[9px] uppercase font-bold text-muted-foreground bg-muted">
                                    {artigo.categoria}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                                <div>
                                  <h5 className="text-[11px] sm:text-xs font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-tight">
                                    {artigo.titulo}
                                  </h5>
                                  <span className="inline-block text-[7px] font-bold text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded mt-1 uppercase tracking-wider">
                                    {artigo.categoria}
                                  </span>
                                </div>
                                <span className="text-[8px] text-muted-foreground font-semibold mt-1">
                                  Por {artigo.author?.split(' | ')[0]} • {formatDisplayDate(artigo.data_publicacao)}
                                </span>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-card rounded-3xl border border-dashed border-border min-h-[460px] flex items-center justify-center">
                        <p className="text-muted-foreground text-sm">Nenhum artigo cadastrado.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Divisor */}
              <div className={`border-t border-border/60 my-12 ${search ? 'hidden' : ''}`} />

              {/* Seção 2: Galeria Completa com Barra de Pesquisa */}
              <div id="galeria" className="space-y-6 scroll-mt-24">
                <div className={`text-center max-w-xl mx-auto space-y-2 mb-6 ${search ? 'hidden' : ''}`}>
                  <h3 className="font-heading font-extrabold text-2xl md:text-3xl text-foreground">
                    Arquivo de Casos Clínicos
                  </h3>
                  <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                    Explore nossa coleção completa de exames de imagem, diagnósticos e discussões clínicas detalhadas desenvolvidas pela nossa liga.
                  </p>
                </div>

                <FiltersBar
                  search={search}
                  onSearchChange={setSearch}
                  examType={examType}
                  onExamTypeChange={setExamType}
                  showDiagnosis={showDiagnosis}
                  onShowDiagnosisChange={setShowDiagnosis}
                />

                {isLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pt-4 animate-pulse">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="rounded-2xl overflow-hidden bg-card/30 border border-border/50 p-4 space-y-4">
                        <Skeleton className="aspect-square w-full rounded-xl" />
                        <div className="space-y-2">
                          <Skeleton className="h-4.5 w-1/3" />
                          <Skeleton className="h-3.5 w-full" />
                          <Skeleton className="h-3.5 w-3/4" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : cases && cases.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pt-4">
                    {cases.map((c, i) => (
                      <CaseCard
                        key={c.id}
                        caseData={c}
                        index={i}
                        onClick={() => setSelectedCase(c)}
                        showDiagnosis={showDiagnosis}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-card rounded-3xl border border-dashed border-border/80">
                    <p className="text-muted-foreground text-sm">
                      {search ? "Nenhum caso encontrado para a pesquisa." : "Nenhum caso clínico encontrado nesta modalidade."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer id="contato" className="border-t border-border px-4 py-12 bg-gradient-to-t from-primary/5 to-transparent">
        <div className="container mx-auto max-w-4xl space-y-8">
          {/* Contact info row */}
          <div className="flex flex-col items-center text-center space-y-4 pb-8 border-b border-border/40">
            <h3 className="font-heading text-lg font-bold text-foreground">Acompanhe a CONRAD</h3>
            <p className="text-muted-foreground text-sm max-w-md">
              Fique por dentro das nossas discussões de casos, aulas e eventos acadêmicos.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
              <a href="https://www.instagram.com/conradufsj/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-card border border-border hover:border-primary/50 transition-all text-sm">
                <Instagram className="w-4 h-4 text-pink-500" />
                <span className="font-medium text-foreground">@conradufsj</span>
              </a>
              <a href="mailto:conradufsj@gmail.com" className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-card border border-border hover:border-primary/50 transition-all text-sm">
                <Mail className="w-4 h-4 text-blue-500" />
                <span className="font-medium text-foreground">conradufsj@gmail.com</span>
              </a>
            </div>
          </div>

          {/* Middle row */}
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

          {/* Bottom copyright row */}
          <div className="pt-4 text-center text-xs text-muted-foreground">
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
      {/* Modal list removed. Displayed inline in archive grid instead. */}
    </div>
    
  );
};

export default Index;
