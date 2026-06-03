import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Stethoscope, ArrowLeft, CheckCircle2, XCircle, Trophy, Share2, Activity, Play, Grid, Loader2,
  Sparkles, BookOpen, Target, HelpCircle, Award, Flame
} from 'lucide-react';
import { toast } from 'sonner';
import { useCases } from '@/hooks/useCases';
import { useDiseases } from '@/hooks/useGame';
import { motion, AnimatePresence } from 'framer-motion';
import { EXAM_TYPE_COLORS, EXAM_TYPE_LABELS, type ExamType } from '@/types/case';
import { FormattedText } from '@/components/ui/FormattedText';


interface QuizStats {
  totalGames: number;
  totalWins: number;
  totalScore: number;
  currentStreak: number;
  bestStreak: number;
  perfectGames: number;
  history: { date: string; won: boolean; score: number; attempts: number }[];
}

const STATS_KEY = 'conrad-quiz-stats';

const defaultStats: QuizStats = {
  totalGames: 0,
  totalWins: 0,
  totalScore: 0,
  currentStreak: 0,
  bestStreak: 0,
  perfectGames: 0,
  history: [],
};

function getStats(): QuizStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return { ...defaultStats };
    return { ...defaultStats, ...JSON.parse(raw) };
  } catch {
    return { ...defaultStats };
  }
}

