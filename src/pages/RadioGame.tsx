import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Stethoscope, ArrowLeft, CheckCircle2, XCircle, Trophy, Share2, Activity, Play, Grid, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCases } from '@/hooks/useCases';
import { useDiseases } from '@/hooks/useGame';

export default function RadioGame() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'intro' | 'select' | 'playing' | 'result'>('intro');
  const [currentCase, setCurrentCase] = useState<any | null>(null);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [hasWon, setHasWon] = useState(false);

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
    setStep('playing');
  };

  const filteredDiseases = useMemo(() => {
    if (!currentInput) return diseasesList;
    return diseasesList.filter(d => d.toLowerCase().includes(currentInput.toLowerCase()));
  }, [currentInput, diseasesList]);

  const handleGuess = () => {
    if (!currentInput || !currentCase) return;
    if (guesses.includes(currentInput)) {
      toast.error("Você já tentou este diagnóstico!");
      return;
    }

    if (currentInput.toLowerCase() === currentCase.disease.toLowerCase()) {
      setHasWon(true);
      setStep('result');
      toast.success("Diagnóstico correto! 🎉");
    } else {
      const newGuesses = [...guesses, currentInput];
      setGuesses(newGuesses);
      setCurrentInput('');
      
      if (newGuesses.length >= 4) {
        setStep('result');
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

  const handleShare = () => {
    if (!currentCase) return;
    const score = getScore();
    const stars = hasWon ? '⭐'.repeat(4 - guesses.length) : '💀';
    const attemptsTxt = hasWon ? `${guesses.length + 1}/4` : 'X/4';
    const text = `Quiz #${currentCase.case_number || currentCase.id} — ${stars} ${score}pts — ${attemptsTxt} tentativas 🩻\nJogue na Galeria Radiológica CONRAD`;
    
    navigator.clipboard.writeText(text);
    toast.success("Resultado copiado para a área de transferência!");
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

              <div className="space-y-3 bg-card p-5 rounded-2xl border border-border shadow-sm">
                <div className="flex items-center justify-between font-medium text-muted-foreground mb-2">
                  <span className="text-sm">Histórico de Dicas</span>
                  <span className="text-sm bg-muted px-2.5 py-1 rounded-md">Tentativa {guesses.length + 1}/4</span>
                </div>
                {guesses.length === 0 && <p className="text-sm text-center text-muted-foreground py-4 italic">Nenhuma dica revelada ainda. Faça sua primeira tentativa!</p>}
                {guesses.map((g, i) => (
                  <div key={i} className="space-y-2 animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 px-3 py-2.5 rounded-lg border border-red-500/20 line-through">
                      <XCircle className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{g}</span>
                    </div>
                    {(() => {
                      const clueText = i === 0 ? currentCase.clue1 : i === 1 ? currentCase.clue2 : currentCase.clue3;
                      if (!clueText) return null;
                      return (
                        <div className="text-sm bg-blue-500/10 text-blue-500 px-4 py-3 rounded-lg border border-blue-500/20">
                          <span className="font-semibold block mb-0.5">Dica {i + 1}</span> {clueText}
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>

              <div className="space-y-3 bg-card p-5 rounded-2xl border border-border shadow-sm">
                <div className="relative">
                  <Input
                    value={currentInput}
                    onChange={(e) => { setCurrentInput(e.target.value); setShowDropdown(true); }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Pesquise o diagnóstico..."
                    className="w-full bg-background text-base h-12"
                  />
                  {showDropdown && currentInput && filteredDiseases.length > 0 && (
                    <ul className="absolute bottom-full mb-2 z-10 w-full bg-card border border-border rounded-xl max-h-48 overflow-y-auto shadow-2xl p-1">
                      {filteredDiseases.map(d => (
                        <li key={d} className="p-3 hover:bg-muted rounded-lg cursor-pointer text-sm font-medium transition-colors" onClick={() => { setCurrentInput(d); setShowDropdown(false); }}>
                          {d}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <Button size="lg" className="w-full h-12 text-base" onClick={handleGuess} disabled={!currentInput}>
                  Confirmar diagnóstico
                </Button>
              </div>
            </div>
          )}

          {step === 'result' && currentCase && (
            <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-6 shadow-xl animate-in zoom-in-95">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto shadow-inner ${hasWon ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>
                {hasWon ? <Trophy className="w-12 h-12" /> : <XCircle className="w-12 h-12" />}
              </div>
              <div>
                <h2 className="text-3xl font-bold font-heading mb-2 text-foreground">{hasWon ? 'Parabéns!' : 'Fim de Jogo'}</h2>
                <p className="text-muted-foreground text-lg">{hasWon ? 'Você acertou o diagnóstico!' : 'As tentativas esgotaram.'}</p>
              </div>
              
              <div className="bg-muted p-5 rounded-xl space-y-3 text-left">
                <div className="flex items-center gap-2 font-bold text-emerald-600 dark:text-emerald-400 text-lg border-b border-border/50 pb-3">
                  <CheckCircle2 className="w-5 h-5" /> {currentCase.disease}
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed pt-1">{currentCase.diagnosis}</p>
              </div>

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