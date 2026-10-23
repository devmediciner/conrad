import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search, BookOpen, Layers, Sparkles, ArrowRight, Clock,
  CheckCircle2, Brain, Activity, Compass, Shield, Stethoscope,
  Filter
} from 'lucide-react';

export interface ExamCardItem {
  id: string;
  title: string;
  modality: 'TC' | 'RM';
  modalityLabel: string;
  status: 'available' | 'coming_soon';
  sliceCount: string;
  thickness: string;
  structuresCount: string;
  description: string;
  image: string;
  tags: string[];
  gradient: string;
  highlights: string[];
}

const EXAMS_CATALOG: ExamCardItem[] = [
  {
    id: 'abdome',
    title: 'TC de Abdome e Pelve',
    modality: 'TC',
    modalityLabel: 'Tomografia Computadorizada',
    status: 'available',
    sliceCount: '331 Cortes (Triplanar)',
    thickness: '5.0mm • MPR',
    structuresCount: '62 Estruturas Individuais',
    description: 'Atlas tomográfico triplanar (Axial, Coronal e Sagital) em alta definição. Mapeamento detalhado de 62 estruturas anatômicas: vértebras de T6 a S1 individualizadas, órgãos viscerais, pelve, musculatura e grandes vasos.',
    image: '/slices/axial/colored/slice_045.webp',
    tags: ['Abdome', 'Atlas Anatômico', 'MPR Triplanar', '62 Estruturas'],
    gradient: 'from-amber-500/20 via-rose-500/10 to-transparent',
    highlights: ['Reconstrução Triplanar (Axial, Coronal, Sagital)', '62 Estruturas Anatômicas (T6 a S1, Pelve, Músculos)', 'Janelamento Dinâmico e Cores Ajustáveis'],
  },
  {
    id: 'cranio',
    title: 'TC de Crânio e Encéfalo',
    modality: 'TC',
    modalityLabel: 'Tomografia Computadorizada',
    status: 'coming_soon',
    sliceCount: '90+ Cortes',
    thickness: '2.5mm',
    structuresCount: 'Em Mapeamento',
    description: 'Janelas de parênquima cerebral e óssea. Estudo dos lobos cerebrais, sistema ventricular, núcleos da base, tronco encefálico e fossa posterior.',
    image: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&w=800&q=80',
    tags: ['Neuro', 'Crânio', 'Ventrículos', 'Trauma'],
    gradient: 'from-blue-500/20 via-indigo-500/10 to-transparent',
    highlights: ['Janela Óssea e de Parênquima', 'Espaços Liquóricos', 'Tronco e Cerebelo'],
  },
  {
    id: 'torax',
    title: 'TC de Tórax e Mediastino',
    modality: 'TC',
    modalityLabel: 'Tomografia Computadorizada',
    status: 'coming_soon',
    sliceCount: '120+ Cortes',
    thickness: '1.25mm',
    structuresCount: 'Em Mapeamento',
    description: 'Anatomia segmentar dos pulmões, fissuras pleurais, mediastino anterior, médio e posterior, vasos da base e silhueta cardíaca.',
    image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80',
    tags: ['Tórax', 'Pulmões', 'Mediastino', 'Coração'],
    gradient: 'from-emerald-500/20 via-teal-500/10 to-transparent',
    highlights: ['Segmentação Broncopulmonar', 'Grandes Vasos', 'Janela Pulmonar'],
  },
  {
    id: 'coluna-lombar',
    title: 'RM de Coluna Lombar',
    modality: 'RM',
    modalityLabel: 'Ressonância Magnética',
    status: 'coming_soon',
    sliceCount: 'Planos Axial/Sagital',
    thickness: '3.0mm',
    structuresCount: 'Em Mapeamento',
    description: 'Ressonância em sequências T1 e T2 ponderadas: discos intervertebrais, cone medular, saco dural, raízes da cauda equina e forames neurais.',
    image: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=80',
    tags: ['Coluna', 'Ressonância', 'Discos', 'Neuro'],
    gradient: 'from-purple-500/20 via-violet-500/10 to-transparent',
    highlights: ['Sequências T1 e T2', 'Cone Medular', 'Forames e Facetas'],
  },
  {
    id: 'rm-cranio',
    title: 'RM de Encéfalo (Neuroanatomia)',
    modality: 'RM',
    modalityLabel: 'Ressonância Magnética',
    status: 'coming_soon',
    sliceCount: 'Planos Tridimensionais',
    thickness: '1.0mm',
    structuresCount: 'Em Mapeamento',
    description: 'Atlas avançado de neuroanatomia em alta resolução: córtex cerebral, substância branca, núcleos profundos, hipocampo e vascularização arterial.',
    image: 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?auto=format&fit=crop&w=800&q=80',
    tags: ['Neuroanatomia', 'Córtex', 'T1 / T2 / FLAIR'],
    gradient: 'from-cyan-500/20 via-blue-500/10 to-transparent',
    highlights: ['Córtex e Giros', 'Hipocampo e Amígdala', 'Sequência 3D T1'],
  },
  {
    id: 'pelve-quadril',
    title: 'TC de Pelve e Articulações',
    modality: 'TC',
    modalityLabel: 'Tomografia Computadorizada',
    status: 'coming_soon',
    sliceCount: 'Reconstruções 3D',
    thickness: '2.0mm',
    structuresCount: 'Em Mapeamento',
    description: 'Anatomia musculoesquelética: anel pélvico, articulações coxofemorais, sacroilíacas, musculatura glútea e trato iliopélvico.',
    image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80',
    tags: ['Musculoesquelético', 'Quadril', 'Pelve'],
    gradient: 'from-amber-500/20 via-orange-500/10 to-transparent',
    highlights: ['Articulação Coxofemoral', 'Pelve Óssea', 'Grupos Musculares'],
  },
];

