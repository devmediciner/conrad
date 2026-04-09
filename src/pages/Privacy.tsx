import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="mb-8">
          <Link to="/">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
            </Button>
          </Link>
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="font-heading text-3xl font-bold text-foreground">Política de Privacidade</h1>
          </div>
          <p className="text-muted-foreground text-sm">Última atualização: Abril de 2026</p>
        </div>

        <div className="space-y-8 text-foreground leading-relaxed">
          <section className="space-y-3">
            <h2 className="font-heading text-xl font-semibold text-primary">1. Introdução</h2>
            <p className="text-sm text-muted-foreground">
              A <strong className="text-foreground">Galeria Radiológica</strong> é um projeto acadêmico da Liga de Radiologia da 
              Universidade Federal de São João del-Rei (UFSJ) — Campus Centro-Oeste Dona Lindu (CCO), destinado exclusivamente 
              ao ensino e à pesquisa em radiologia médica. Esta política descreve como tratamos os dados e imagens 
              disponibilizados na plataforma.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-xl font-semibold text-primary">2. Anonimização Total dos Dados</h2>
            <p className="text-sm text-muted-foreground">
              Todos os casos clínicos e imagens publicados na Galeria Radiológica são <strong className="text-foreground">completamente anonimizados</strong>. 
              Nenhuma informação que permita a identificação direta ou indireta do paciente é armazenada, exibida ou 
              compartilhada na plataforma.
            </p>
            <div className="bg-card border border-border rounded-xl p-4 space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Fundamentação Legal:</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex gap-2">
                  <span className="text-primary font-mono text-xs mt-0.5">LGPD</span>
                  <span><strong className="text-foreground">Art. 5º, XI</strong> — Define anonimização como a utilização de meios técnicos razoáveis para que um dado perca, de forma irreversível, a possibilidade de associação a um indivíduo.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-mono text-xs mt-0.5">LGPD</span>
                  <span><strong className="text-foreground">Art. 12</strong> — Dados anonimizados não são considerados dados pessoais para os fins desta Lei, salvo quando o processo de anonimização puder ser revertido.</span>
                </li>
              </ul>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-xl font-semibold text-primary">3. Dados Sensíveis de Saúde</h2>
            <p className="text-sm text-muted-foreground">
              Reconhecemos que dados relacionados à saúde são classificados como <strong className="text-foreground">dados pessoais sensíveis</strong> pela 
              legislação brasileira. Por isso, adotamos o processo de anonimização como medida fundamental para 
              garantir que nenhum dado sensível identificável seja tratado na plataforma.
            </p>
            <div className="bg-card border border-border rounded-xl p-4 space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Fundamentação Legal:</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex gap-2">
                  <span className="text-primary font-mono text-xs mt-0.5">LGPD</span>
                  <span><strong className="text-foreground">Art. 11</strong> — O tratamento de dados pessoais sensíveis somente poderá ocorrer nas hipóteses previstas em lei, incluindo para fins de estudo por órgão de pesquisa, garantida a anonimização.</span>
                </li>
              </ul>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-xl font-semibold text-primary">4. Ética Médica e Sigilo Profissional</h2>
            <p className="text-sm text-muted-foreground">
              A utilização de imagens radiológicas para fins de ensino é amparada pelo Código de Ética Médica, desde 
              que preservado o anonimato do paciente e respeitados os princípios de sigilo profissional.
            </p>
            <div className="bg-card border border-border rounded-xl p-4 space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Fundamentação Ética (CFM):</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex gap-2">
                  <span className="text-primary font-mono text-xs mt-0.5">CFM</span>
                  <span><strong className="text-foreground">Art. 73</strong> — É vedado ao médico revelar fato de que tenha conhecimento em virtude do exercício de sua profissão, salvo por motivo justo, dever legal ou consentimento do paciente.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-mono text-xs mt-0.5">CFM</span>
                  <span><strong className="text-foreground">Art. 75</strong> — É vedado fazer referência a casos clínicos identificáveis, exibir pacientes ou imagens que os tornem reconhecíveis em anúncios profissionais ou na divulgação de assuntos médicos.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-mono text-xs mt-0.5">CFM</span>
                  <span><strong className="text-foreground">Art. 85</strong> — É permitida a utilização de imagens para fins didáticos, desde que o paciente ou responsável legal autorize e que a anonimização seja garantida.</span>
                </li>
              </ul>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-xl font-semibold text-primary">5. Finalidade Exclusivamente Acadêmica</h2>
            <p className="text-sm text-muted-foreground">
              Todo o conteúdo disponível na Galeria Radiológica tem finalidade <strong className="text-foreground">exclusivamente educacional e acadêmica</strong>. 
              As imagens e casos clínicos são utilizados para apoiar o aprendizado de estudantes de medicina e 
              profissionais de saúde, sem qualquer objetivo comercial.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-xl font-semibold text-primary">6. Medidas de Segurança</h2>
            <p className="text-sm text-muted-foreground">
              Adotamos medidas técnicas e organizacionais adequadas para proteger os dados armazenados na plataforma, incluindo:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Criptografia em trânsito e em repouso</li>
              <li>Controle de acesso baseado em funções (RBAC)</li>
              <li>Revisão e aprovação de casos antes da publicação</li>
              <li>Remoção de metadados DICOM identificáveis antes do upload</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-xl font-semibold text-primary">7. Contato</h2>
            <p className="text-sm text-muted-foreground">
              Para dúvidas sobre esta política de privacidade ou sobre o tratamento de dados na plataforma, 
              entre em contato pelo e-mail:{' '}
              <a href="mailto:conradufsj@gmail.com" className="text-primary hover:underline">
                conradufsj@gmail.com
              </a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-border text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Liga Acadêmica de Radiologia — UFSJ CCO
        </div>
      </div>
    </div>
  );
};

export default Privacy;