function saveStats(stats: QuizStats) {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

export default function RadioGame() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'intro' | 'select' | 'playing' | 'result'>('intro');
  const [currentCase, setCurrentCase] = useState<any | null>(null);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [hasWon, setHasWon] = useState(false);
  const [stats, setStats] = useState<QuizStats>(getStats);
  const [statsRecorded, setStatsRecorded] = useState(false);

  const { data: cases, isLoading: loadingCases } = useCases({ search: '', examType: 'all' });
  const { data: diseasesData } = useDiseases();
  
  const diseasesList = useMemo(() => diseasesData?.map(d => d.name) || [], [diseasesData]);
  const validCases = useMemo(() => cases?.filter((c: any) => c.disease && c.images && c.images.length > 0) || [], [cases]);

  const startRandom = () => {
    if (!validCases || validCases.length === 0) {
      toast.error('Nenhum caso válido para o jogo cadastrado ainda.');
      return;
    }
    const randomCase = validCases[Math.floor(Math.random() * validCases.length)];
    startGame(randomCase);
  };

  const startGame = (gameCase: any) => {
    setCurrentCase(gameCase);
    setGuesses([]);
    setCurrentInput('');
    setHasWon(false);
    setStatsRecorded(false);
    setStep('playing');
  };

  const filteredDiseases = useMemo(() => {
    if (!currentInput) return diseasesList;
    return diseasesList.filter(d => d.toLowerCase().includes(currentInput.toLowerCase()));
  }, [currentInput, diseasesList]);

  const recordStats = useCallback((won: boolean, attempts: number) => {
    const current = getStats();
    const score = won
      ? attempts === 1 ? 100 : attempts === 2 ? 75 : attempts === 3 ? 50 : 25
      : 0;

    const updated: QuizStats = {
      totalGames: current.totalGames + 1,
      totalWins: current.totalWins + (won ? 1 : 0),
      totalScore: current.totalScore + score,
      currentStreak: won ? current.currentStreak + 1 : 0,
      bestStreak: won
        ? Math.max(current.bestStreak, current.currentStreak + 1)
        : current.bestStreak,
      perfectGames: current.perfectGames + (won && attempts === 1 ? 1 : 0),
      history: [
        ...current.history,
        { date: new Date().toISOString(), won, score, attempts },
      ],
    };

    saveStats(updated);
    setStats(updated);
    setStatsRecorded(true);
  }, []);

  const handleGuess = () => {
    if (!currentInput || !currentCase) return;
    if (guesses.includes(currentInput)) {
      toast.error("Você já tentou este diagnóstico!");
      return;
    }

    if (currentInput.toLowerCase() === currentCase.disease.toLowerCase()) {
      setHasWon(true);
      setStep('result');
      recordStats(true, guesses.length + 1);
      toast.success("Diagnóstico correto! 🎉");
    } else {
      const newGuesses = [...guesses, currentInput];
      setGuesses(newGuesses);
      setCurrentInput('');
      
      if (newGuesses.length >= 4) {
        setStep('result');
        recordStats(false, newGuesses.length);
      } else {
        toast.error("Diagnóstico incorreto!");
      }
    }
  };

  const getScore = () => {
    if (!hasWon) return 0;
    if (guesses.length === 0) return 100;
    if (guesses.length === 1) return 75;
    if (guesses.length === 2) return 50;
    return 25;
  };

  const handleRequestHint = () => {
    if (!currentCase) return;
    if (guesses.length >= 3) {
      toast.error("Todas as dicas para este caso já foram reveladas!");
      return;
    }
    
    const newGuesses = [...guesses, '__hint__'];
    setGuesses(newGuesses);
    toast.info("Dica revelada! Consumiu 1 tentativa. 💡");
    
    if (newGuesses.length >= 4) {
      setStep('result');
      recordStats(false, newGuesses.length);
    }
  };

  const clues = useMemo(() => {
    if (!currentCase) return [];
    return [
      { text: currentCase.clue1, unlocked: guesses.length >= 1 },
      { text: currentCase.clue2, unlocked: guesses.length >= 2 },
      { text: currentCase.clue3, unlocked: guesses.length >= 3 },
    ].filter(c => c.text);
  }, [currentCase, guesses.length]);

  const wrongGuesses = useMemo(() => {
    return guesses.filter(g => g !== '__hint__');
  }, [guesses]);

  const highlightMatch = (text: string, query: string) => {
    if (!query) return <span>{text}</span>;
    const parts = text.split(new RegExp(`(${query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() 
            ? <strong key={i} className="text-primary font-extrabold">{part}</strong> 
            : <span key={i} className="opacity-80">{part}</span>
        )}
      </span>
    );
  };

  const handleShare = () => {
    if (!currentCase) return;
    const score = getScore();
    
    // Constrói a grade de emojis Wordle-style: 🟦 (Dica), 🟥 (Erro), 🟩 (Acerto), ⬜ (Restante)
    const grid: string[] = [];
    guesses.forEach(g => {
      if (g === '__hint__') {
        grid.push('🟦');
      } else {
        grid.push('🟥');
      }
    });
    
    if (hasWon) {
      grid.push('🟩');
    }
    
    while (grid.length < 4) {
      grid.push('⬜');
    }
    
    const emojiGrid = grid.join(' ');
    const scoreTxt = hasWon ? `${score}pts` : '0pts';
    const attemptsTxt = hasWon ? `${guesses.length + 1}/4` : 'X/4';
    
    const text = `Quiz CONRAD Caso #${currentCase.case_number || currentCase.id} 🩻\n${emojiGrid} (${scoreTxt}) — ${attemptsTxt} tentativas\nJogue na Galeria Radiológica CONRAD`;
    
    navigator.clipboard.writeText(text);
    toast.success("Resultado copiado em formato de grade! Compartilhe com colegas! 📊");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="bg-primary/20 p-1.5 rounded-md text-primary">
                <Activity className="w-5 h-5" />
              </div>
              <h1 className="font-heading font-bold text-xl text-foreground">Quiz</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className={`w-full transition-all duration-500 ${step === 'select' ? 'max-w-6xl' : 'max-w-xl'}`}>
          {step === 'intro' && (
            <div className="relative bg-card/60 backdrop-blur-md border border-border/80 rounded-2xl p-6 sm:p-8 text-center space-y-6 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4">
              {/* Pulsing glow background decoration */}
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

              <div className="relative w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary shadow-[0_0_20px_-3px_rgba(var(--primary-rgb),0.35)] mb-2 group">
                <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-amber-500 animate-pulse" />
                <Stethoscope className="w-10 h-10 group-hover:scale-110 transition-transform duration-300" />
              </div>

              <div className="space-y-2 relative z-10">
                <span className="text-[10px] font-bold tracking-widest text-primary uppercase bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                  Quiz CONRAD
                </span>
                <h2 className="text-3xl font-extrabold font-heading text-foreground tracking-tight">
                  Desafio Radiológico
                </h2>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  Avalie seus conhecimentos! Analise exames de imagem reais, correlacione com a história clínica e descubra o diagnóstico.
                </p>
              </div>

              {/* Como Jogar - Beautiful Interactive Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left w-full relative z-10">
                <div className="bg-muted/30 border border-border/40 p-3.5 rounded-xl flex gap-3 hover:border-primary/30 transition-colors group">
                  <div className="bg-primary/10 text-primary w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">1. Estude o Caso</h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">Analise a radiografia e a idade/sexo do paciente.</p>
                  </div>
                </div>

                <div className="bg-muted/30 border border-border/40 p-3.5 rounded-xl flex gap-3 hover:border-primary/30 transition-colors group">
                  <div className="bg-primary/10 text-primary w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Target className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">2. 4 Tentativas</h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">Você tem até 4 chances para dar o palpite correto.</p>
                  </div>
                </div>

                <div className="bg-muted/30 border border-border/40 p-3.5 rounded-xl flex gap-3 hover:border-primary/30 transition-colors group">
                  <div className="bg-primary/10 text-primary w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">3. Pistas Clínicas</h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">Dicas de história estão disponíveis, mas custam 1 tentativa.</p>
                  </div>
                </div>

                <div className="bg-muted/30 border border-border/40 p-3.5 rounded-xl flex gap-3 hover:border-primary/30 transition-colors group">
                  <div className="bg-primary/10 text-primary w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Award className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">4. Pontue e Vença</h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">Acerte rápido para pontuar mais e colecionar insígnias.</p>
                  </div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2 w-full max-w-md mx-auto relative z-10">
                <Button 
                  size="lg" 
                  className="w-full sm:flex-1 gap-2 text-base h-12 rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/95 hover:to-primary hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_4px_20px_-4px_hsl(var(--primary)/0.4)]" 
                  onClick={startRandom}
                >
                  <Play className="w-4 h-4 fill-current animate-pulse" /> Jogar Aleatório
                </Button>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="w-full sm:flex-1 gap-2 text-base h-12 rounded-xl border-border/80 hover:bg-muted/50 hover:scale-[1.02] active:scale-[0.98] transition-all" 
                  onClick={() => setStep('select')} 
                  disabled={loadingCases}
                >
                  <Grid className="w-4 h-4 text-muted-foreground" /> Escolher Caso
                </Button>
              </div>

              {/* Estatísticas Enriquecidas */}
              {stats.totalGames > 0 && (
                <div className="mt-4 border border-border/70 rounded-2xl bg-muted/20 backdrop-blur-sm p-4 space-y-4 animate-in fade-in relative z-10 text-left">
                  <div className="flex items-center justify-between border-b border-border/40 pb-2">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-primary" /> Painel de Desempenho
                    </span>
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
                      Quiz Ativo
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="bg-card/50 border border-border/50 rounded-xl p-2.5 text-center transition-all hover:bg-card/75 group">
                      <p className="text-xl font-extrabold text-foreground group-hover:text-primary transition-colors">{stats.totalGames}</p>
                      <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mt-1">Jogos</p>
                    </div>
                    
                    <div className="bg-card/50 border border-border/50 rounded-xl p-2.5 text-center transition-all hover:bg-card/75 group">
                      <p className="text-xl font-extrabold text-foreground group-hover:text-emerald-500 transition-colors">
                        {Math.round((stats.totalWins / stats.totalGames) * 100) || 0}%
                      </p>
                      <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mt-1">Taxa Acerto</p>
                    </div>
                    
                    <div className="bg-card/50 border border-border/50 rounded-xl p-2.5 text-center transition-all hover:bg-card/75 group">
                      <p className="text-xl font-extrabold text-foreground group-hover:text-amber-500 transition-colors">{stats.totalScore}</p>
                      <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mt-1">Pontos</p>
                    </div>
                    
                    <div className="bg-card/50 border border-border/50 rounded-xl p-2.5 text-center transition-all hover:bg-card/75 group">
                      <div className="flex justify-center items-center gap-1 group-hover:scale-105 transition-transform">
                        <Flame className={`w-3.5 h-3.5 ${stats.currentStreak > 0 ? 'text-orange-500 animate-pulse fill-orange-500' : 'text-muted-foreground'}`} />
                        <p className="text-xl font-extrabold text-foreground">{stats.currentStreak}</p>
                      </div>
                      <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mt-1">Sequência</p>
                    </div>
                  </div>

                  {/* Achievement Badges */}
                  {(() => {
                    const badges: { emoji: string; label: string; color: string }[] = [];
                    if (stats.perfectGames > 0) badges.push({ emoji: '🎯', label: 'Olho de Águia', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' });
                    if (stats.currentStreak >= 3) badges.push({ emoji: '🔥', label: 'Em Chamas', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' });
                    if (stats.totalWins >= 10) badges.push({ emoji: '🧠', label: 'Radiologista', color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' });
                    if (stats.totalScore >= 500) badges.push({ emoji: '🏆', label: 'Lenda', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' });
                    if (badges.length === 0) return null;
                    return (
                      <div className="space-y-2 pt-2.5 border-t border-border/40">
                        <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest text-center">Conquistas Desbloqueadas</p>
                        <div className="flex flex-wrap gap-1.5 justify-center">
                          {badges.map((b) => (
                            <span
                              key={b.label}
                              className={`text-[10px] px-2.5 py-1 rounded-full border font-bold flex items-center gap-1 shadow-sm transition-transform hover:scale-105 cursor-default ${b.color}`}
                            >
                              <span>{b.emoji}</span> {b.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {step === 'select' && (
            <div className="relative bg-card/60 backdrop-blur-md border border-border/80 rounded-2xl p-6 sm:p-8 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-right-4 w-full max-w-full">
              {/* Pulsing glow background decoration */}
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

              <div className="text-center space-y-2 mb-6 relative z-10">
                <span className="text-[10px] font-bold tracking-widest text-primary uppercase bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                  Casos de Imagem
                </span>
                <h2 className="text-3xl font-extrabold font-heading text-foreground tracking-tight">
                  Selecione seu Caso
                </h2>
                <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                  Investigue diagnósticos específicos selecionando um dos casos reais arquivados pela Liga Acadêmica.
                </p>
              </div>

              {loadingCases ? (
                <div className="flex justify-center py-12 relative z-10">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-h-[60vh] overflow-y-auto p-1 custom-scrollbar relative z-10">
                  {validCases.map(c => {
                    const examType = c.exam_type as ExamType || 'RX';
                    const label = EXAM_TYPE_LABELS[examType] || examType;
                    const colorClass = EXAM_TYPE_COLORS[examType] || 'bg-muted text-muted-foreground';
                    
                    return (
                      <motion.div 
                        key={c.id} 
                        whileHover={{ y: -3 }}
                        className="cursor-pointer group flex flex-col rounded-xl overflow-hidden border border-border/40 bg-card/30 shadow-md hover:shadow-xl hover:border-primary/50 transition-all duration-300"
                        onClick={() => startGame(c)}
                      >
                        {/* Imagem do Caso - 100% Limpa e Visível */}
                        <div className="relative w-full aspect-[4/3] overflow-hidden bg-black border-b border-border/20">
                          <img 
                            src={c.images?.[0]} 
                            alt={`Caso ${c.case_number || c.id}`} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                          />
                          
                          {/* Identificador do número do caso no canto - Mais legível */}
                          <div className="absolute top-2.5 left-2.5 bg-black/75 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-extrabold font-mono text-white border border-white/10 shadow-md">
                            Caso #{c.case_number || c.id.slice(0, 3)}
                          </div>
                        </div>

                        {/* Painel de Informações - Demográficos e Exame (Sem redundância e ultra limpo) */}
                        <div className="p-3.5 bg-card/60 text-left transition-colors group-hover:bg-primary/5 flex items-center justify-between gap-2">
                          <span className="text-sm sm:text-base font-extrabold text-foreground group-hover:text-primary transition-colors truncate">
                            {c.sex === 'M' ? 'Masculino' : c.sex === 'F' ? 'Feminino' : c.sex || 'Paciente'}, {c.age} anos
                          </span>
                          <span className={`text-[9px] sm:text-xs font-extrabold uppercase px-2.5 py-1 rounded shadow-sm border border-white/5 shrink-0 ${colorClass}`}>
                            {label}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
              
              <div className="flex justify-center pt-8 relative z-10">
                <Button 
                  variant="outline" 
                  className="w-full sm:w-auto px-8 h-12 rounded-xl border-border/80 hover:bg-muted/50 transition-all font-bold text-sm shadow-sm" 
                  onClick={() => setStep('intro')}
                >
                  Voltar ao Menu
                </Button>
              </div>
            </div>
          )}

          {step === 'playing' && currentCase && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="bg-black rounded-2xl overflow-hidden shadow-xl border border-border aspect-[4/3] sm:aspect-video flex items-center justify-center relative">
                <img src={currentCase.images?.[0]} alt="Caso Radiológico" className="max-w-full max-h-full object-contain opacity-95" />
                <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full text-sm font-medium text-white border border-white/10 shadow-sm">
                  {currentCase.sex}, {currentCase.age} anos
                </div>
              </div>

              <div className="space-y-4 bg-card p-5 rounded-2xl border border-border shadow-sm">
                {/* Cabeçalho Compacto com Timeline de Dots */}
                <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-1">
                  <span className="text-sm font-bold text-foreground uppercase tracking-wider">Histórico Clínico</span>
                  <div className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-full border border-border/50">
                    <span className="text-[10px] text-muted-foreground font-mono font-bold mr-1.5">Tentativas:</span>
                    {Array.from({ length: 4 }).map((_, idx) => {
                      const guess = guesses[idx];
                      if (guess === undefined) {
                        return <span key={idx} className="w-2.5 h-2.5 rounded-full bg-border" />;
                      }
                      if (guess === '__hint__') {
                        return <span key={idx} className="w-2.5 h-2.5 rounded-full bg-blue-500/80 animate-pulse" title="Dica pedida" />;
                      }
                      return <span key={idx} className="w-2.5 h-2.5 rounded-full bg-red-500/80" title={`Palpite errado: ${guess}`} />;
                    })}
                  </div>
                </div>

                {/* Feed de Dicas Unificado */}
                <div className="space-y-4 pt-1">
                  {clues.filter(c => c.unlocked).length === 0 ? (
                    <p className="text-sm text-muted-foreground/75 py-2 italic pl-1 animate-in fade-in">Nenhuma dica revelada ainda. Clique em "Dica" ou dê um palpite!</p>
                  ) : (
                    <div className="space-y-4">
                      {clues.map((c, i) => c.unlocked && (
                        <motion.div 
                          key={i} 
                          initial={{ x: -6, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ duration: 0.2 }}
                          className="text-sm border-l-2 border-primary/40 pl-3.5 py-0.5 space-y-1"
                        >
                          <div className="flex items-center justify-between text-xs text-muted-foreground font-bold tracking-wide">
                            <span className="text-primary flex items-center gap-1">💡 DICA {i + 1}</span>
                            {guesses[i] && guesses[i] !== '__hint__' && (
                              <span className="text-[10px] text-red-500/90 line-through bg-red-500/5 border border-red-500/10 px-2 py-0.5 rounded font-medium">
                                Chute: {guesses[i]}
                              </span>
                            )}
                          </div>
                          <p className="text-foreground/85 leading-relaxed font-medium pl-0.5">{c.text}</p>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Controles Compactos h-11 */}
              <div className="space-y-3 bg-card p-4 rounded-2xl border border-border shadow-sm">
                <div className="relative">
                  <Input
                    value={currentInput}
                    onChange={(e) => { setCurrentInput(e.target.value); setShowDropdown(true); }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Pesquise o diagnóstico..."
                    className="w-full bg-background text-base h-11 rounded-lg"
                  />
                  <AnimatePresence>
                    {showDropdown && currentInput && filteredDiseases.length > 0 && (
                      <motion.ul 
                        initial={{ opacity: 0, y: 5, scale: 0.99 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 5, scale: 0.99 }}
                        transition={{ duration: 0.1 }}
                        className="absolute bottom-full mb-2 z-20 w-full bg-popover border border-border rounded-xl max-h-48 overflow-y-auto shadow-2xl p-1.5 custom-scrollbar"
                      >
                        {filteredDiseases.map(d => (
                          <li 
                            key={d} 
                            className="p-2.5 hover:bg-primary/10 hover:text-primary rounded-lg cursor-pointer text-sm font-medium transition-colors flex items-center justify-between group" 
                            onClick={() => { setCurrentInput(d); setShowDropdown(false); }}
                          >
                            <span>{highlightMatch(d, currentInput)}</span>
                            <span className="text-[10px] text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity">Selecionar</span>
                          </li>
                        ))}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </div>
                <div className="flex gap-3">
                  <Button 
                    variant="outline"
                    className="flex-1 h-11 text-sm gap-1.5 rounded-lg shrink-0" 
                    onClick={handleRequestHint}
                    disabled={guesses.length >= 3}
                  >
                    <span>💡 Dica</span>
                    {guesses.length < 3 && (
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.2 rounded font-mono">
                        {3 - guesses.length}
                      </span>
                    )}
                  </Button>
                  <Button 
                    className="flex-[2] h-11 text-sm rounded-lg" 
                    onClick={handleGuess} 
                    disabled={!currentInput}
                  >
                    Confirmar
                  </Button>
                </div>
              </div>
            </div>
          )}

          {step === 'result' && currentCase && (
            <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 text-center space-y-5 shadow-xl animate-in zoom-in-95 w-full">
              {/* Cabeçalho de Status */}
              <div className="text-center space-y-2">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto shadow-inner ${hasWon ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>
                  {hasWon ? <Trophy className="w-7 h-7" /> : <XCircle className="w-7 h-7" />}
                </div>
                <div>
                  <h2 className="text-2xl font-bold font-heading text-foreground">{hasWon ? 'Parabéns!' : 'Fim de Jogo'}</h2>
                  <p className="text-sm text-muted-foreground">{hasWon ? 'Você acertou o diagnóstico clínico!' : 'As tentativas de diagnóstico esgotaram.'}</p>
                </div>
              </div>

              {/* Imagem do Caso */}
              <div className="bg-black rounded-2xl overflow-hidden shadow-md border border-border aspect-[4/3] sm:aspect-video flex items-center justify-center relative w-full">
                <img src={currentCase.images?.[0]} alt="Caso Radiológico" className="max-w-full max-h-full object-contain opacity-95" />
                <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-medium text-white border border-white/10 shadow-sm">
                  {currentCase.sex}, {currentCase.age} anos
                </div>
              </div>
              {/* Discussão do Caso */}
              <div className="space-y-4 text-left">
                {/* História Clínica */}
                <div className="bg-muted/30 border border-border/60 p-4 rounded-xl space-y-1.5">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">História Clínica</h4>
                  <FormattedText content={currentCase.clinical_case} className="text-sm text-foreground/85 leading-relaxed font-semibold" />
                </div>
                
                {/* Diagnóstico Final e Discussão */}
                <div className="bg-muted p-5 rounded-xl space-y-3">
                  <div className={`flex items-center gap-2 font-bold text-lg border-b border-border/50 pb-3 ${hasWon ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                    {hasWon ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                    <span>{currentCase.disease}</span>
                  </div>
                  <FormattedText content={currentCase.diagnosis} className="text-sm text-foreground/80 leading-relaxed pt-1" />
                </div>
              </div>

              {/* Controles de Ação */}
              <div className="flex gap-3 pt-2">
                <Button variant="outline" size="lg" className="flex-1 h-12" onClick={() => setStep('intro')}>
                  Jogar Novamente
                </Button>
                <Button size="lg" className="flex-1 gap-2 h-12" onClick={handleShare}>
                  <Share2 className="w-5 h-5" /> Compartilhar
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}