interface ConrademiaHubProps {
  onSelectExam?: (examId: string) => void;
}

export function ConrademiaHub({ onSelectExam }: ConrademiaHubProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModality, setFilterModality] = useState<'all' | 'TC' | 'RM'>('all');

  const filteredExams = EXAMS_CATALOG.filter((exam) => {
    const matchesSearch =
      exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exam.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exam.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesModality = filterModality === 'all' || exam.modality === filterModality;

    return matchesSearch && matchesModality;
  });

  const handleOpenExam = (exam: ExamCardItem) => {
    if (exam.status === 'available') {
      if (onSelectExam) {
        onSelectExam(exam.id);
      } else {
        navigate(`/conrademia/${exam.id}`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-primary">
      {/* Navbar Global */}
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-28 pb-16 px-4 overflow-hidden border-b border-border/40 bg-gradient-to-b from-background via-surface/40 to-background">
        {/* Ambient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-10 right-10 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="container mx-auto max-w-6xl relative z-10 text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs font-semibold mb-6 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Atlas de Anatomia Radiológica Interativa</span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight font-heading mb-5"
          >
            Conrad<span className="text-primary">emia</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-8"
          >
            Explore exames tomográficos e ressonâncias em alta definição. 
            Cortes axiais com segmentações anatômicas em cores, pontinhos de referência e legendas interativas para o aprendizado médico.
          </motion.p>

          {/* Search & Modality Filters */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-2xl mx-auto"
          >
            {/* Search Box */}
            <div className="relative w-full flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar exame, estrutura ou órgão (ex: abdome, crânio, fígado)..."
                className="pl-10 h-11 bg-surface/90 border-border/80 rounded-xl text-sm focus:border-primary shadow-sm"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-1.5 p-1 bg-surface/90 border border-border/80 rounded-xl shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilterModality('all')}
                className={`h-9 px-3 text-xs rounded-lg ${
                  filterModality === 'all' ? 'bg-primary text-primary-foreground font-semibold shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Todos
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilterModality('TC')}
                className={`h-9 px-3 text-xs rounded-lg ${
                  filterModality === 'TC' ? 'bg-primary text-primary-foreground font-semibold shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Tomografia (TC)
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilterModality('RM')}
                className={`h-9 px-3 text-xs rounded-lg ${
                  filterModality === 'RM' ? 'bg-primary text-primary-foreground font-semibold shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Ressonância (RM)
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Grid of Exams Section */}
      <section className="flex-1 container mx-auto max-w-6xl px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold font-heading">Catálogo de Exames</h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Selecione um exame anatômico para abrir o visualizador interativo
            </p>
          </div>
          <span className="text-xs font-mono text-muted-foreground bg-surface/80 border border-border/60 px-3 py-1 rounded-full">
            {filteredExams.length} {filteredExams.length === 1 ? 'exame encontrado' : 'exames encontrados'}
          </span>
        </div>

        {/* The Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExams.map((exam, idx) => {
            const isAvailable = exam.status === 'available';

            return (
              <motion.div
                key={exam.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                onClick={() => isAvailable && handleOpenExam(exam)}
                className={`group relative flex flex-col rounded-2xl border overflow-hidden transition-all duration-300 ${
                  isAvailable
                    ? 'bg-surface/90 border-border/80 hover:border-primary/60 hover:shadow-xl hover:shadow-primary/5 cursor-pointer hover:-translate-y-1'
                    : 'bg-surface/40 border-border/40 opacity-80 cursor-default'
                }`}
              >
                {/* Card Banner Image */}
                <div className="relative h-48 w-full overflow-hidden bg-slate-950">
                  <img
                    src={exam.image}
                    alt={exam.title}
                    className={`w-full h-full object-cover transition-transform duration-500 ${
                      isAvailable ? 'group-hover:scale-105' : 'grayscale contrast-125'
                    }`}
                  />
                  <div className={`absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent ${exam.gradient}`} />

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                    {/* Modality Tag */}
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider uppercase bg-black/75 backdrop-blur-md text-white border border-white/10 shadow-sm">
                      {exam.modality}
                    </span>

                    {/* Status Badge */}
                    {isAvailable ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 backdrop-blur-md shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Disponível
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30 backdrop-blur-md shadow-sm">
                        <Clock className="w-3 h-3" />
                        Em Breve
                      </span>
                    )}
                  </div>

                  {/* Bottom Stats inside image */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] text-white/80 font-mono pointer-events-none">
                    <span className="bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm border border-white/5">
                      {exam.sliceCount}
                    </span>
                    <span className="bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm border border-white/5">
                      {exam.thickness}
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    {/* Title */}
                    <h3 className={`text-lg font-bold font-heading mb-1.5 transition-colors ${
                      isAvailable ? 'text-foreground group-hover:text-primary' : 'text-foreground/80'
                    }`}>
                      {exam.title}
                    </h3>

                    {/* Subtitle / Structures */}
                    <p className="text-xs font-semibold text-primary/90 mb-2.5">
                      {exam.structuresCount}
                    </p>

                    {/* Description */}
                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed mb-3">
                      {exam.description}
                    </p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5">
                      {exam.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-background border border-border/60 text-muted-foreground"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="pt-3 border-t border-border/50">
                    {isAvailable ? (
                      <Button
                        className="w-full h-10 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl flex items-center justify-center gap-2 group-hover:shadow-md transition-all"
                      >
                        <span>Abrir Atlas Interativo</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        disabled
                        className="w-full h-10 text-xs text-muted-foreground/70 bg-surface/60 border border-border/40 rounded-xl flex items-center justify-center gap-1.5 cursor-not-allowed"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Em preparação pela equipe</span>
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 bg-surface/30 text-center text-xs text-muted-foreground">
        <p>Conrademia • Atlas de Anatomia Radiológica da Liga de Radiologia — UFSJ CCO</p>
        <p className="mt-1 text-[11px] text-muted-foreground/60">
          Imagens e dados didáticos para fins de aprendizado acadêmico.
        </p>
      </footer>
    </div>
  );
}
