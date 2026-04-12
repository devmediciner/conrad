import { useState } from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/Navbar';
import { FiltersBar } from '@/components/FiltersBar';
import { CaseCard } from '@/components/CaseCard';
import { CaseModal } from '@/components/CaseModal';
import { useCases } from '@/hooks/useCases';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Activity, Search } from 'lucide-react';
import type { Case } from '@/types/case';
import heroImage from '@/assets/hero-radiology.jpg';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const [search, setSearch] = useState('');
  const [examType, setExamType] = useState('all');
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const navigate = useNavigate();

  const { data: cases, isLoading } = useCases({ search, examType });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero*/}
      <section className="relative pt-16 pb-12">
        <div className="absolute inset-0 overflow-hidden">
          <img src={heroImage} alt="" width={1920} height={640} className="w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
        </div>
        <div className="relative container mx-auto px-4 text-center space-y-2 py-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="flex justify-center mb-2"
          >
            
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl md:text-6xl font-bold tracking-tight"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            <span className="text-foreground">Galeria</span>{' '}
            <span className="text-foreground">Radiológica</span>{' - '}
            <span className="text-gold-gradient">CONRAD</span>
          </motion.h1>
         
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col items-center pt-8 gap-8"
          >
            <div className="flex justify-center gap-3 w-full max-w-2xl px-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-muted-foreground/30 self-center" />
              <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-widest text-center px-2">
                Acervo de casos da Liga Acadêmica de Radiologia — UFSJ
              </span>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-muted-foreground/30 self-center" />
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full sm:w-auto px-4">
              <Button 
                variant="default" 
                size="lg" 
                className="w-full sm:w-auto gap-2 rounded-full h-14 px-8 text-base font-semibold shadow-[0_0_20px_-5px_hsl(var(--primary))] hover:shadow-[0_0_25px_-5px_hsl(var(--primary))] transition-all" 
                onClick={() => navigate('/game')}
              >
                <Activity className="w-5 h-5" /> 
                Jogar Quiz
              </Button>
              
              <Button 
                variant="outline" 
                size="lg" 
                className="w-full sm:w-auto gap-2 rounded-full h-14 px-8 text-base font-medium bg-background/50 backdrop-blur-md border-border hover:bg-muted" 
                onClick={() => document.getElementById('galeria')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <Search className="w-5 h-5" /> 
                Explorar Acervo
              </Button>
            </div>
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
          ) : cases && cases.length > 0 ? (
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
          )}
        </div>
      </section>

      {/* Contact section */}
      <section id="contato" className="px-4 py-16 border-t border-border">
        <div className="container mx-auto max-w-2xl text-center space-y-4">
          <h2 className="font-heading text-2xl font-bold text-foreground">Contato</h2>
          <p className="text-muted-foreground">
            E-mail:{' '}
            <a href="mailto:conradufsj@gmail.com" className="text-primary hover:underline">
              conradufsj@gmail.com
            </a>
          </p>
          <p className="text-muted-foreground">
            Instagram:{' '}
            <a href="https://www.instagram.com/conradufsj/" className="text-primary hover:underline">
              @conradufsj
            </a>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-4 py-6">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Liga Acadêmica de Radiologia — UFSJ CCO
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
