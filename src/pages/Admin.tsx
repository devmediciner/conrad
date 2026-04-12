import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/authContent';
import { useAllCases, useDeleteCase } from '@/hooks/useCases';
import { EXAM_TYPE_COLORS } from '@/types/case';
import { Trash2, ArrowLeft, Loader2, Pencil, Plus, Gamepad2, List } from 'lucide-react';
import { toast } from 'sonner';
import { EditCaseModal } from '@/components/EditCaseModal';
import { SubmitCaseModal } from '@/components/SubmitCaseModal';
import { DiseaseModal } from '@/components/DiseaseModal';
import { useDiseases, useDeleteDisease } from '@/hooks/useGame';
import type { Case } from '@/types/case';

const Admin = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const { data: cases, isLoading } = useAllCases();
  const deleteCase = useDeleteCase();
  const navigate = useNavigate();
  const [editingCase, setEditingCase] = useState<Case | null>(null);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [diseaseModalOpen, setDiseaseModalOpen] = useState(false);
  
  const { data: diseases, isLoading: loadingDiseases } = useDiseases();
  const deleteDisease = useDeleteDisease();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
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

  const filtered = cases ?? [];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-heading text-2xl font-bold text-foreground">Painel Admin</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="gap-2 hidden sm:flex" onClick={() => setDiseaseModalOpen(true)}>
              <List className="w-4 h-4" /> Nova Doença
            </Button>
            <Button variant="default" className="gap-2" onClick={() => setSubmitOpen(true)}>
              <Plus className="w-4 h-4" /> Novo Caso
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Column - Cases */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-bold font-heading text-foreground">Casos (Galeria)</h2>
            {isLoading ? (
              <p className="text-muted-foreground">Carregando...</p>
            ) : filtered.length === 0 ? (
              <p className="text-muted-foreground text-center py-12 bg-card border border-border rounded-xl shadow-sm">Nenhum caso encontrado.</p>
            ) : (
              <div className="space-y-3">
                {filtered.map(c => {
                  const badgeClass = EXAM_TYPE_COLORS[c.exam_type as keyof typeof EXAM_TYPE_COLORS] ?? '';
                  return (
                    <div key={c.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                      {/* Thumbnail */}
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                        {c.images?.[0] ? (
                          <img src={c.images[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">—</div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${badgeClass}`}>{c.exam_type}</span>
                        </div>
                        <p className="text-sm text-foreground truncate">
                          <span className="font-mono text-muted-foreground mr-1">#{c.case_number}</span>
                          {c.clinical_case}
                        </p>
                        <p className="text-xs text-muted-foreground">{c.age} anos • {c.sex}</p>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingCase(c)}
                          className="text-muted-foreground hover:text-primary"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            deleteCase.mutate(c.id);
                            toast.success('Caso excluído');
                          }}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column - Game config */}
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2 text-foreground">
                  <List className="w-4 h-4 text-primary" /> Doenças no Minigame
                </h3>
                <Button size="sm" variant="outline" className="gap-2 h-8 text-xs sm:hidden" onClick={() => setDiseaseModalOpen(true)}>
                  <Plus className="w-3.5 h-3.5" /> Nova
                </Button>
              </div>
              <div className="space-y-3">
                {loadingDiseases ? (
                  <p className="text-sm text-center text-muted-foreground py-4">Carregando...</p>
                ) : diseases?.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-10 bg-muted/30 rounded-lg border border-dashed border-border">A lista de doenças está vazia.</div>
                ) : (
                  <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2">
                    {diseases?.map(d => (
                      <div key={d.id} className="flex items-center justify-between bg-muted/30 px-3 py-2 rounded-lg border border-border">
                        <span className="text-sm text-foreground">{d.name}</span>
                        <Button variant="ghost" size="icon" onClick={() => deleteDisease.mutate(d.id)} className="text-red-400 hover:text-red-300 h-8 w-8">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <EditCaseModal
        caseData={editingCase}
        open={!!editingCase}
        onOpenChange={(o) => !o && setEditingCase(null)}
      />
      <SubmitCaseModal open={submitOpen} onOpenChange={setSubmitOpen} />
      <DiseaseModal open={diseaseModalOpen} onOpenChange={setDiseaseModalOpen} />
    </div>
  );
};

export default Admin;
