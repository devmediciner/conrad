import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Instagram, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LeagueMembers } from '@/components/LeagueMembers';
import logo from '@/assets/logo.png';

const Sobre = () => {
  useEffect(() => {
    document.title = 'Sobre a CONRAD | CONRAD';
    return () => {
      document.title = 'GALERIA - CONRAD';
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="mb-8">
          <Link to="/">
            <Button variant="ghost" size="sm" className="mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
            </Button>
          </Link>

          {/* Hero com logo + título */}
          <div className="flex items-center gap-6 mb-10">
            <div className="w-28 h-28 rounded-full overflow-hidden flex-shrink-0 bg-muted">
              <img src={logo} alt="Logo da CONRAD" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="inline-block text-xs bg-primary/10 text-primary px-3 py-1 rounded-md mb-2">
                UFSJ — Campus CCO
              </span>
              <h1 className="font-heading text-3xl font-bold text-foreground">CONRAD</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Liga Acadêmica de Radiologia e Diagnóstico por Imagem
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-10 text-foreground leading-relaxed">

          {/* Sobre a liga */}
          <section className="space-y-3">
            <h2 className="font-heading text-xl font-semibold text-primary flex items-center gap-2">
              <span className="w-1 h-5 bg-primary rounded-full inline-block" />
              Sobre a liga
            </h2>
            <p className="text-sm text-muted-foreground">
              A CONRAD foi fundada em <strong className="text-foreground">2018</strong> com o objetivo de complementar a
              formação em radiologia dos estudantes de medicina da Universidade Federal de São João del-Rei. Desde então,
              a liga tem sido um espaço de aprendizado ativo, promovendo o contato precoce com o diagnóstico por imagem
              de forma estruturada e dinâmica.
            </p>
            <p className="text-sm text-muted-foreground">
              As atividades são voltadas tanto para membros internos quanto para a comunidade acadêmica em geral,
              sempre com foco em aprofundamento técnico e prático.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {['Aulas internas', 'Aulas abertas', 'Aulas práticas', 'Grupos de discussão (GDs)', 'Temas variados em diagnóstico por imagem'].map(tag => (
                <span key={tag} className="text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground border border-border">
                  {tag}
                </span>
              ))}
            </div>
          </section>


          {/* Informações da Liga */}
          <section className="space-y-3">
            <h2 className="font-heading text-xl font-semibold text-primary flex items-center gap-2">
              <span className="w-1 h-5 bg-primary rounded-full inline-block" />
              Informações
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: 'Fundação da Liga', value: '2018' },
                { label: 'Instituição de Origem', value: 'UFSJ — Campus CCO (Divinópolis/MG)' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-muted/50 rounded-xl p-4 border border-border/40">
                  <p className="text-xs text-muted-foreground mb-1">{label}</p>
                  <p className="text-sm font-semibold text-foreground">{value}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Contato & Redes Sociais */}
          <section className="space-y-3">
            <h2 className="font-heading text-xl font-semibold text-primary flex items-center gap-2">
              <span className="w-1 h-5 bg-primary rounded-full inline-block" />
              Redes Sociais & Contato
            </h2>
            <p className="text-sm text-muted-foreground">
              Acompanhe nossas discussões acadêmicas ou envie dúvidas/sugestões diretamente para a liga:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a
                href="https://www.instagram.com/conradufsj/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/50 hover:shadow-md transition-all group"
              >
                <Instagram className="w-5 h-5 text-pink-500 group-hover:scale-110 transition-transform duration-300" />
                <div>
                  <p className="text-xs text-muted-foreground">Instagram</p>
                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">@conradufsj</p>
                </div>
              </a>
              <a
                href="mailto:conradufsj@gmail.com"
                className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/50 hover:shadow-md transition-all group"
              >
                <Mail className="w-5 h-5 text-blue-500 group-hover:scale-110 transition-transform duration-300" />
                <div>
                  <p className="text-xs text-muted-foreground">E-mail de Contato</p>
                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">conradufsj@gmail.com</p>
                </div>
              </a>
            </div>
          </section>
        </div>

        {/* League Members Section */}
        <div className="mt-12 -mx-4 sm:-mx-8">
          <LeagueMembers />
        </div>

        <div className="mt-12 pt-6 border-t border-border text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Liga Acadêmica de Radiologia — UFSJ CCO
        </div>
      </div>
    </div>
  );
};

export default Sobre;