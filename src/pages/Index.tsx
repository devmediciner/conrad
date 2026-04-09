import { useState } from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/Navbar';
import { FiltersBar } from '@/components/FiltersBar';
import { CaseCard } from '@/components/CaseCard';
import { CaseModal } from '@/components/CaseModal';
import { SubmitCaseModal } from '@/components/SubmitCaseModal';
import { useCases } from '@/hooks/useCases';
import { Skeleton } from '@/components/ui/skeleton';
import type { Case } from '@/types/case';
import heroImage from '@/assets/hero-radiology.jpg';
import logo from '@/assets/logo.png';

const Index = () => {
  const [search, setSearch] = useState('');
  const [examType, setExamType] = useState('all');
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [submitOpen, setSubmitOpen] = useState(false);

  const { data: cases, isLoading } = useCases({ search, examType });

  return (
    <div className="min-h-screen bg-background">
      <Navbar onSubmitClick={() => setSubmitOpen(true)} />

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
            className="flex justify-center gap-3 pt-2"
          >
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-primary/50 self-center" />
            <span className="text-xs text-muted-foreground uppercase tracking-widest">Acervo de casos radiológicos da Liga Acadêmica de Radiologia — UFSJ Campus CCO</span>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-primary/50 self-center" />
          </motion.div>
        </div>
      </section>

      {/* Filters */}
      <section className="px-4 pb-8">
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
      <SubmitCaseModal open={submitOpen} onOpenChange={setSubmitOpen} />
    </div>
  );
};

export default Index;
