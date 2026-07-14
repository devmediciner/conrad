import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Heading1, Heading2, Bold, Italic, Link, Image, Quote, Save, Search, Plus, Check } from 'lucide-react';
import { useAuth } from '@/hooks/authContent';

const steps = [
  { id: 'step-1', n: '01', title: 'Acesse a aba de Artigos' },
  { id: 'step-2', n: '02', title: 'Clique em "Novo Artigo"' },
  { id: 'step-3', n: '03', title: 'Preencha o cabeçalho' },
  { id: 'step-4', n: '04', title: 'Adicione a imagem de capa' },
  { id: 'step-5', n: '05', title: 'Escreva o conteúdo' },
  { id: 'step-6', n: '06', title: 'Formate e adicione mídias' },
  { id: 'step-7', n: '07', title: 'Vincule casos relacionados' },
  { id: 'step-8', n: '08', title: 'Publique seu artigo' },
];

export default function TutorialArtigos() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeStep, setActiveStep] = useState('step-1');
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    document.title = 'Como Criar Artigos — Conrad UFSJ';
    
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
    <div className="tutorial-page-wrapper">
      {/* Estilos para o tema escuro do site */}
      <style>{`
        :root {
          --navy: #151515;
          --navy-2: #0f0f0f;
          --paper: #090909;
          --ink: #e5e5e5;
          --ink-soft: #a3a3a3;
          --cyan: #e8a33d;
          --cyan-dim: #ca8a04;
          --amber: #e8a33d;
          --line: #222222;
          --line-dark: #2c2c2c;
        }

        .tutorial-page-wrapper {
          background: var(--paper);
          color: var(--ink);
          font-family: 'Inter', sans-serif;
          -webkit-font-smoothing: antialiased;
          min-height: 100vh;
        }

        .tutorial-page-wrapper a {
          color: inherit;
        }

        /* ---------- HERO ---------- */
        .tutorial-page-wrapper .hero {
          background:
            radial-gradient(circle at 85% -10%, rgba(232, 163, 61, 0.08), transparent 45%),
            linear-gradient(180deg, var(--navy) 0%, var(--navy-2) 100%);
          color: #EAF2F2;
          padding: 76px 8vw 90px;
          position: relative;
          overflow: hidden;
        }
        .tutorial-page-wrapper .hero::after {
          content: "";
          position: absolute;
          inset: 0;
          background-image:
            repeating-linear-gradient(90deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 64px);
          pointer-events: none;
        }
        .tutorial-page-wrapper .hero-tag {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--cyan);
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 22px;
        }
        .tutorial-page-wrapper .hero-tag .dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: var(--cyan);
          box-shadow: 0 0 10px 2px rgba(232, 163, 61, 0.7);
        }
        .tutorial-page-wrapper .hero h1 {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 600;
          font-size: clamp(34px, 4.4vw, 58px);
          line-height: 1.05;
          margin: 0 0 20px;
          max-width: 20ch;
          letter-spacing: -0.01em;
          color: #ffffff;
        }
        .tutorial-page-wrapper .hero p.lede {
          font-size: 17px;
          line-height: 1.6;
          max-width: 56ch;
          color: #B9C7D4;
          margin: 0 0 34px;
        }
        .tutorial-page-wrapper .hero-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 28px;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12.5px;
          color: #7E93A6;
          border-top: 1px solid var(--line-dark);
          padding-top: 20px;
        }
        .tutorial-page-wrapper .hero-meta strong {
          color: #CFE0E0;
          font-weight: 500;
        }
        .tutorial-page-wrapper .hero-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-top: 28px;
          padding: 11px 20px;
          background: rgba(232, 163, 61, 0.08);
          border: 1px solid var(--cyan-dim);
          border-radius: 3px;
          color: var(--cyan);
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          transition: background .2s ease, transform .2s ease;
        }
        .tutorial-page-wrapper .hero-link:hover {
          background: rgba(232, 163, 61, 0.15);
          transform: translateY(-1px);
        }

        /* ---------- LAYOUT ---------- */
        .tutorial-page-wrapper .wrap {
          display: grid;
          grid-template-columns: 260px 1fr;
          max-width: 1240px;
          margin: 0 auto;
          padding: 0 8vw;
          gap: 56px;
        }

        @media (max-width:900px) {
          .tutorial-page-wrapper .wrap {
            grid-template-columns: 1fr;
            padding: 0 6vw;
          }
          .tutorial-page-wrapper .hero {
            padding: 56px 6vw 70px;
          }
        }

        /* ---------- NAV ---------- */
        .tutorial-page-wrapper nav.steps-nav {
          position: sticky;
          top: 24px;
          align-self: start;
          padding-top: 46px;
          max-height: 100vh;
          overflow-y: auto;
        }
        .tutorial-page-wrapper nav.steps-nav .nav-label {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--ink-soft);
          margin-bottom: 14px;
          display: block;
        }
        .tutorial-page-wrapper nav.steps-nav ol {
          list-style: none;
          margin: 0;
          padding: 0;
          border-left: 1px solid var(--line);
        }
        .tutorial-page-wrapper nav.steps-nav li {
          margin: 0;
        }
        .tutorial-page-wrapper nav.steps-nav a {
          display: block;
          padding: 9px 0 9px 18px;
          margin-left: -1px;
          border-left: 2px solid transparent;
          text-decoration: none;
          font-size: 13.5px;
          color: var(--ink-soft);
          transition: color .15s ease, border-color .15s ease;
        }
        .tutorial-page-wrapper nav.steps-nav a:hover {
          color: var(--ink);
          border-left-color: var(--line);
        }
        .tutorial-page-wrapper nav.steps-nav a.active {
          color: var(--cyan);
          border-left-color: var(--cyan);
          font-weight: 600;
        }
        .tutorial-page-wrapper nav.steps-nav a .n {
          font-family: 'IBM Plex Mono', monospace;
          color: var(--cyan-dim);
          margin-right: 8px;
          font-size: 12px;
        }

        @media (max-width:900px) {
          .tutorial-page-wrapper nav.steps-nav {
            position: static;
            max-height: none;
            padding-top: 34px;
            overflow: visible;
          }
          .tutorial-page-wrapper nav.steps-nav ol {
            display: flex;
            flex-wrap: wrap;
            gap: 6px 4px;
            border-left: none;
          }
          .tutorial-page-wrapper nav.steps-nav a {
            border: 1px solid var(--line);
            border-radius: 20px;
            padding: 6px 14px;
            margin: 0;
          }
          .tutorial-page-wrapper nav.steps-nav a.active {
            border-color: var(--cyan);
            background: rgba(232, 163, 61, 0.08);
          }
        }

        /* ---------- MAIN ---------- */
        .tutorial-page-wrapper main {
          padding: 46px 0 100px;
          min-width: 0;
        }

        .tutorial-page-wrapper .intro-note {
          display: flex;
          gap: 16px;
          background: var(--navy);
          border: 1px solid var(--line);
          border-left: 3px solid var(--amber);
          border-radius: 4px;
          padding: 18px 22px;
          margin-bottom: 64px;
          font-size: 14.5px;
          line-height: 1.6;
          color: var(--ink-soft);
        }
        .tutorial-page-wrapper .intro-note b {
          color: var(--ink);
        }

        .tutorial-page-wrapper .step {
          padding-top: 44px;
          margin-top: 44px;
          border-top: 1px solid var(--line);
          scroll-margin-top: 24px;
        }
        .tutorial-page-wrapper .step:first-of-type {
          border-top: none;
          margin-top: 0;
        }

        .tutorial-page-wrapper .step-head {
          display: flex;
          align-items: baseline;
          gap: 18px;
          margin-bottom: 14px;
        }
        .tutorial-page-wrapper .step-num {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 13px;
          color: var(--cyan-dim);
          background: rgba(232, 163, 61, 0.08);
          border: 1px solid rgba(232, 163, 61, 0.3);
          border-radius: 3px;
          padding: 3px 9px;
          white-space: nowrap;
        }
        .tutorial-page-wrapper .step h2 {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 600;
          font-size: 24px;
          margin: 0;
          letter-spacing: -0.01em;
          color: #ffffff;
        }
        .tutorial-page-wrapper .step p.desc {
          font-size: 15.5px;
          line-height: 1.7;
          color: var(--ink-soft);
          max-width: 70ch;
          margin: 0 0 22px;
        }
        .tutorial-page-wrapper .step p.desc code {
          background: var(--navy);
          border: 1px solid var(--line);
          padding: 2px 6px;
          border-radius: 3px;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 13px;
          color: var(--cyan);
        }

        .tutorial-page-wrapper .tip {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          font-size: 13.5px;
          line-height: 1.6;
          color: var(--ink-soft);
          background: var(--navy);
          border-radius: 4px;
          padding: 10px 14px;
          margin-top: 16px;
          max-width: 70ch;
          border: 1px solid var(--line);
        }
        .tutorial-page-wrapper .tip .tip-tag {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10.5px;
          letter-spacing: 0.08em;
          color: var(--cyan-dim);
          font-weight: 600;
          flex-shrink: 0;
          margin-top: 1px;
        }

        /* ---------- VIEWER FRAME (simulated UI) ---------- */
        .tutorial-page-wrapper .viewer {
          position: relative;
          background: var(--navy-2);
          border-radius: 8px;
          padding: 14px;
          max-width: 760px;
          box-shadow: 0 14px 34px -18px rgba(0,0,0,0.8);
          border: 1px solid var(--line);
        }
        .tutorial-page-wrapper .viewer-bar {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 2px 6px 12px;
          border-bottom: 1px solid var(--line);
          margin-bottom: 14px;
        }
        .tutorial-page-wrapper .viewer-bar .b {
          width: 8px; height: 8px; border-radius: 50%;
          background: rgba(255,255,255,0.18);
        }
        .tutorial-page-wrapper .viewer-bar .tag {
          margin-left: auto;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.08em;
          color: #5F7A8F;
        }
        .tutorial-page-wrapper .viewer-frame {
          border-radius: 4px;
          background: #0d0d0d;
          padding: 16px;
          border: 1px solid var(--line-dark);
        }

        .tutorial-page-wrapper .mock-tabs {
          display: flex;
          gap: 12px;
          border-bottom: 1px solid var(--line);
          padding-bottom: 10px;
          margin-bottom: 16px;
        }
        .tutorial-page-wrapper .mock-tab {
          font-size: 13px;
          font-weight: bold;
          padding: 6px 16px;
          border-radius: 8px;
          color: var(--ink-soft);
          background: transparent;
        }
        .tutorial-page-wrapper .mock-tab.active {
          color: var(--cyan);
          background: rgba(232, 163, 61, 0.1);
          border: 1px solid rgba(232, 163, 61, 0.3);
        }

        .tutorial-page-wrapper .mock-button {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 12.5px;
          font-weight: 600;
          padding: 8px 16px;
          border-radius: 6px;
          background: #e8a33d;
          color: #000;
          border: none;
        }

        .tutorial-page-wrapper .mock-button-outline {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 12.5px;
          font-weight: 600;
          padding: 8px 16px;
          border-radius: 6px;
          background: transparent;
          color: var(--ink);
          border: 1px solid var(--line);
        }

        .tutorial-page-wrapper .mock-form-group {
          margin-bottom: 14px;
        }
        .tutorial-page-wrapper .mock-form-group label {
          display: block;
          font-size: 11px;
          text-transform: uppercase;
          font-weight: bold;
          color: var(--ink-soft);
          margin-bottom: 6px;
          letter-spacing: 0.05em;
        }
        .tutorial-page-wrapper .mock-input {
          width: 100%;
          padding: 10px;
          border-radius: 6px;
          background: #141414;
          border: 1px solid var(--line);
          color: var(--ink);
          font-size: 13px;
        }
        .tutorial-page-wrapper .mock-input:focus-within {
          border-color: var(--cyan);
        }
        .tutorial-page-wrapper .mock-select {
          width: 100%;
          padding: 10px;
          border-radius: 6px;
          background: #141414;
          border: 1px solid var(--line);
          color: var(--ink);
          font-size: 13px;
        }

        .tutorial-page-wrapper .mock-upload-box {
          border: 1px dashed var(--line);
          border-radius: 8px;
          padding: 24px;
          text-align: center;
          font-size: 12px;
          color: var(--ink-soft);
          background: #141414;
        }
        .tutorial-page-wrapper .mock-upload-box:hover {
          border-color: var(--cyan);
        }

        .tutorial-page-wrapper .mock-editor-toolbar {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          padding: 8px;
          background: #141414;
          border: 1px solid var(--line);
          border-top-left-radius: 8px;
          border-top-right-radius: 8px;
        }
        .tutorial-page-wrapper .mock-editor-btn {
          padding: 4px;
          border-radius: 4px;
          color: var(--ink-soft);
          background: transparent;
          border: none;
        }
        .tutorial-page-wrapper .mock-editor-btn.active {
          color: var(--cyan);
          background: rgba(232, 163, 61, 0.15);
        }
        .tutorial-page-wrapper .mock-editor-textarea {
          width: 100%;
          height: 120px;
          padding: 12px;
          border: 1px solid var(--line);
          border-top: none;
          border-bottom-left-radius: 8px;
          border-bottom-right-radius: 8px;
          background: #0c0c0c;
          color: var(--ink);
          font-size: 13px;
          font-family: inherit;
          resize: none;
        }

        .tutorial-page-wrapper .mock-case-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 6px;
          background: #141414;
          border: 1px solid var(--line);
          margin-bottom: 6px;
          font-size: 12.5px;
        }
        .tutorial-page-wrapper .mock-case-checkbox {
          width: 14px;
          height: 14px;
          border-radius: 4px;
          border: 1px solid var(--line);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .tutorial-page-wrapper .mock-case-checkbox.checked {
          background: var(--cyan);
          border-color: var(--cyan);
          color: #000;
        }

        .tutorial-page-wrapper .mock-toast {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 18px;
          border-radius: 8px;
          background: #1c1c1c;
          border: 1px solid var(--line);
          box-shadow: 0 10px 25px rgba(0,0,0,0.5);
          width: fit-content;
          margin: 10px auto 0;
        }

        .tutorial-page-wrapper .viewer.compact {
          max-width: 440px;
        }

        /* ---------- FOOTER ---------- */
        .tutorial-page-wrapper footer {
          border-top: 1px solid var(--line);
          padding: 34px 8vw 50px;
          max-width: 1240px;
          margin: 0 auto;
          font-size: 13px;
          color: var(--ink-soft);
          font-family: 'IBM Plex Mono', monospace;
          display: flex;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
        }
      `}</style>

      {/* Hero Section */}
      <div className="hero">
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-white/80 hover:text-white mb-6 border border-white/10 hover:bg-white/5" 
          onClick={() => navigate(user ? '/admin' : '/')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> {user ? 'Voltar ao Painel' : 'Voltar ao Início'}
        </Button>
        <div className="hero-tag"><span className="dot"></span>GUIA RÁPIDO · PLATAFORMA CONRAD UFSJ</div>
        <h1>Como criar artigos no site</h1>
        <p className="lede">Um guia passo a passo para redigir, formatar e publicar artigos científicos, notas de estudo ou relatos de caso no painel administrativo.</p>
        <a className="hero-link" href="https://conradufsj.app" target="_blank" rel="noopener noreferrer">↗ conradufsj.app</a>
        <div className="hero-meta">
          <span><strong>8 passos</strong> · leva ~8 min</span>
          <span><strong>Requisito</strong> · conta de professor/colaborador ativa</span>
        </div>
      </div>

      {/* Wrap Layout */}
      <div className="wrap">
        <nav className="steps-nav">
          <span className="nav-label">Etapas</span>
          <ol id="nav-list">
            {steps.map(step => (
              <li key={step.id}>
                <a 
                  href={`#${step.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToStep(step.id);
                  }}
                  className={activeStep === step.id ? 'active' : ''}
                >
                  <span className="n">{step.n}</span>
                  {step.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <main>
          <div className="intro-note">
            <div>💡</div>
            <div><b>Dica de publicação:</b> Os artigos são excelentes para complementar os casos clínicos. Você pode criar links diretos entre eles para facilitar a navegação e o aprendizado do aluno.</div>
          </div>

          <section className="step" id="step-1">
            <div className="step-head"><span className="step-num">PASSO 01</span><h2>Acesse a aba de Artigos</h2></div>
            <p className="desc">No menu principal do painel administrativo, clique na aba <b>Artigos</b> para abrir o gerenciador de artigos e publicações.</p>
            <div className="viewer">
              <div className="viewer-bar"><span className="b"></span><span className="b"></span><span className="b"></span><span className="tag">admin · abas</span></div>
              <div className="viewer-frame">
                <div className="mock-tabs">
                  <div className="mock-tab">Casos</div>
                  <div className="mock-tab active">Artigos</div>
                  <div className="mock-tab">Configurações</div>
                </div>
                <div className="h-20 bg-muted/5 border border-dashed border-border rounded flex items-center justify-center text-xs text-muted-foreground">
                  Painel de Artigos
                </div>
              </div>
            </div>
          </section>

          <section className="step" id="step-2">
            <div className="step-head"><span className="step-num">PASSO 02</span><h2>Clique em "Novo Artigo"</h2></div>
            <p className="desc">No cabeçalho do gerenciador de artigos, clique no botão <b>Novo Artigo</b> para abrir o editor de escrita em tela cheia.</p>
            <div className="viewer compact">
              <div className="viewer-bar"><span className="b"></span><span className="b"></span><span className="b"></span><span className="tag">admin · novo</span></div>
              <div className="viewer-frame flex justify-between items-center">
                <div className="relative w-40">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <div className="pl-8 h-8 rounded border border-border bg-[#141414] text-[10px] flex items-center text-muted-foreground">Pesquisar...</div>
                </div>
                <div className="mock-button">
                  <Plus className="w-3.5 h-3.5" /> Novo Artigo
                </div>
              </div>
            </div>
          </section>

          <section className="step" id="step-3">
            <div className="step-head"><span className="step-num">PASSO 03</span><h2>Preencha o cabeçalho</h2></div>
            <p className="desc">No formulário de cabeçalho (coluna da esquerda), insira o título da publicação, o nome do autor principal e selecione a modalidade do exame/categoria.</p>
            <div className="viewer compact">
              <div className="viewer-bar"><span className="b"></span><span className="b"></span><span className="b"></span><span className="tag">editor · cabeçalho</span></div>
              <div className="viewer-frame space-y-3">
                <div className="mock-form-group">
                  <label>Título do Artigo *</label>
                  <div className="mock-input">Aspectos Radiológicos da Pneumonia Lobar</div>
                </div>
                <div className="mock-form-group">
                  <label>Autor *</label>
                  <div className="mock-input">Dr. Rogério Oliveira</div>
                </div>
                <div className="mock-form-group">
                  <label>Categoria (Exame) *</label>
                  <div className="mock-select">RX</div>
                </div>
              </div>
            </div>
          </section>

          <section className="step" id="step-4">
            <div className="step-head"><span className="step-num">PASSO 04</span><h2>Adicione a imagem de capa</h2></div>
            <p className="desc">Selecione uma imagem representativa para servir de capa. Esta imagem será exibida nos cards de listagem e no início do artigo.</p>
            <div className="viewer compact">
              <div className="viewer-bar"><span className="b"></span><span className="b"></span><span className="b"></span><span className="tag">editor · capa</span></div>
              <div className="viewer-frame">
                <div className="mock-upload-box">
                  <Image className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                  <span>Upload de imagem de capa</span>
                </div>
              </div>
            </div>
          </section>

          <section className="step" id="step-5">
            <div className="step-head"><span className="step-num">PASSO 05</span><h2>Escreva o conteúdo</h2></div>
            <p className="desc">No workspace do editor (coluna principal), comece a redigir o seu artigo. O editor suporta salvamento local dinâmico enquanto você escreve.</p>
            <div className="viewer">
              <div className="viewer-bar"><span className="b"></span><span className="b"></span><span className="b"></span><span className="tag">editor · corpo</span></div>
              <div className="viewer-frame">
                <div className="mock-editor-toolbar">
                  <button className="mock-editor-btn active"><Bold className="w-3.5 h-3.5" /></button>
                  <button className="mock-editor-btn"><Italic className="w-3.5 h-3.5" /></button>
                  <button className="mock-editor-btn"><Heading1 className="w-3.5 h-3.5" /></button>
                  <button className="mock-editor-btn"><Heading2 className="w-3.5 h-3.5" /></button>
                  <button className="mock-editor-btn"><Quote className="w-3.5 h-3.5" /></button>
                </div>
                <div className="mock-editor-textarea">
                  A pneumonia lobar é uma forma clássica de pneumonia bacteriana, caracterizada pela consolidação homogênea de um lobo pulmonar inteiro...
                </div>
              </div>
            </div>
          </section>

          <section className="step" id="step-6">
            <div className="step-head"><span className="step-num">PASSO 06</span><h2>Formate e adicione mídias</h2></div>
            <p className="desc">Use os atalhos da barra de ferramentas para inserir links e imagens no corpo do texto. O editor permite redimensionar as imagens inseridas para melhor enquadramento.</p>
            <div className="viewer compact">
              <div className="viewer-bar"><span className="b"></span><span className="b"></span><span className="b"></span><span className="tag">editor · inserir</span></div>
              <div className="viewer-frame flex gap-3 justify-center">
                <div className="mock-button-outline">
                  <Link className="w-3.5 h-3.5" /> Inserir Link
                </div>
                <div className="mock-button-outline">
                  <Image className="w-3.5 h-3.5" /> Upload de Imagem
                </div>
              </div>
            </div>
          </section>

          <section className="step" id="step-7">
            <div className="step-head"><span className="step-num">PASSO 07</span><h2>Vincule casos relacionados</h2></div>
            <p className="desc">Na coluna da esquerda, localize a área de "Casos Relacionados" e selecione os casos radiológicos que possuem associação direta com o tema abordado no artigo.</p>
            <div className="viewer compact">
              <div className="viewer-bar"><span className="b"></span><span className="b"></span><span className="b"></span><span className="tag">editor · vínculos</span></div>
              <div className="viewer-frame">
                <div className="mock-case-item">
                  <div className="mock-case-checkbox checked"><Check className="w-3 h-3 text-black" /></div>
                  <span>#102 - RX - Pneumotórax Esquerdo</span>
                </div>
                <div className="mock-case-item">
                  <div className="mock-case-checkbox"></div>
                  <span>#104 - TC - Pneumonia Lobar Direita</span>
                </div>
              </div>
            </div>
          </section>

          <section className="step" id="step-8">
            <div className="step-head"><span className="step-num">PASSO 08</span><h2>Publique seu artigo</h2></div>
            <p className="desc">Com todas as informações preenchidas, clique em <b>Publicar Artigo</b> (no rodapé inferior) para finalizar o processo.</p>
            <div className="viewer compact">
              <div className="viewer-bar"><span className="b"></span><span className="b"></span><span className="b"></span><span className="tag">editor · salvar</span></div>
              <div className="viewer-frame text-center space-y-4">
                <div className="mock-button justify-center w-full">
                  <Save className="w-4 h-4" /> Publicar Artigo
                </div>
                <div className="mock-toast">
                  <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-black text-[10px] font-bold">✓</div>
                  <span className="text-xs font-semibold">Artigo publicado com sucesso!</span>
                </div>
              </div>
            </div>
            <div className="tip"><span className="tip-tag">NOTA</span><span>Se sua conta for de colaborador (perfil de membro), o artigo será enviado para revisão dos administradores antes de ficar visível na plataforma principal.</span></div>
          </section>
        </main>
      </div>

      {/* Footer */}
      <footer>
        <span>Conrad UFSJ © {new Date().getFullYear()}</span>
        <span>Como Adicionar Artigos ao Site</span>
      </footer>
    </div>
  );
}
