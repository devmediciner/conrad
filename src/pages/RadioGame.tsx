import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Stethoscope, ArrowLeft, CheckCircle2, XCircle, Trophy, Share2, Activity, Play, Grid, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCases } from '@/hooks/useCases';
import { useDiseases } from '@/hooks/useGame';
import { motion, AnimatePresence } from 'framer-motion';

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
        <div className="w-full max-w-xl">
          {step === 'intro' && (
            <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-6 shadow-xl animate-in fade-in slide-in-from-bottom-4">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
                <Stethoscope className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-bold font-heading text-foreground">Quiz</h2>
                <p className="text-muted-foreground">O desafio radiológico!</p>
              </div>
              <div className="bg-muted p-5 rounded-xl text-left text-sm space-y-3 max-w-sm mx-auto">
                <p className="font-semibold text-foreground text-base">Como jogar:</p>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" /> Analise a imagem radiológica.</li>
                  <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" /> Você tem 4 tentativas para acertar.</li>
                  <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" /> A cada erro, uma nova dica clínica é revelada.</li>
                  <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" /> Tente acertar com o menor número de dicas!</li>
                </ul>
              </div>
              <div className="space-y-3 pt-2">
                <Button size="lg" className="w-full max-w-sm gap-2 text-lg h-12" onClick={startRandom}>
                  <Play className="w-5 h-5 fill-current" /> Jogar Aleatório
                </Button>
                <Button variant="outline" size="lg" className="w-full max-w-sm gap-2 text-lg h-12" onClick={() => setStep('select')} disabled={loadingCases}>
                  <Grid className="w-5 h-5" /> Escolher um Caso
                </Button>
              </div>

              {stats.totalGames > 0 && (
                <div className="mt-6 border border-border rounded-xl bg-muted/30 p-5 space-y-4 animate-in fade-in">
                  <p className="text-sm font-semibold text-foreground text-center">📊 Suas Estatísticas</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-card border border-border rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-foreground">{stats.totalGames}</p>
                      <p className="text-xs text-muted-foreground">Total de Jogos</p>
                    </div>
                    <div className="bg-card border border-border rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-foreground">{Math.round((stats.totalWins / stats.totalGames) * 100) || 0}%</p>
                      <p className="text-xs text-muted-foreground">Taxa de Acerto</p>
                    </div>
                    <div className="bg-card border border-border rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-foreground">{stats.totalScore}</p>
                      <p className="text-xs text-muted-foreground">Pontuação Total</p>
                    </div>
                    <div className="bg-card border border-border rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-foreground">{stats.bestStreak}</p>
                      <p className="text-xs text-muted-foreground">Melhor Sequência</p>
                    </div>
                  </div>

                  {/* Achievement Badges */}
                  {(() => {
                    const badges: { emoji: string; label: string }[] = [];
                    if (stats.perfectGames > 0) badges.push({ emoji: '🎯', label: 'Olho de Águia' });
                    if (stats.currentStreak >= 3) badges.push({ emoji: '🔥', label: 'Em Chamas' });
                    if (stats.totalWins >= 10) badges.push({ emoji: '🧠', label: 'Radiologista' });
                    if (stats.totalScore >= 500) badges.push({ emoji: '🏆', label: 'Lenda' });
                    if (badges.length === 0) return null;
                    return (
                      <div className="flex flex-wrap gap-2 justify-center pt-1">
                        {badges.map((b) => (
                          <span
                            key={b.label}
                            className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold"
                          >
                            {b.emoji} {b.label}
                          </span>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {step === 'select' && (
            <div className="bg-card border border-border rounded-2xl p-6 shadow-xl animate-in fade-in slide-in-from-right-4 w-full max-w-3xl">
              <h2 className="text-2xl font-bold font-heading text-foreground mb-6 text-center">Selecione o Caso</h2>
              {loadingCases ? (
                <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto p-1">
                  {validCases.map(c => (
                    <div key={c.id} className="cursor-pointer group relative rounded-xl overflow-hidden border border-border aspect-[4/3] bg-secondary" onClick={() => startGame(c)}>
                      <img src={c.images?.[0]} alt={`Caso ${c.case_number || c.id}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-white font-bold tracking-wider text-sm">Caso #{c.case_number || c.id}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Button variant="ghost" className="w-full mt-6" onClick={() => setStep('intro')}>Voltar</Button>
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
                  <p className="text-sm text-foreground/85 leading-relaxed font-semibold">{currentCase.clinical_case}</p>
                </div>
                
                {/* Diagnóstico Final e Discussão */}
                <div className="bg-muted p-5 rounded-xl space-y-3">
                  <div className={`flex items-center gap-2 font-bold text-lg border-b border-border/50 pb-3 ${hasWon ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                    {hasWon ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                    <span>{currentCase.disease}</span>
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed pt-1">{currentCase.diagnosis}</p>
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