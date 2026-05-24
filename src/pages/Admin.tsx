import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/authContent';
import { useAllCases, useDeleteCase } from '@/hooks/useCases';
import { EXAM_TYPE_COLORS } from '@/types/case';
import { Trash2, ArrowLeft, Loader2, Pencil, Plus, Gamepad2, List, FileText, ImagePlus, Save, X, Bold, Italic, Link2, CheckCircle, Settings, Users, UserPlus, Check, XCircle, Heading, ListOrdered, TextQuote, Eye, Edit, Palette } from 'lucide-react';
import { toast } from 'sonner';
import { EditCaseModal } from '@/components/EditCaseModal';
import { SubmitCaseModal } from '@/components/SubmitCaseModal';
import { DiseaseModal } from '@/components/DiseaseModal';
import { useDiseases, useDeleteDisease } from '@/hooks/useGame';
import type { Case } from '@/types/case';

// Importe seu client do Supabase (Ajuste o caminho se a sua configuração estiver em outro local)
import { supabase } from '@/integrations/supabase/client'; 
import { createClient } from '@supabase/supabase-js'; // ← Adicione esta importação
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const Admin = () => {
  const { user, isAdmin, loading: authLoading } = useAuth(); // Certifique-se de que o useAuth retorne o 'user' logado
  const { data: cases, isLoading } = useAllCases();
  const deleteCase = useDeleteCase();
  const navigate = useNavigate();
  const [editingCase, setEditingCase] = useState<Case | null>(null);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [diseaseModalOpen, setDiseaseModalOpen] = useState(false);
  const [articleModalOpen, setArticleModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<any>(null);
  
  const [activeTab, setActiveTab] = useState<'casos' | 'minigame' | 'artigos' | 'aprovacao' | 'config'>('casos');
  const [articles, setArticles] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // Força um refetch ao postar artigo novo
  
  // Estados para criação de usuário
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('user');

  useEffect(() => {
    const fetchArticles = async () => {
      setLoadingArticles(true);
      // Busca todos os artigos. Filtraremos por status na renderização.
      const { data } = await supabase.from('articles').select('*').order('created_at', { ascending: false });
      if (data) setArticles(data);
      setLoadingArticles(false);
      
      if (isAdmin) {
        const { data: roles } = await supabase.from('user_roles').select('*');
        if (roles) setUsers(roles);
      }
    };
    fetchArticles();
  }, [activeTab, refreshKey]);

  const { data: diseases, isLoading: loadingDiseases } = useDiseases();
  const deleteDisease = useDeleteDisease();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) { // Se não houver ninguém logado
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-foreground font-heading text-xl">Acesso restrito</p>
          <p className="text-muted-foreground text-sm">Você não tem permissão para acessar esta página.</p>
          <Button variant="outline" onClick={() => navigate('/')}>Voltar</Button>
        </div>
      </div>
    );
  }

  // Filtra as listas baseadas no status (usando o padrão em inglês do seu BD)
  const approvedCases = cases?.filter(c => c.status === 'approved') ?? [];
  const pendingCases = cases?.filter(c => c.status === 'pending') ?? [];
  
  // Mostra todos os casos para todos os usuários logados
  const displayCases = cases ?? [];

  const approvedArticles = articles.filter(a => a.status === 'approved');
  const pendingArticles = articles.filter(a => a.status === 'pending');

  // Função mockada para criar usuário na tabela profiles
  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserPassword) return toast.error('Preencha email e senha.');
    if (newUserPassword.length < 6) return toast.error('A senha deve ter pelo menos 6 caracteres.');

    try {
      // Criamos um cliente temporário que NÃO salva a sessão. 
      // Isso impede que o Admin atual seja deslogado ao criar a nova conta.
      const supabaseUrl = (supabase as any).supabaseUrl || import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = (supabase as any).supabaseKey || import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        return toast.error('Erro interno: Chaves de API do Supabase não encontradas.');
      }

      const tempSupabase = createClient(
        supabaseUrl,
        supabaseKey,
        { auth: { persistSession: false } }
      );

      const { data, error } = await tempSupabase.auth.signUp({
        email: newUserEmail,
        password: newUserPassword,
      });
      if (error) throw error;
      
      if (data.user) {
        // Insere na tabela correta do seu banco de dados (user_roles)
        await supabase.from('user_roles').insert({ 
          user_id: data.user.id, 
          email: newUserEmail, 
          role: newUserRole 
        });
      }
      
      toast.success('Usuário criado com sucesso!');
      setNewUserEmail('');
      setNewUserPassword('');
      setRefreshKey(prev => prev + 1);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao criar usuário.');
    }
  };

  const handleApproveArticle = async (id: number) => {
    await supabase.from('articles').update({ status: 'approved' }).eq('id', id);
    toast.success('Artigo aprovado!');
    setRefreshKey(prev => prev + 1);
  };
  
  const handleRejectArticle = async (id: number) => {
    await supabase.from('articles').delete().eq('id', id);
    toast.success('Artigo recusado e removido.');
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-heading text-2xl font-bold text-foreground">{isAdmin ? 'Painel Admin' : 'Área do Membro'}</h1>
          </div>
        </div>

        {/* Abas Superiores */}
        <div className="flex overflow-x-auto space-x-4 mb-8 border-b border-border">
          {[
            { id: 'casos', label: 'Casos' },
            { id: 'minigame', label: 'Minigame' },
            { id: 'artigos', label: 'Artigos' },
            // Abas restritas a administradores
            ...(isAdmin ? [
              { id: 'aprovacao', label: 'Aprovação' },
              { id: 'config', label: 'Configurações' },
            ] : []),
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 px-2 text-sm font-semibold transition-colors border-b-2 whitespace-nowrap ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="pb-20">
          {/* CONTEÚDO: ABA CASOS */}
          {activeTab === 'casos' && (
            <div className="space-y-4 max-w-4xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold font-heading text-foreground">Casos (Todos)</h2>
                <Button variant="default" className="gap-2" onClick={() => setSubmitOpen(true)}>
                  <Plus className="w-4 h-4" /> Novo Caso
                </Button>
              </div>
              {isLoading ? (
                <p className="text-muted-foreground">Carregando...</p>
              ) : displayCases.length === 0 ? (
                <p className="text-muted-foreground text-center py-12 bg-card border border-border rounded-xl shadow-sm">Nenhum caso encontrado.</p>
              ) : (
                <div className="space-y-3">
                  {displayCases.map(c => {
                    const badgeClass = EXAM_TYPE_COLORS[c.exam_type as keyof typeof EXAM_TYPE_COLORS] ?? '';
                    return (
                      <div key={c.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                          {c.images?.[0] ? (
                            <img src={c.images[0]} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">—</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${badgeClass}`}>{c.exam_type}</span>
                            {c.status === 'pending' && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold uppercase tracking-wider">Em Análise</span>
                            )}
                            {c.status === 'approved' && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold uppercase tracking-wider">Aprovado</span>
                            )}
                          </div>
                          <p className="text-sm text-foreground truncate font-semibold">
                            <span className="font-mono text-muted-foreground mr-1">#{c.case_number}</span>
                            {c.clinical_case}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">{c.age} anos • {c.sex}</p>
                        </div>
                        {isAdmin && (
                          <div className="flex gap-1 flex-shrink-0">
                            <Button variant="ghost" size="icon" onClick={() => setEditingCase(c)} className="text-muted-foreground hover:text-primary"><Pencil className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => { deleteCase.mutate(c.id); toast.success('Caso excluído'); }} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* CONTEÚDO: ABA MINIGAME */}
          {activeTab === 'minigame' && (
            <div className="space-y-4 max-w-2xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold font-heading text-foreground">Doenças do Minigame</h2>
                {isAdmin && (
                  <Button variant="outline" className="gap-2" onClick={() => setDiseaseModalOpen(true)}>
                    <Plus className="w-4 h-4" /> Nova Doença
                  </Button>
                )}
              </div>
              <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
                  {loadingDiseases ? (
                    <p className="text-sm text-center text-muted-foreground py-4">Carregando...</p>
                  ) : diseases?.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-10">Nenhuma doença cadastrada.</div>
                  ) : (
                    <div className="space-y-2">
                      {diseases?.map(d => (
                        <div key={d.id} className="flex items-center justify-between bg-muted/30 px-3 py-2 rounded-lg border border-border">
                          <span className="text-sm text-foreground font-medium">{d.name}</span>
                          {isAdmin && (
                            <Button variant="ghost" size="icon" onClick={() => deleteDisease.mutate(d.id)} className="text-muted-foreground hover:text-destructive h-8 w-8">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            </div>
          )}

          {/* CONTEÚDO: ABA ARTIGOS */}
          {activeTab === 'artigos' && (
            <div className="space-y-4 max-w-4xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold font-heading text-foreground">Artigos (Todos)</h2>
                <Button variant="secondary" className="gap-2" onClick={() => { setEditingArticle(null); setArticleModalOpen(true); }}>
                  <FileText className="w-4 h-4" /> Novo Artigo
                </Button>
              </div>
              {loadingArticles ? (
                <p className="text-muted-foreground py-4">Carregando artigos...</p>
              ) : articles.length === 0 ? (
                <div className="text-center py-12 bg-card border border-dashed border-border rounded-xl shadow-sm"><p className="text-muted-foreground">Nenhum artigo encontrado.</p></div>
              ) : (
                <div className="space-y-3">
                  {articles.map(artigo => (
                    <div key={artigo.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                        {artigo.imagem_capa ? <img src={artigo.imagem_capa} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs uppercase bg-muted">{artigo.categoria}</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 uppercase font-bold tracking-wider">{artigo.categoria}</span>
                          {artigo.status === 'pending' && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase font-bold tracking-wider">Em Análise</span>
                          )}
                          {artigo.status === 'approved' && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase font-bold tracking-wider">Aprovado</span>
                          )}
                        </div>
                        <p className="text-sm text-foreground truncate font-semibold">{artigo.titulo}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{artigo.autor} • {new Date(artigo.data_publicacao).toLocaleDateString('pt-BR')}</p>
                      </div>
                      {isAdmin && (
                        <div className="flex gap-1 flex-shrink-0">
                          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" onClick={() => { setEditingArticle(artigo); setArticleModalOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={async () => {
                            if (confirm('Deseja excluir este artigo permanentemente?')) {
                              await handleRejectArticle(artigo.id);
                            }
                          }}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CONTEÚDO: ABA APROVAÇÃO */}
          {activeTab === 'aprovacao' && (
            <div className="space-y-4 max-w-4xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold font-heading text-foreground">Pendentes de Aprovação</h2>
              </div>
              
              {(pendingArticles.length === 0 && pendingCases.length === 0) ? (
                <div className="text-center py-16 bg-card border border-dashed border-border rounded-xl shadow-sm">
                  <CheckCircle className="w-10 h-10 mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground font-medium">Tudo certo por aqui!</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">Nenhum caso ou artigo pendente no momento.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Renderizando Artigos Pendentes */}
                  {pendingArticles.map(a => (
                    <div key={a.id} className="bg-card border-l-4 border-l-amber-500 border-border p-4 rounded-xl shadow-sm flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase font-bold tracking-wider">Artigo</span>
                          <span className="text-[10px] uppercase font-bold text-muted-foreground">{a.categoria}</span>
                        </div>
                        <p className="text-sm text-foreground font-semibold">{a.titulo}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Enviado por: {a.autor}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="icon" variant="secondary" onClick={() => { setEditingArticle(a); setArticleModalOpen(true); }} title="Editar / Visualizar"><Pencil className="w-4 h-4" /></Button>
                        <Button size="icon" onClick={() => handleApproveArticle(a.id)} className="bg-emerald-500 hover:bg-emerald-600 text-white"><Check className="w-4 h-4" /></Button>
                        <Button size="icon" onClick={() => handleRejectArticle(a.id)} variant="destructive"><XCircle className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  ))}
                  
                  {/* Renderizando Casos Pendentes */}
                  {pendingCases.map(c => (
                    <div key={c.id} className="bg-card border-l-4 border-l-blue-500 border-border p-4 rounded-xl shadow-sm flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 uppercase font-bold tracking-wider">Caso</span>
                          <span className="text-[10px] uppercase font-bold text-muted-foreground">{c.exam_type}</span>
                        </div>
                        <p className="text-sm text-foreground font-semibold">{c.clinical_case}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="icon" variant="secondary" onClick={() => setEditingCase(c)} title="Editar / Visualizar"><Pencil className="w-4 h-4" /></Button>
                        <Button size="icon" onClick={async () => {
                          await supabase.from('cases').update({ status: 'approved' }).eq('id', c.id);
                          toast.success('Caso aprovado! (Atualize a página para refleti-lo)');
                        }} className="bg-emerald-500 hover:bg-emerald-600 text-white"><Check className="w-4 h-4" /></Button>
                        <Button size="icon" onClick={() => deleteCase.mutate(c.id)} variant="destructive"><XCircle className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CONTEÚDO: ABA CONFIGURAÇÕES */}
          {activeTab === 'config' && (
            <div className="space-y-4 max-w-2xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold font-heading text-foreground">Gerenciar Usuários</h2>
              </div>
              
              {/* Formulário de Criação de Usuários */}
              <div className="bg-card border border-border p-5 rounded-xl shadow-sm space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2"><UserPlus className="w-4 h-4 text-primary" /> Novo Usuário</h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <Input placeholder="Email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} className="sm:col-span-2" />
                  <Input type="password" placeholder="Senha" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} />
                  <select className="border border-input rounded-md px-2 text-sm bg-background" value={newUserRole} onChange={e => setNewUserRole(e.target.value)}>
                    <option value="user">Usuário Comum</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                <Button className="w-full sm:w-auto" onClick={handleCreateUser}>Criar Conta</Button>
              </div>

              {/* Lista de Usuários */}
              <div className="bg-card border border-border p-5 rounded-xl shadow-sm space-y-3 mt-6">
                <h3 className="text-sm font-semibold flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Usuários Cadastrados</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {users.length === 0 ? <p className="text-xs text-muted-foreground text-center py-4">Nenhum perfil carregado.</p> : users.map(u => (
                    <div key={u.id} className="flex items-center justify-between p-3 bg-background border border-border rounded-lg">
                      <span className="text-sm">{u.email}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider ${u.role === 'admin' ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-muted text-muted-foreground border border-border'}`}>
                        {u.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <EditCaseModal
        caseData={editingCase}
        open={!!editingCase}
        onOpenChange={(o) => !o && setEditingCase(null)}
      />
      <SubmitCaseModal open={submitOpen} onOpenChange={setSubmitOpen} />
      <DiseaseModal open={diseaseModalOpen} onOpenChange={setDiseaseModalOpen} />
      <ArticleModal open={articleModalOpen} onOpenChange={setArticleModalOpen} isAdmin={isAdmin} onSuccess={() => setRefreshKey(prev => prev + 1)} articleToEdit={editingArticle} cases={approvedCases} />
    </div>
  );
};

/* --- Modal de Adição/Edição de Artigo Interno --- */
const ArticleModal = ({ open, onOpenChange, isAdmin, onSuccess, articleToEdit, cases }: { open: boolean; onOpenChange: (open: boolean) => void; isAdmin: boolean; onSuccess: () => void; articleToEdit?: any; cases?: any[] }) => {
  // Estados para o formulário
  const [titulo, setTitulo] = useState('');
  const [categoria, setCategoria] = useState('rx');
  const [autor, setAutor] = useState('');
  const [dataPub, setDataPub] = useState('');
  const [imagemUrl, setImagemUrl] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [relatedCases, setRelatedCases] = useState<string[]>([]);
  const [caseToAdd, setCaseToAdd] = useState('none');
  
  const [isUploading, setIsUploading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingContentImg, setIsUploadingContentImg] = useState(false);
  const quillRef = useRef<ReactQuill>(null);

  // Preenche os dados do modal quando abrir para editar
  useEffect(() => {
    if (open) {
      if (articleToEdit) {
        setTitulo(articleToEdit.titulo || '');
        setCategoria(articleToEdit.categoria || 'rx');
        setAutor(articleToEdit.autor || '');
        setDataPub(articleToEdit.data_publicacao ? articleToEdit.data_publicacao.split('T')[0] : '');
        setImagemUrl(articleToEdit.imagem_capa || '');
        setConteudo(articleToEdit.conteudo || '');
        setRelatedCases(articleToEdit.related_cases_ids || []);
        setCaseToAdd('none');
      } else {
        setTitulo('');
        setCategoria('rx');
        setAutor('');
        setDataPub('');
        setImagemUrl('');
        setConteudo('');
        setRelatedCases([]);
        setCaseToAdd('none');
      }
    }
  }, [open, articleToEdit]);

  // Adiciona o caso à lista de casos relacionados do artigo
  const handleAddCase = () => {
    if (caseToAdd !== 'none' && !relatedCases.includes(caseToAdd)) {
      setRelatedCases([...relatedCases, caseToAdd]);
    }
    setCaseToAdd('none');
  };

  // Upload de imagem do PC diretamente para o corpo do texto (Rich Text)
  const imageHandler = useCallback(() => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      if (input.files && input.files[0]) {
        const file = input.files[0];
        setIsUploadingContentImg(true);
        try {
          const fileExt = file.name.split('.').pop();
          const fileName = `content-${Math.random()}.${fileExt}`;
          const filePath = `articles/${fileName}`;

          const { error: uploadError } = await supabase.storage.from('images').upload(filePath, file);
          if (uploadError) throw uploadError;

          const { data } = supabase.storage.from('images').getPublicUrl(filePath);
          const quill = quillRef.current?.getEditor();
          if (quill) {
            const range = quill.getSelection(true);
            quill.insertEmbed(range.index, 'image', data.publicUrl);
          }
          toast.success('Imagem inserida no artigo!');
        } catch (error) {
          console.error(error);
          toast.error('Erro ao enviar imagem para o texto.');
        } finally {
          setIsUploadingContentImg(false);
        }
      }
    };
  }, []);

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike', 'blockquote'],
        [{'list': 'ordered'}, {'list': 'bullet'}],
        ['link', 'image'],
        [{ 'color': [] }, { 'background': [] }],
        ['clean']
      ],
      handlers: { image: imageHandler }
    }
  }), [imageHandler]);

  // Lida com o Upload de imagem para o Supabase Storage
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;
      setIsUploading(true);
      
      // Crie um bucket chamado 'images' no supabase ou altere o nome abaixo para o seu bucket
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `articles/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('images').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('images').getPublicUrl(filePath);
      setImagemUrl(data.publicUrl);
      toast.success('Imagem carregada com sucesso!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao fazer upload da imagem.');
    } finally {
      setIsUploading(false);
    }
  };

  // Lida com a Publicação do Artigo no Banco de Dados Supabase
  const handlePublish = async () => {
    if (!titulo || !conteudo) {
      toast.error('Título e conteúdo são obrigatórios.');
      return;
    }
    try {
      setIsPublishing(true);
      
      if (articleToEdit) {
        // Modo de Edição
        const { error } = await supabase.from('articles').update({
          titulo, 
          categoria, 
          autor, 
          data_publicacao: dataPub || new Date().toISOString(), 
          imagem_capa: imagemUrl, 
          conteudo,
          related_cases_ids: relatedCases.length > 0 ? relatedCases : null
        }).eq('id', articleToEdit.id);
        if (error) throw error;
        toast.success('Artigo atualizado com sucesso!');
      } else {
        // Modo de Criação
        const { error } = await supabase.from('articles').insert([{
          titulo, 
          categoria, 
          autor, 
          data_publicacao: dataPub || new Date().toISOString(), 
          imagem_capa: imagemUrl, 
          conteudo, 
          status: isAdmin ? 'approved' : 'pending',
          related_cases_ids: relatedCases.length > 0 ? relatedCases : null
        }]);
        if (error) throw error;
        toast.success('Artigo publicado com sucesso!');
      }
      onSuccess();
      onOpenChange(false); // Fecha o modal
    } catch (error) {
      console.error(error);
      toast.error('Erro ao publicar o artigo.');
    } finally {
      setIsPublishing(false);
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card w-full max-w-5xl rounded-2xl border border-border shadow-2xl flex flex-col my-auto relative animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-border bg-muted/30 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              <FileText className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-bold font-heading text-foreground">{articleToEdit ? 'Editar Artigo' : 'Novo Artigo'}</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-full hover:bg-destructive/10 hover:text-destructive">
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="p-6 space-y-8 overflow-y-auto max-h-[75vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-sm font-semibold text-foreground">Título do Artigo</label>
              <Input placeholder="Ex: Padrões Radiológicos na Pneumonia" className="h-11 bg-background" value={titulo} onChange={e => setTitulo(e.target.value)} />
            </div>
            <div className="space-y-3">
              <label className="text-sm font-semibold text-foreground">Categoria</label>
              <select className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" value={categoria} onChange={e => setCategoria(e.target.value)}>
                <option value="rx">Raio-X (RX)</option>
                <option value="tc">Tomografia (TC)</option>
                <option value="usg">Ultrassom (USG)</option>
                <option value="rm">Ressonância Magnética (RM)</option>
              </select>
            </div>
            <div className="space-y-3">
              <label className="text-sm font-semibold text-foreground">Autor</label>
              <Input placeholder="Nome completo do autor" className="h-11 bg-background" value={autor} onChange={e => setAutor(e.target.value)} />
            </div>
            <div className="space-y-3">
              <label className="text-sm font-semibold text-foreground">Data de Publicação</label>
              <Input type="date" className="h-11 bg-background block" value={dataPub} onChange={e => setDataPub(e.target.value)} />
            </div>
            <div className="space-y-3 md:col-span-2">
              <label className="text-sm font-semibold text-foreground">Casos Clínicos Relacionados (Opcional)</label>
              <div className="flex gap-2">
                <select className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" value={caseToAdd} onChange={e => setCaseToAdd(e.target.value)}>
                  <option value="none">Selecione para adicionar...</option>
                  {cases?.filter(c => !relatedCases.includes(c.id)).map(c => (
                    <option key={c.id} value={c.id}>
                      #{c.case_number} - {c.exam_type} - {c.diagnosis}
                    </option>
                  ))}
                </select>
                <Button type="button" onClick={handleAddCase} className="h-11 w-11 px-0 shrink-0 bg-secondary hover:bg-secondary/80 text-secondary-foreground"><Plus className="w-5 h-5" /></Button>
              </div>
              {relatedCases.length > 0 && (
                <div className="flex flex-col gap-2 mt-3">
                  {relatedCases.map(id => {
                    const c = cases?.find(x => x.id === id);
                    if (!c) return null;
                    return (
                      <div key={id} className="flex items-center justify-between bg-muted/50 p-2.5 rounded-lg border border-border shadow-sm">
                        <span className="text-sm font-medium text-foreground">#{c.case_number} - {c.exam_type} - {c.diagnosis}</span>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setRelatedCases(relatedCases.filter(rid => rid !== id))} className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"><X className="w-4 h-4" /></Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold text-foreground">Imagem de Capa (URL ou Upload)</label>
            <div className="flex gap-3">
              <Input placeholder="https://..." className="flex-1 h-11 bg-background" value={imagemUrl} onChange={e => setImagemUrl(e.target.value)} />
              
              {/* Input escondido ativado pelo botão de upload */}
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
              
              <Button variant="secondary" className="gap-2 h-11 px-6 font-semibold" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5" />} 
                {isUploading ? 'Enviando...' : 'Fazer Upload'}
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-foreground">Conteúdo do Artigo</label>
              {isUploadingContentImg && <span className="text-xs text-primary flex items-center"><Loader2 className="w-3 h-3 animate-spin mr-1"/> Processando imagem...</span>}
            </div>
            
            <div className="bg-background rounded-xl overflow-hidden [&_.ql-toolbar]:rounded-t-xl [&_.ql-container]:rounded-b-xl [&_.ql-editor]:min-h-[350px] [&_.ql-editor]:text-base [&_.ql-editor]:text-foreground [&_.ql-toolbar]:bg-muted/50 [&_.ql-stroke]:stroke-foreground [&_.ql-fill]:fill-foreground [&_.ql-picker]:text-foreground">
              <ReactQuill 
                ref={quillRef}
                theme="snow"
                value={conteudo}
                onChange={setConteudo}
                modules={modules}
                placeholder="Escreva o conteúdo detalhado do seu artigo aqui..."
              />
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-border flex justify-end gap-3 bg-muted/30 rounded-b-2xl">
          <Button variant="ghost" className="font-semibold" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button className="gap-2 font-semibold h-11 px-8" onClick={handlePublish} disabled={isPublishing}>
            {isPublishing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} 
            {isPublishing ? 'Salvando...' : (articleToEdit ? 'Salvar Alterações' : 'Publicar Artigo')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Admin;
