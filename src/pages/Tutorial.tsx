import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, Sparkles, BookOpen, Target, HelpCircle, Award, 
  Lightbulb, Plus, Search, Upload, Info, CheckCircle
} from 'lucide-react';

const steps = [
  { id: 'step-1', n: '01', title: 'Acesse o site', desc: 'Abra o navegador e acesse https://conradufsj.app. Nenhuma instalação é necessária — todo o cadastro é feito pelo navegador.' },
  { id: 'step-2', n: '02', title: 'Clique em Login', desc: 'No canto superior direito da página inicial, clique em Login para acessar o painel de cadastro de casos.' },
  { id: 'step-3', n: '03', title: 'Faça o login', desc: 'Insira seu email e senha de colaborador/professor. Caso não tenha uma conta ativa, solicite o cadastro a um administrador da liga.' },
  { id: 'step-4', n: '04', title: 'Novo Caso', desc: 'Já na área do membro (ou painel de admin), localize e clique no botão Novo Caso (com o ícone +).' },
  { id: 'step-5', n: '05', title: 'Informações gerais', desc: 'Preencha a idade do paciente, selecione o sexo (M/F) e o tipo do exame (Raio-X, Tomografia, Ultrassom ou Ressonância).' },
  { id: 'step-6', n: '06', title: 'Diagnóstico', desc: 'Pesquise e selecione o diagnóstico final. Comece a digitar o nome da doença e selecione uma das opções sugeridas na lista suspensa.' },
  { id: 'step-7', n: '07', title: 'Imagens do caso', desc: 'Faça o upload das imagens do exame em formato DICOM ou imagem convencional. Você pode arrastar as imagens para reordená-las, definindo a primeira como a miniatura de capa do caso.' },
  { id: 'step-8', n: '08', title: 'Caso clínico', desc: 'Descreva a história e a apresentação clínica do paciente no editor de texto. Seja claro e conciso para ajudar no raciocínio diagnóstico.' },
  { id: 'step-9', n: '09', title: 'Laudo radiológico', desc: 'Insira a descrição radiológica detalhada (laudo) no editor correspondente. Este campo é obrigatório e serve para o estudo do caso.' },
  { id: 'step-10', n: '10', title: 'Comentários', desc: 'Adicione observações e comentários adicionais se desejar. Você pode incluir referências bibliográficas, links para diretrizes ou outras informações relevantes.' },
  { id: 'step-11', n: '11', title: 'Quiz', desc: 'Marque se o caso estará disponível no Quiz Radiológico e configure as 3 dicas clínicas que serão liberadas a cada tentativa incorreta.' },
];

