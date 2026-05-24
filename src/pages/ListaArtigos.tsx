import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/Navbar';
import { Search, Calendar, User, ArrowLeft, Filter, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';

const ListaArtigos = () => {
  const { categoria } = useParams();
  
  const [selectedCategory, setSelectedCategory] = useState(categoria ? categoria.toLowerCase() : 'todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortByDate, setSortByDate] = useState('desc');
  const [artigos, setArtigos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Busca artigos do Supabase ao abrir a página ou trocar a categoria
  useEffect(() => {
    const fetchArtigos = async () => {
      setLoading(true);
      
      // Apenas exibe na galeria pública artigos previamente aprovados pelo admin
      let query = supabase.from('articles').select('*').eq('status', 'approved');
      
      if (selectedCategory !== 'todos') {
        query = query.eq('categoria', selectedCategory);
      }

      const { data, error } = await query;
      
      if (!error && data) {
        setArtigos(data);
      }
      setLoading(false);
    };

    fetchArtigos();
  }, [selectedCategory]);

  // Filtra por pesquisa e ordena por data
  const artigosFiltrados = artigos
    .filter(a => a.titulo.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      const dateA = new Date(a.data_publicacao).getTime();
      const dateB = new Date(b.data_publicacao).getTime();
      return sortByDate === 'desc' ? dateB - dateA : dateA - dateB;
    });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl font-bold mb-8 text-foreground uppercase tracking-tight">
              {selectedCategory === 'todos' ? 'Todos os Artigos' : `Artigos sobre ${selectedCategory}`}
            </h1>

            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-8 bg-card p-4 rounded-2xl border border-border/60 shadow-sm flex-wrap">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input 
                  placeholder="Pesquisar artigos por título..." 
                  className="pl-10 h-12 w-full bg-background"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              {/* Filtro de Categoria */}
              <div className="flex items-center md:w-56">
                <select 
                  className="h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="todos">Todas as Modalidades</option>
                  <option value="rx">Raio-X (RX)</option>
                  <option value="tc">Tomografia (TC)</option>
                  <option value="usg">Ultrassom (USG)</option>
                  <option value="rm">Ressonância Magnética (RM)</option>
                </select>
              </div>

              {/* Ordenar por Data */}
              <div className="flex items-center md:w-48">
                <Filter className="w-5 h-5 text-muted-foreground mr-2 hidden md:block" />
                <select 
                  className="h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={sortByDate}
                  onChange={(e) => setSortByDate(e.target.value)}
                >
                  <option value="desc">Mais Recentes</option>
                  <option value="asc">Mais Antigos</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : artigosFiltrados.length > 0 ? (
              <div className="grid gap-6">
                {artigosFiltrados.map((artigo) => (
                  <Link key={artigo.id} to={`/artigo/${artigo.id}`}>
                    <div className="flex flex-col sm:flex-row gap-6 p-4 sm:p-6 rounded-2xl bg-card border border-border/60 shadow-sm hover:shadow-md hover:border-primary/50 hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden group">
                      <div className="w-full sm:w-48 h-48 sm:h-36 flex-shrink-0 overflow-hidden rounded-xl bg-muted relative">
                        {artigo.imagem_capa ? (
                          <img src={artigo.imagem_capa} alt={artigo.titulo} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-secondary text-muted-foreground text-xs uppercase">{artigo.categoria}</div>
                        )}
                        <div className="absolute top-2 left-2 sm:hidden bg-background/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold uppercase tracking-wider text-primary border border-primary/20">{artigo.categoria}</div>
                      </div>
                      <div className="flex-1 flex flex-col justify-between py-1">
                        <div>
                          <div className="hidden sm:inline-block mb-2 px-2 py-0.5 rounded bg-primary/10 text-xs font-bold uppercase tracking-wider text-primary border border-primary/20">{artigo.categoria}</div>
                          <h2 className="text-xl sm:text-2xl font-bold mb-2 text-foreground group-hover:text-primary transition-colors">{artigo.titulo}</h2>
                          {/* Renderiza uma prévia do conteúdo já que agora não temos o campo 'desc' (opcional) */}
                          <p className="text-muted-foreground text-sm line-clamp-2">{artigo.conteudo.replace(/<[^>]*>?/gm, '').substring(0, 150)}...</p>
                        </div>
                        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border/50 text-xs text-muted-foreground font-medium">
                          <span className="flex items-center gap-1.5"><User className="w-4 h-4" /> {artigo.autor}</span>
                          <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {new Date(artigo.data_publicacao).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 rounded-2xl border border-dashed border-border">
                <p className="text-muted-foreground text-lg">Nenhum artigo encontrado com estes filtros.</p>
              </div>
            )}
            
            <div className="mt-12 text-center sm:text-left">
              <Link to="/" className="inline-flex items-center gap-2 text-primary font-semibold hover:underline">
                <ArrowLeft className="w-4 h-4" /> Voltar para a Galeria
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default ListaArtigos;