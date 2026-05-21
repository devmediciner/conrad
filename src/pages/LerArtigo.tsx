import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, User, Loader2 } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { supabase } from '@/integrations/supabase/client';

export default function LerArtigo() {
  const { id } = useParams();
  const [artigo, setArtigo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArtigo = async () => {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) {
        setArtigo(data);
      }
      setLoading(false);
    };

    if (id) fetchArtigo();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!artigo) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4">
        <h1 className="text-3xl font-bold text-foreground">Artigo não encontrado</h1>
        <Link to="/" className="text-primary hover:underline">Voltar para a Página Inicial</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <article className="pt-28 pb-20 px-4">
        <div className="container mx-auto max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Link to={`/artigos/${artigo.categoria}`} className="inline-flex items-center gap-2 text-sm text-primary font-semibold hover:underline mb-8">
              <ArrowLeft className="w-4 h-4" /> Voltar para {artigo.categoria.toUpperCase()}
            </Link>

            {/* Cabeçalho do Artigo */}
            <div className="mb-8 space-y-4">
              <div className="inline-block px-3 py-1 rounded bg-primary/10 text-xs font-bold uppercase tracking-wider text-primary border border-primary/20">
                Categoria: {artigo.categoria}
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-foreground tracking-tight leading-tight">
                {artigo.titulo}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground font-medium pt-2">
                <span className="flex items-center gap-2"><User className="w-4 h-4" /> {artigo.autor}</span>
                <span className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {new Date(artigo.data_publicacao).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>

            {/* Imagem de Capa */}
            {artigo.imagem_capa && (
              <div className="w-full h-64 sm:h-96 rounded-2xl overflow-hidden mb-10 border border-border/50 shadow-sm">
                <img src={artigo.imagem_capa} alt={artigo.titulo} className="w-full h-full object-cover" />
              </div>
            )}

            {/* Conteúdo Renderizado */}
            <div className="prose prose-neutral dark:prose-invert max-w-none text-foreground/90 text-lg leading-relaxed whitespace-pre-wrap">
              {artigo.conteudo}
            </div>
          </motion.div>
        </div>
      </article>
    </div>
  );
}