export default function Tutorial() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState('step-1');
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    document.title = 'Como Adicionar Casos ao Site — CONRAD';
    
    // Set up intersection observer to track active step in sidebar
    const stepElements = steps.map(step => document.getElementById(step.id));
    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActiveStep(entry.target.id);
        }
      });
    }, {
      rootMargin: '-20% 0px -60% 0px'
    });

    stepElements.forEach(el => {
      if (el) observerRef.current?.observe(el);
    });

    return () => {
      document.title = 'GALERIA - CONRAD';
      observerRef.current?.disconnect();
    };
  }, []);

  const scrollToStep = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F5EF] text-[#1B2430] selection:bg-[#4FD1C5] selection:text-[#0F1B2D]">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-[#0F1B2D] to-[#16273D] text-[#EAF2F2] py-16 px-6 md:px-12 lg:px-24 overflow-hidden border-b border-[#29405A] before:absolute before:inset-0 before:bg-[linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] before:bg-[size:64px_64px] before:pointer-events-none">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-[40%] h-[40%] rounded-full bg-[#4FD1C5]/10 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[40%] h-[40%] rounded-full bg-blue-500/5 blur-[100px] pointer-events-none" />

        <div className="max-w-5xl mx-auto relative z-10">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-white/80 hover:text-white mb-6 border border-white/10 hover:bg-white/5" 
            onClick={() => navigate('/admin')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Painel
          </Button>

          <div className="flex items-center gap-2 mb-4 font-mono text-[11px] tracking-[0.16em] text-[#4FD1C5] uppercase font-bold">
            <span className="w-2 h-2 rounded-full bg-[#4FD1C5] shadow-[0_0_10px_2px_rgba(79,209,197,0.7)] animate-pulse" />
            Guia Rápido • Plataforma CONRAD UFSJ
          </div>

          <h1 className="font-heading text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-4 max-w-2xl leading-none">
            Como adicionar casos ao site
          </h1>
          <p className="text-sm md:text-base text-[#B9C7D4] max-w-2xl leading-relaxed mb-6 font-medium">
            Um passo a passo para publicar um caso clínico completo — dados gerais, imagens detalhadas, laudo radiológico e quiz — na plataforma de casos da CONRAD UFSJ.
          </p>

          <div className="flex flex-wrap gap-6 pt-4 border-t border-[#29405A] text-xs font-mono text-[#7E93A6]">
            <span>Etapas: <strong className="text-[#CFE0E0] font-semibold">11 passos</strong> • Tempo: <strong className="text-[#CFE0E0] font-semibold">~10 min</strong></span>
            <span>Requisito: <strong className="text-[#CFE0E0] font-semibold">Conta de colaborador/admin ativa</strong></span>
          </div>
        </div>
      </section>

      {/* Main Content Wrap */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24 py-12 grid grid-cols-1 md:grid-cols-[240px_1fr] gap-12">
        {/* Navigation Sidebar */}
        <aside className="hidden md:block sticky top-6 align-self-start max-h-[calc(100vh-3rem)] overflow-y-auto pr-2 custom-scrollbar">
          <span className="font-mono text-[10px] tracking-wider text-[#4A5568] uppercase font-bold block mb-4">Etapas</span>
          <ol className="relative border-l border-[#DDD8CC]">
            {steps.map((step) => {
              const isActive = activeStep === step.id;
              return (
                <li key={step.id} className="mb-1">
                  <button
                    onClick={() => scrollToStep(step.id)}
                    className={`w-full text-left pl-4 py-2 border-l-2 -ml-[1.5px] text-xs font-medium transition-all ${
                      isActive 
                        ? 'border-[#2E8F86] text-[#0F1B2D] font-bold bg-[#4FD1C5]/5' 
                        : 'border-transparent text-[#4A5568] hover:text-[#1B2430] hover:border-[#DDD8CC]'
                    }`}
                  >
                    <span className="font-mono text-[#2E8F86] mr-2">{step.n}</span>
                    {step.title}
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>

        {/* Main Content Pane */}
        <main className="space-y-12">
          {/* Intro Warning Box */}
          <div className="flex gap-4 bg-white border border-[#DDD8CC] border-l-4 border-l-[#E8A33D] rounded-xl p-6 shadow-sm">
            <Lightbulb className="w-5 h-5 text-[#E8A33D] flex-shrink-0 mt-0.5" />
            <div className="text-xs md:text-sm text-[#4A5568] leading-relaxed">
              <strong className="text-[#1B2430] font-bold">Antes de começar:</strong> tenha em mãos as imagens do exame, o diagnóstico final definido, o laudo radiológico estruturado e um breve histórico clínico do paciente. Isso deixará o cadastro bem mais rápido.
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-12 divide-y divide-[#DDD8CC]/60">
            {steps.map((step, index) => (
              <section 
                key={step.id} 
                id={step.id} 
                className={`pt-12 first:pt-0 scroll-mt-6`}
              >
                <div className="flex items-baseline gap-3 mb-3">
                  <span className="font-mono text-xs font-bold text-[#2E8F86] bg-[#4FD1C5]/10 border border-[#2E8F86]/30 px-2 py-0.5 rounded">
                    PASSO {step.n}
                  </span>
                  <h2 className="font-heading text-lg md:text-xl font-bold text-[#0F1B2D]">
                    {step.title}
                  </h2>
                </div>
                <p className="text-xs md:text-sm text-[#4A5568] leading-relaxed mb-6 max-w-3xl">
                  {step.desc}
                </p>

                {/* Customized mockups for certain steps */}
                {step.id === 'step-2' && (
                  <div className="bg-[#0F1B2D] border border-[#29405A] rounded-xl p-4 max-w-md shadow-md text-white overflow-hidden">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                      </div>
                      <span className="text-[10px] text-white/40 font-mono">conradufsj.app</span>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="font-extrabold text-sm text-[#4FD1C5] tracking-widest font-mono">CONRAD</span>
                      <div className="flex items-center gap-4 text-[11px] font-semibold text-white/75">
                        <span>Galeria</span>
                        <span>Sobre</span>
                        <button className="px-3.5 py-1.5 bg-[#4FD1C5] text-[#0F1B2D] font-bold rounded-full animate-pulse shadow-[0_0_15px_-2px_rgba(79,209,197,0.5)] cursor-default">
                          Login
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {step.id === 'step-4' && (
                  <div className="bg-[#16273D] border border-[#29405A] rounded-xl p-4 max-w-sm shadow-md text-white flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold font-heading text-white">Área do Membro</h4>
                      <p className="text-[10px] text-white/60 mt-0.5">Gerencie os casos clínicos da Liga</p>
                    </div>
                    <Button variant="default" className="gap-2 h-9 text-xs bg-primary text-primary-foreground font-bold hover:scale-102 cursor-default">
                      <Plus className="w-4 h-4" /> Novo Caso
                    </Button>
                  </div>
                )}

                {step.id === 'step-6' && (
                  <div className="bg-[#16273D] border border-[#29405A] rounded-xl p-4 max-w-md shadow-md text-white space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-white/60">Diagnóstico *</label>
                    <div className="relative">
                      <div className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 flex items-center gap-2 text-xs">
                        <Search className="w-3.5 h-3.5 text-white/40" />
                        <span className="text-white/80">Tubercolose</span>
                        <span className="w-px h-4 bg-white/20 animate-pulse" />
                      </div>
                      <div className="absolute top-full left-0 right-0 mt-1 bg-[#0F1B2D] border border-white/10 rounded-lg shadow-xl p-1 text-xs space-y-0.5">
                        <div className="px-3 py-1.5 bg-primary/20 text-[#4FD1C5] rounded font-semibold cursor-default">Tuberculose Pulmonar</div>
                        <div className="px-3 py-1.5 hover:bg-white/5 rounded cursor-default text-white/60">Tuberculose Extrapulmonar</div>
                      </div>
                    </div>
                  </div>
                )}

                {step.id === 'step-7' && (
                  <div className="space-y-3">
                    <div className="bg-white border border-[#DDD8CC] rounded-xl p-4 max-w-lg shadow-sm flex flex-col items-center justify-center border-dashed text-center py-6">
                      <Upload className="w-8 h-8 text-[#2E8F86]/60 mb-2" />
                      <h4 className="text-xs font-bold text-[#0F1B2D]">Arraste as imagens aqui</h4>
                      <p className="text-[10px] text-[#4A5568] mt-1 max-w-xs leading-relaxed">Formatos suportados: DICOM (.dcm), PNG, JPG e WEBP. O primeiro arquivo da lista será a miniatura principal.</p>
                    </div>
                  </div>
                )}

                {step.id === 'step-9' && (
                  <div className="bg-white border border-[#DDD8CC] rounded-xl p-4 max-w-md shadow-sm space-y-2">
                    <div className="flex items-center gap-2 border-b border-[#DDD8CC]/50 pb-2">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400" />
                      <div className="w-3 h-3 rounded-full bg-green-400" />
                      <span className="text-[9px] text-[#4A5568] font-mono ml-auto">Editor de Texto Rico (Laudo)</span>
                    </div>
                    <div className="h-20 bg-muted/40 border border-[#DDD8CC]/60 rounded-md p-3 text-xs text-[#1B2430]/75 select-none leading-relaxed italic">
                      "Exame de Raio-X de tórax evidencia opacidade alveolar homogênea ocupando o lobo médio..."
                    </div>
                  </div>
                )}
              </section>
            ))}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#DDD8CC] py-8 px-6 md:px-12 lg:px-24 max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-mono text-[#4A5568]">
        <span>CONRAD UFSJ © {new Date().getFullYear()}</span>
        <span className="flex items-center gap-1.5">
          Guia de Apoio ao Colaborador <Info className="w-3.5 h-3.5 text-[#2E8F86]" />
        </span>
      </footer>
    </div>
  );
}
