import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/authContent';
import { useAllCases, useDeleteCase, useUpdateCaseStatus } from '@/hooks/useCases';
import { EXAM_TYPE_COLORS } from '@/types/case';
import { stripHtml, slugify, removeAccents } from '@/lib/utils';
import { CaseModal } from '@/components/CaseModal';

import { Trash2, ArrowLeft, Loader2, Pencil, Plus, Gamepad2, List, FileText, ImagePlus, Save, X, CheckCircle, Settings, Users, UserPlus, Check, XCircle, Eye, Edit, Search } from 'lucide-react';
import { toast } from 'sonner';
import { EditCaseModal } from '@/components/EditCaseModal';
import { SubmitCaseModal } from '@/components/SubmitCaseModal';
import { DiseaseModal } from '@/components/DiseaseModal';
import { useDiseases, useDeleteDisease } from '@/hooks/useGame';
import type { Case } from '@/types/case';
import type { Article } from '@/types/article';

// Importe seu client do Supabase (Ajuste o caminho se a sua configuração estiver em outro local)
import { supabase } from '@/integrations/supabase/client'; 
import { createClient } from '@supabase/supabase-js'; // ← Adicione esta importação
import { ArticleEditor } from '@/components/ArticleEditor';

const Admin = () => {
  const { user, isAdmin, loading: authLoading } = useAuth(); // Certifique-se de que o useAuth retorne o 'user' logado
  const { data: cases, isLoading } = useAllCases();
  const deleteCase = useDeleteCase();
  const updateCaseStatus = useUpdateCaseStatus();
  const navigate = useNavigate();
  const [editingCase, setEditingCase] = useState<Case | null>(null);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [diseaseModalOpen, setDiseaseModalOpen] = useState(false);
  const [articleModalOpen, setArticleModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [viewingCase, setViewingCase] = useState<Case | null>(null);
  const [casesSearchQuery, setCasesSearchQuery] = useState('');
  
  const [activeTab, setActiveTab] = useState<'casos' | 'minigame' | 'artigos' | 'config'>('casos');
  const [articles, setArticles] = useState<Article[]>([]);
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // Força um refetch ao postar artigo novo
  
  // Estados para criação de usuário
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('user');

  // Estados para edição de usuário
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserRole, setEditUserRole] = useState('user');

  const getSubmitterName = (submittedBy: string | null) => {
    if (!submittedBy) return 'Desconhecido';
    if (submittedBy === user?.id && user?.email) {
      return user.email.split('@')[0];
    }
    const foundUser = users.find(u => u.user_id === submittedBy);
    if (foundUser && typeof foundUser.email === 'string') {
      return foundUser.email.split('@')[0];
    }
    return 'Desconhecido';
  };

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
  }, [activeTab, refreshKey, isAdmin]);

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
  
  // Mostra todos os casos para todos os usuários logados, filtrados pela busca
  const displayCases = (cases ?? []).filter(c => {
    const query = removeAccents(casesSearchQuery).trim();
    if (!query) return true;
    return (
      c.case_number.toString().includes(query) ||
      removeAccents(c.exam_type).includes(query) ||
      removeAccents(c.disease).includes(query) ||
      removeAccents(stripHtml(c.clinical_case)).includes(query)
    );
  });

  const approvedArticles = articles.filter(a => a.status === 'approved');
  const pendingArticles = articles.filter(a => a.status === 'pending');

  // Função mockada para criar usuário na tabela profiles
  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserPassword) return toast.error('Preencha email e senha.');
    if (newUserPassword.length < 6) return toast.error('A senha deve ter pelo menos 6 caracteres.');

    try {
      // Criamos um cliente temporário que NÃO salva a sessão. 
      // Isso impede que o Admin atual seja deslogado ao criar a nova conta.
      const supabaseUrl = (supabase as unknown as { supabaseUrl?: string }).supabaseUrl || import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = (supabase as unknown as { supabaseKey?: string }).supabaseKey || import.meta.env.VITE_SUPABASE_ANON_KEY;

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
    } catch (e) {
      toast.error((e as Error).message || 'Erro ao criar usuário.');
    }
  };

  const handleUpdateUser = async (id: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({
          email: editUserEmail || null,
          role: editUserRole as 'admin' | 'user',
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Usuário atualizado com sucesso!');
      setEditingUserId(null);
      setRefreshKey(prev => prev + 1);
    } catch (e) {
      toast.error((e as Error).message || 'Erro ao atualizar usuário.');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) return;
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Usuário excluído com sucesso!');
      setRefreshKey(prev => prev + 1);
    } catch (e) {
      toast.error((e as Error).message || 'Erro ao excluir usuário.');
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
            { id: 'minigame', label: 'Diagnósticos' },
            { id: 'artigos', label: 'Artigos' },
            // Abas restritas a administradores
            ...(isAdmin ? [
              { id: 'config', label: 'Configurações' },
            ] : []),
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'casos' | 'minigame' | 'artigos' | 'config')}
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
              <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center mb-4">
                <h2 className="text-xl font-bold font-heading text-foreground">Casos (Todos)</h2>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Pesquisar por número, diagnóstico..."
                      value={casesSearchQuery}
                      onChange={(e) => setCasesSearchQuery(e.target.value)}
                      className="pl-9 h-9 text-xs bg-card border-border"
                    />
                  </div>
                  <Button variant="default" className="gap-2 h-9 text-xs shrink-0" onClick={() => setSubmitOpen(true)}>
                    <Plus className="w-4 h-4" /> Novo Caso
                  </Button>
                </div>
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
                            — {c.disease || 'Sem Diagnóstico'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">{c.age} anos • {c.sex} • Enviado por: <span className="font-semibold text-foreground/80">{getSubmitterName(c.submitted_by)}</span></p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0 items-center">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setViewingCase(c)} 
                            className="h-8 gap-1.5 text-xs border-border/85 text-muted-foreground hover:text-primary"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Visualizar
                          </Button>
                          
                          {isAdmin && c.status === 'pending' && (
                            <>
                              <Button 
                                size="icon" 
                                onClick={async () => {
                                  updateCaseStatus.mutate({ id: c.id, status: 'approved' });
                                  toast.success('Caso aprovado!');
                                }} 
                                className="bg-emerald-500 hover:bg-emerald-600 text-white h-8 w-8 shrink-0 animate-in zoom-in-50 duration-200"
                                title="Aprovar Caso"
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="icon" 
                                onClick={() => {
                                  if (confirm('Deseja recusar e excluir este caso?')) {
                                    deleteCase.mutate(c.id);
                                    toast.success('Caso recusado e excluído');
                                  }
                                }} 
                                variant="destructive" 
                                className="h-8 w-8 shrink-0 animate-in zoom-in-50 duration-200"
                                title="Recusar Caso"
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}

                          {(isAdmin || c.submitted_by === user?.id) && (
                            <Button variant="ghost" size="icon" onClick={() => setEditingCase(c)} className="text-muted-foreground hover:text-primary h-8 w-8" title="Editar"><Pencil className="w-4 h-4" /></Button>
                          )}

                          {(isAdmin || (c.submitted_by === user?.id && c.status === 'pending')) && (
                            <Button variant="ghost" size="icon" onClick={() => { 
                              if (confirm('Deseja excluir este caso permanentemente?')) {
                                deleteCase.mutate(c.id); 
                                toast.success('Caso excluído'); 
                              }
                            }} className="text-muted-foreground hover:text-destructive h-8 w-8" title="Excluir"><Trash2 className="w-4 h-4" /></Button>
                          )}
                        </div>
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
                <h2 className="text-xl font-bold font-heading text-foreground">Diagnósticos</h2>
                {isAdmin && (
                  <Button variant="outline" className="gap-2" onClick={() => setDiseaseModalOpen(true)}>
                    <Plus className="w-4 h-4" /> Novo Diagnóstico
                  </Button>
                )}
              </div>
              <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
                  {loadingDiseases ? (
                    <p className="text-sm text-center text-muted-foreground py-4">Carregando...</p>
                  ) : diseases?.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-10">Nenhum diagnóstico cadastrado.</div>
                  ) : (
                    <div className="space-y-2">
                      {diseases?.map(d => (
                        <div key={d.id} className="flex items-center justify-between bg-muted/30 px-3 py-2 rounded-lg border border-border">
                          <span className="text-sm text-foreground font-medium">{d.name}</span>
                          {isAdmin && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => {
                                if (confirm('Deseja excluir este diagnóstico permanentemente?')) {
                                  deleteDisease.mutate(d.id);
                                }
                              }} 
                              className="text-muted-foreground hover:text-destructive h-8 w-8"
                            >
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
                        <p className="text-xs text-muted-foreground mt-0.5">{artigo.autor?.split(' | ')[0]} • {new Date(artigo.data_publicacao).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0 items-center">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 gap-1.5 text-xs border-border/85 text-muted-foreground hover:text-primary" 
                          onClick={() => window.open(`/artigo/${slugify(artigo.titulo)}`, '_blank')}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Visualizar
                        </Button>

                        {isAdmin && artigo.status === 'pending' && (
                          <>
                            <Button 
                              size="icon" 
                              onClick={async () => {
                                await handleApproveArticle(artigo.id);
                              }} 
                              className="bg-emerald-500 hover:bg-emerald-600 text-white h-8 w-8 shrink-0 animate-in zoom-in-50 duration-200"
                              title="Aprovar Artigo"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="icon" 
                              onClick={async () => {
                                if (confirm('Deseja recusar e excluir este artigo?')) {
                                  await handleRejectArticle(artigo.id);
                                }
                              }} 
                              variant="destructive" 
                              className="h-8 w-8 shrink-0 animate-in zoom-in-50 duration-200"
                              title="Recusar Artigo"
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </>
                        )}

                        {(isAdmin || (artigo.autor && artigo.autor.includes(user?.email || ''))) && (
                          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary h-8 w-8" onClick={() => { setEditingArticle(artigo); setArticleModalOpen(true); }} title="Editar"><Pencil className="w-4 h-4" /></Button>
                        )}

                        {(isAdmin || (artigo.autor && artigo.autor.includes(user?.email || '') && artigo.status === 'pending')) && (
                          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive h-8 w-8" onClick={async () => {
                            if (confirm('Deseja excluir este artigo permanentemente?')) {
                              await handleRejectArticle(artigo.id);
                            }
                          }} title="Excluir"><Trash2 className="w-4 h-4" /></Button>
                        )}
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
                  {users.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">Nenhum perfil carregado.</p>
                  ) : (
                    users.map(u => {
                      const isSelf = u.user_id === user?.id;
                      const isEditing = editingUserId === u.id;
                      const userDisplayEmail = u.email || `ID: ${(u.user_id as string)?.substring(0, 8)}...`;
                      
                      return (
                        <div key={u.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-background border border-border rounded-lg gap-2">
                          {isEditing ? (
                            <>
                              <div className="flex-1 flex gap-2 flex-col sm:flex-row">
                                <Input 
                                  placeholder="E-mail" 
                                  value={editUserEmail} 
                                  onChange={e => setEditUserEmail(e.target.value)} 
                                  className="h-8 text-xs max-w-xs"
                                />
                                <select 
                                  className="border border-input rounded-md px-2 text-xs bg-background h-8"
                                  value={editUserRole}
                                  onChange={e => setEditUserRole(e.target.value)}
                                  disabled={isSelf}
                                >
                                  <option value="user">Usuário Comum</option>
                                  <option value="admin">Administrador</option>
                                </select>
                              </div>
                              <div className="flex gap-1.5 shrink-0">
                                <Button 
                                  size="icon" 
                                  className="h-8 w-8 bg-emerald-500 hover:bg-emerald-600 text-white" 
                                  onClick={() => handleUpdateUser(u.id as string)}
                                  title="Salvar"
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-8 w-8 text-muted-foreground" 
                                  onClick={() => setEditingUserId(null)}
                                  title="Cancelar"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{userDisplayEmail as string}</span>
                                {isSelf && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/20 font-semibold">
                                    Você
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider ${u.role === 'admin' ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-muted text-muted-foreground border border-border'}`}>
                                  {u.role as string}
                                </span>
                                <div className="flex gap-1.5">
                                  <Button 
                                    size="icon" 
                                    variant="secondary" 
                                    className="h-7 w-7" 
                                    onClick={() => {
                                      setEditingUserId(u.id as string);
                                      setEditUserEmail((u.email as string) || '');
                                      setEditUserRole((u.role as string) || 'user');
                                    }}
                                    title="Editar usuário"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button 
                                    size="icon" 
                                    variant="destructive" 
                                    className="h-7 w-7" 
                                    onClick={() => handleDeleteUser(u.id as string)}
                                    disabled={isSelf}
                                    title={isSelf ? "Você não pode se excluir" : "Excluir usuário"}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })
                  )}
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
      <CaseModal caseData={viewingCase} open={!!viewingCase} onOpenChange={(o) => !o && setViewingCase(null)} />
    </div>
  );
};

const ArticleModal = ({ open, onOpenChange, isAdmin, onSuccess, articleToEdit, cases }: { open: boolean; onOpenChange: (open: boolean) => void; isAdmin: boolean; onSuccess: () => void; articleToEdit?: Article | null; cases?: Case[] }) => {
  const { user } = useAuth();
  // Estados para o formulário
  const [titulo, setTitulo] = useState('');
  const [categoria, setCategoria] = useState('rx');
  const [autor, setAutor] = useState('');
  const [dataPub, setDataPub] = useState('');
  const [imagemUrl, setImagemUrl] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [relatedCases, setRelatedCases] = useState<string[]>([]);
  const [caseToAdd, setCaseToAdd] = useState('none');
  const [caseSearchQuery, setCaseSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
  const [isUploading, setIsUploading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingContentImg, setIsUploadingContentImg] = useState(false);
  const editorRef = useRef<{ insertImage: (url: string) => void } | null>(null);

  // Preenche os dados do modal quando abrir para editar
  useEffect(() => {
    if (open) {
      if (articleToEdit) {
        setTitulo(articleToEdit.titulo || '');
        setCategoria(articleToEdit.categoria || 'rx');
        // Limpar o sufixo " | email" se existir para a exibição no formulário
        const cleanAutor = articleToEdit.autor ? articleToEdit.autor.split(' | ')[0] : '';
        setAutor(cleanAutor);
        setDataPub(articleToEdit.data_publicacao ? articleToEdit.data_publicacao.split('T')[0] : '');
        setImagemUrl(articleToEdit.imagem_capa || '');
        setConteudo(articleToEdit.conteudo || '');
        setRelatedCases(articleToEdit.related_cases_ids || []);
        setCaseToAdd('none');
        setCaseSearchQuery('');
      } else {
        setTitulo('');
        setCategoria('rx');
        setAutor('');
        setDataPub('');
        setImagemUrl('');
        setConteudo('');
        setRelatedCases([]);
        setCaseToAdd('none');
        setCaseSearchQuery('');
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
  const handleContentImageUpload = useCallback(() => {
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
          // Insert the uploaded image URL into the editor content
          setConteudo(prev => prev + `<img src="${data.publicUrl}" />`);
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

      let finalAutor = autor;
      if (articleToEdit && articleToEdit.autor && articleToEdit.autor.includes(' | ')) {
        const parts = articleToEdit.autor.split(' | ');
        const originalEmail = parts[1];
        finalAutor = `${autor} | ${originalEmail}`;
      } else if (user?.email) {
        finalAutor = `${autor} | ${user.email}`;
      }
      
      if (articleToEdit) {
        // Modo de Edição
        const { error } = await supabase.from('articles').update({
          titulo, 
          categoria, 
          autor: finalAutor, 
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
          autor: finalAutor, 
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
    <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden animate-in fade-in duration-200">
      <div className="bg-card w-full h-full flex flex-col relative">
        
        {/* Shrunken Navbar */}
        <div className="border-b border-border bg-muted/30 shrink-0">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between py-2 px-6">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold font-heading text-foreground">{articleToEdit ? 'Editar Artigo' : 'Novo Artigo'}</h2>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Fullscreen Workspace */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-background">
          
          {/* Left Column: Metadata / Fields - Scrollable */}
          <div className="w-full lg:w-[350px] lg:shrink-0 lg:border-r border-border bg-muted/15 overflow-y-auto p-4 space-y-4 lg:h-full max-h-[35vh] lg:max-h-none shrink-0 border-b lg:border-b-0">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1.5">Informações do Artigo</h3>
            
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-foreground">Título do Artigo</label>
              <Input placeholder="Ex: Padrões Radiológicos na Pneumonia" className="h-9 text-xs bg-background" value={titulo} onChange={e => setTitulo(e.target.value)} />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-foreground">Categoria</label>
              <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring" value={categoria} onChange={e => setCategoria(e.target.value)}>
                <option value="rx">Raio-X (RX)</option>
                <option value="tc">Tomografia (TC)</option>
                <option value="usg">Ultrassom (USG)</option>
                <option value="rm">Ressonância Magnética (RM)</option>
              </select>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-foreground">Autor</label>
              <Input placeholder="Nome completo do autor" className="h-9 text-xs bg-background" value={autor} onChange={e => setAutor(e.target.value)} />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-foreground">Data de Publicação</label>
              <Input type="date" className="h-9 text-xs bg-background block" value={dataPub} onChange={e => setDataPub(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-foreground">Imagem de Capa (URL ou Upload)</label>
              <div className="flex flex-col gap-2">
                <Input placeholder="https://..." className="h-9 text-xs bg-background" value={imagemUrl} onChange={e => setImagemUrl(e.target.value)} />
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                <Button variant="secondary" size="sm" className="gap-2 h-8 font-semibold w-full text-xs" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                  {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />} 
                  {isUploading ? 'Enviando...' : 'Fazer Upload'}
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-foreground">Casos Clínicos Relacionados (Opcional)</label>
              <div className="relative">
                <Input 
                  placeholder="Pesquise por número, tipo ou diagnóstico..." 
                  value={caseSearchQuery} 
                  onChange={e => {
                    setCaseSearchQuery(e.target.value);
                    setIsSearchFocused(true);
                  }} 
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => {
                    setTimeout(() => setIsSearchFocused(false), 200);
                  }}
                  className="h-9 text-xs bg-background"
                />
                {isSearchFocused && (
                  <div className="absolute z-50 w-full bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto mt-1">
                    {cases?.filter(c => {
                      const query = removeAccents(caseSearchQuery).trim();
                      return !relatedCases.includes(c.id) && 
                      (
                        query === '' ||
                        c.case_number.toString().includes(query) ||
                        removeAccents(c.exam_type).includes(query) ||
                        removeAccents(c.disease).includes(query)
                      );
                    }).map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onMouseDown={() => {
                          setRelatedCases([...relatedCases, c.id]);
                          setCaseSearchQuery('');
                        }}
                        className="w-full text-left px-3 py-2 text-[11px] hover:bg-accent hover:text-accent-foreground border-b border-border/45 last:border-0"
                      >
                        #{c.case_number} - {c.exam_type} - {c.disease || 'Sem Diagnóstico'}
                      </button>
                    ))}
                    {cases?.filter(c => {
                      const query = removeAccents(caseSearchQuery).trim();
                      return !relatedCases.includes(c.id) && 
                      (
                        query === '' ||
                        c.case_number.toString().includes(query) ||
                        removeAccents(c.exam_type).includes(query) ||
                        removeAccents(c.disease).includes(query)
                      );
                    }).length === 0 && (
                      <div className="px-3 py-2 text-[11px] text-muted-foreground text-center">Nenhum caso correspondente.</div>
                    )}
                  </div>
                )}
              </div>
              {relatedCases.length > 0 && (
                <div className="flex flex-col gap-1.5 mt-2 max-h-40 overflow-y-auto pr-1">
                  {relatedCases.map(id => {
                    const c = cases?.find(x => x.id === id);
                    if (!c) return null;
                    return (
                      <div key={id} className="flex items-center justify-between bg-muted/50 p-2 rounded-lg border border-border shadow-sm">
                        <span className="text-[11px] font-medium text-foreground truncate max-w-[250px]">#{c.case_number} - {c.exam_type} - {c.disease || 'Sem Diagnóstico'}</span>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setRelatedCases(relatedCases.filter(rid => rid !== id))} className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"><X className="w-3 h-3" /></Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Editor Workspace - Full Height, Toolbar Glued directly under Navbar */}
          <div className="flex-1 flex flex-col overflow-hidden h-full relative">
            {isUploadingContentImg && (
              <div className="absolute top-2 right-4 z-40 bg-background/90 backdrop-blur border border-border px-3 py-1.5 rounded-lg text-xs text-primary flex items-center shadow-md animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5"/>
                Processando imagem...
              </div>
            )}
            <ArticleEditor
              value={conteudo}
              onChange={setConteudo}
              onImageUpload={handleContentImageUpload}
              isUploadingImage={isUploadingContentImg}
              placeholder="Comece a escrever seu artigo aqui..."
              className="flex-1 flex flex-col overflow-hidden border-none rounded-none bg-muted/15"
            />
          </div>

        </div>

        {/* Shrunken Footer */}
        <div className="border-t border-border bg-muted/30 shrink-0">
          <div className="max-w-7xl mx-auto w-full flex justify-end gap-3 py-2.5 px-6">
            <Button variant="ghost" size="sm" className="font-semibold" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button size="sm" className="gap-1.5 font-semibold h-9 px-5" onClick={handlePublish} disabled={isPublishing}>
              {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 
              {isPublishing ? 'Salvando...' : (articleToEdit ? 'Salvar Alterações' : 'Publicar Artigo')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
