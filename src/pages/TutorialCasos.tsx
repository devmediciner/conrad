import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const steps = [
  { id: 'step-1', n: '01', title: 'Acesse o site' },
  { id: 'step-2', n: '02', title: 'Clique em Login' },
  { id: 'step-3', n: '03', title: 'Faça o login' },
  { id: 'step-4', n: '04', title: 'Clique em "Novo Caso"' },
  { id: 'step-5', n: '05', title: 'Preencha as informações gerais' },
  { id: 'step-6', n: '06', title: 'Selecione o diagnóstico' },
  { id: 'step-7', n: '07', title: 'Adicione as imagens do caso' },
  { id: 'step-8', n: '08', title: 'Preencha o caso clínico' },
  { id: 'step-9', n: '09', title: 'Preencha o laudo radiológico' },
  { id: 'step-10', n: '10', title: 'Adicione comentários' },
  { id: 'step-11', n: '11', title: 'Ative o quiz' },
];

export default function TutorialCasos() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState('step-1');
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    document.title = 'Como Adicionar Casos ao Site — Conrad UFSJ';

    // Configura o intersection observer para marcar a etapa ativa na barra lateral
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
      {/* Estilos originais adaptados para o tema escuro do site */}
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
          min-height: 100-screen;
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
          font-family: 'Space Grotesk', 'Fraunces', serif;
          font-weight: 600;
          font-size: clamp(34px, 4.4vw, 58px);
          line-height: 1.05;
          margin: 0 0 20px;
          max-width: 25ch;
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
          margin-bottom: 30px;
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
          font-family: 'Space Grotesk', 'Fraunces', serif;
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

        /* ---------- VIEWER FRAME (signature element) ---------- */
        .tutorial-page-wrapper .viewer {
          position: relative;
          background: var(--navy-2);
          border-radius: 8px;
          padding: 10px;
          max-width: 760px;
          box-shadow: 0 14px 34px -18px rgba(0,0,0,0.8);
          border: 1px solid var(--line);
        }
        .tutorial-page-wrapper .viewer-bar {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 2px 6px 10px;
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
          position: relative;
          border-radius: 4px;
          overflow: hidden;
          line-height: 0;
          background: #0A1420;
        }
        .tutorial-page-wrapper .viewer-frame img {
          display: block;
          width: 100%;
          height: auto;
        }
        .tutorial-page-wrapper .viewer-frame .corner {
          position: absolute;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 9.5px;
          color: var(--cyan);
          opacity: 0.85;
          letter-spacing: 0.04em;
        }
        .tutorial-page-wrapper .viewer-frame .corner.tl {
          top: 8px; left: 10px;
        }
        .tutorial-page-wrapper .viewer-frame .corner.br {
          bottom: 8px; right: 10px;
        }

        .tutorial-page-wrapper .viewer.compact {
          max-width: 420px;
        }

        /* image example grid for step 7 */
        .tutorial-page-wrapper .example-grid-2x2 {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          max-width: 760px;
          margin-top: 12px;
          margin-bottom: 24px;
        }
        .tutorial-page-wrapper .example-card {
          border: 1px solid var(--line);
          border-radius: 6px;
          overflow: hidden;
          background: var(--navy);
        }
        .tutorial-page-wrapper .example-card img {
          display: block;
          width: 100%;
          height: auto;
        }
        .tutorial-page-wrapper .example-card .cap {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10.5px;
          letter-spacing: 0.04em;
          color: var(--ink-soft);
          padding: 7px 10px;
          border-top: 1px solid var(--line);
        }

        .tutorial-page-wrapper .icone-caso,
        .tutorial-page-wrapper .icone-detalhadas {
          margin-top: 16px;
          max-width: 320px;
        }
        .tutorial-page-wrapper .icone-caso img,
        .tutorial-page-wrapper .icone-detalhadas img {
          border-radius: 6px;
          border: 1px solid var(--line);
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

        @media (max-width:900px) {
          .tutorial-page-wrapper .example-grid-2x2 {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }
          .tutorial-page-wrapper .example-card img {
            max-height: 180px;
            width: auto;
            margin: 0 auto;
          }
        }
      `}</style>

      {/* Hero Section */}
      <div className="hero">
        <Button
          variant="ghost"
          size="sm"
          className="text-white/80 hover:text-white mb-6 border border-white/10 hover:bg-white/5"
          onClick={() => navigate('/admin')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Painel
        </Button>
        <div className="hero-tag"><span className="dot"></span>GUIA RÁPIDO</div>
        <h1>Como adicionar casos ao site</h1>
        <div className="hero-meta">
          <span><strong>11 passos</strong> · leva ~10 min</span>
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
            <div><b>Antes de começar:</b> tenha em mãos as imagens do exame, o diagnóstico definido e um breve histórico clínico do paciente. Isso deixa o cadastro bem mais rápido.</div>
          </div>
          <div className="tip"><span className="tip-tag">NOTA</span><span>Se sua conta for de colaborador (perfil de membro), o caso será enviado para revisão dos administradores antes de ficar visível na plataforma principal.</span></div>

          <section className="step" id="step-1">
            <div className="step-head"><span className="step-num">PASSO 01</span><h2>Acesse o site</h2></div>
            <p className="desc">Abra o navegador e acesse <code>https://conradufsj.app</code>. Nenhuma instalação é necessária, todo o cadastro é feito pelo navegador.</p>
          </section>

          <section className="step" id="step-2">
            <div className="step-head"><span className="step-num">PASSO 02</span><h2>Clique em Login</h2></div>
            <p className="desc">No canto superior direito da página inicial, clique em <b>Login</b> para acessar o painel de cadastro de casos.</p>
            <div className="viewer">
              <div className="viewer-bar"><span className="b"></span><span className="b"></span><span className="b"></span><span className="tag">conradufsj.app</span></div>
              <div className="viewer-frame">
                <img src="/tutorial/step_img_1.png" alt="Página inicial com botão de Login em destaque" />
              </div>
            </div>
          </section>

          <section className="step" id="step-3">
            <div className="step-head"><span className="step-num">PASSO 03</span><h2>Faça o login</h2></div>
            <p className="desc">Digite seu login e confirme para entrar no painel.</p>
            <div className="viewer compact">
              <div className="viewer-bar"><span className="b"></span><span className="b"></span><span className="b"></span><span className="tag">auth</span></div>
              <div className="viewer-frame">
                <img src="/tutorial/step_img_2.png" alt="Tela de login" />
              </div>
            </div>
          </section>

          <section className="step" id="step-4">
            <div className="step-head"><span className="step-num">PASSO 04</span><h2>Clique em "Novo Caso"</h2></div>
            <p className="desc">Já logado, localize e clique no botão <b>Novo Caso</b> para iniciar o cadastro.</p>
            <div className="viewer">
              <div className="viewer-bar"><span className="b"></span><span className="b"></span><span className="b"></span><span className="tag">painel</span></div>
              <div className="viewer-frame">
                <img src="/tutorial/step_img_3.png" alt="Botão Novo Caso no painel" />
              </div>
            </div>
          </section>

          <section className="step" id="step-5">
            <div className="step-head"><span className="step-num">PASSO 05</span><h2>Preencha as informações gerais</h2></div>
            <p className="desc">Informe os dados básicos do caso: título, idade e sexo do paciente, modalidade do exame e demais campos gerais solicitados.</p>
            <div className="viewer compact">
              <div className="viewer-bar"><span className="b"></span><span className="b"></span><span className="b"></span><span className="tag">novo-caso · geral</span></div>
              <div className="viewer-frame">
                <img src="/tutorial/step_img_4.png" alt="Formulário de informações gerais do caso" />
              </div>
            </div>
          </section>

          <section className="step" id="step-6">
            <div className="step-head"><span className="step-num">PASSO 06</span><h2>Selecione o diagnóstico</h2></div>
            <p className="desc">Busque o diagnóstico do caso na lista. Se ele ainda não existir na base, clique em <b>Cadastrar</b> para criá-lo antes de continuar.</p>
            <div className="viewer compact">
              <div className="viewer-bar"><span className="b"></span><span className="b"></span><span className="b"></span><span className="tag">diagnóstico</span></div>
              <div className="viewer-frame">
                <img src="/tutorial/step_img_5.png" alt="Seleção de diagnóstico" />
              </div>
            </div>
            <div className="tip"><span className="tip-tag">DICA</span><span>Cadastrar o diagnóstico corretamente facilita a busca do caso depois, verifique se ele já existe antes de criar um novo.</span></div>
          </section>

          <section className="step" id="step-7">
            <div className="step-head"><span className="step-num">PASSO 07</span><h2>Adicione as imagens do caso</h2></div>
            <p className="desc">
              Há dois campos. O primeiro campo é destinado às imagens do caso (você pode enviar várias imagens, como PA, perfil e outras incidências). O segundo é para imagens explicativas, anotadas ou coloridas pelo próprio usuário, destacando os principais achados, como nos exemplos abaixo.
            </p>
            <div className="example-grid-2x2">
              {/* Par 01 */}
              <div className="example-card">
                <img src="/tutorial/step_img_7.jpeg" alt="Exemplo de imagem do caso" />
                <div className="cap">IMAGEM CASO 1</div>
              </div>
              <div className="example-card">
                <img src="/tutorial/step_img_8.jpeg" alt="Exemplo de imagem detalhada" />
                <div className="cap">IMAGEM DETALHADA 1</div>
              </div>

              {/* Par 02 */}
              <div className="example-card">
                <img src="/tutorial/step_img_9.jpeg" alt="Exemplo de imagem do caso" />
                <div className="cap">IMAGEM CASO 2</div>
              </div>
              <div className="example-card">
                <img src="/tutorial/step_img_11.jpeg" alt="Exemplo de imagem detalhada" />
                <div className="cap">IMAGEM DETALHADA 2</div>
              </div>

              {/* Par 03 */}
              <div className="example-card">
                <img src="/tutorial/step_img_12.jpeg" alt="Exemplo de imagem do caso" />
                <div className="cap">IMAGEM CASO 3</div>
              </div>
              <div className="example-card">
                <img src="/tutorial/step_img_13.jpeg" alt="Exemplo de imagem detalhada" />
                <div className="cap">IMAGEM DETALHADA 3</div>
              </div>
            </div>
          </section>

          <section className="step" id="step-8">
            <div className="step-head"><span className="step-num">PASSO 08</span><h2>Preencha o caso clínico</h2></div>
            <p className="desc">Descreva o histórico clínico do paciente: queixa principal, evolução e dados relevantes para o raciocínio diagnóstico.</p>
            <div className="viewer">
              <div className="viewer-bar"><span className="b"></span><span className="b"></span><span className="b"></span><span className="tag">caso-clínico</span></div>
              <div className="viewer-frame">
                <img src="/tutorial/step_img_14.png" alt="Campo de caso clínico" />
              </div>
            </div>
          </section>

          <section className="step" id="step-9">
            <div className="step-head"><span className="step-num">PASSO 09</span><h2>Preencha o laudo radiológico</h2></div>
            <p className="desc">Escreva o laudo com os achados de imagem e a impressão diagnóstica, como em um laudo real.</p>
            <div className="viewer">
              <div className="viewer-bar"><span className="b"></span><span className="b"></span><span className="b"></span><span className="tag">laudo</span></div>
              <div className="viewer-frame">
                <img src="/tutorial/step_img_15.png" alt="Campo de laudo radiológico" />
              </div>
            </div>
          </section>

          <section className="step" id="step-10">
            <div className="step-head"><span className="step-num">PASSO 10</span><h2>Adicione comentários</h2></div>
            <p className="desc">Inclua comentários que ajudem quem for estudar o caso a chegar ao diagnóstico — pontos de atenção, sinais característicos, diagnósticos diferenciais.</p>
            <div className="viewer">
              <div className="viewer-bar"><span className="b"></span><span className="b"></span><span className="b"></span><span className="tag">comentários</span></div>
              <div className="viewer-frame">
                <img src="/tutorial/step_img_16.png" alt="Campo de comentários" />
              </div>
            </div>
          </section>

          <section className="step" id="step-11">
            <div className="step-head"><span className="step-num">PASSO 11</span><h2>Ative o quiz</h2></div>
            <p className="desc">Marque a opção de ativar o quiz e cadastre <b>3 dicas</b> que ajudem no diagnóstico — por exemplo, sinais, sintomas ou dados de epidemiologia.</p>
            <div className="viewer">
              <div className="viewer-bar"><span className="b"></span><span className="b"></span><span className="b"></span><span className="tag">quiz</span></div>
              <div className="viewer-frame">
                <img src="/tutorial/step_img_17.png" alt="Ativação do quiz com dicas" />
              </div>
            </div>
            <div className="tip"><span className="tip-tag">DICA</span><span>Boas dicas guiam o raciocínio sem entregar o diagnóstico — pense nelas como pistas, não como respostas.</span></div>
          </section>

        </main>
      </div>

      {/* Footer */}
      <footer>
        <span>Conrad UFSJ © {new Date().getFullYear()}</span>
        <span>Como Adicionar Casos ao Site</span>
      </footer>
    </div>
  );
}
