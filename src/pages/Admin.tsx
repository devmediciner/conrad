import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/authContent';
import { useAllCases, useUpdateCaseStatus, useDeleteCase } from '@/hooks/useCases';
import { EXAM_TYPE_COLORS } from '@/types/case';
import { Check, X, Trash2, ArrowLeft, Loader2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { EditCaseModal } from '@/components/EditCaseModal';
import type { Case } from '@/types/case';

const Admin = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const { data: cases, isLoading } = useAllCases();
  const updateStatus = useUpdateCaseStatus();
  const deleteCase = useDeleteCase();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [editingCase, setEditingCase] = useState<Case | null>(null);

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

  const filtered = cases?.filter(c => filter === 'all' || c.status === filter) ?? [];

  const statusColors: Record<string, string> = {
    pending: 'text-amber-400',
    approved: 'text-emerald-400',
    rejected: 'text-red-400',
  };

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
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'Todos' : f === 'pending' ? 'Pendentes' : f === 'approved' ? 'Aprovados' : 'Rejeitados'}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">Nenhum caso encontrado.</p>
        ) : (
          <div className="space-y-3">
            {filtered.map(c => {
              const badgeClass = EXAM_TYPE_COLORS[c.exam_type as keyof typeof EXAM_TYPE_COLORS] ?? '';
              return (
                <div key={c.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
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
                      <span className={`text-xs font-medium ${statusColors[c.status] ?? ''}`}>
                        {c.status === 'pending' ? 'Pendente' : c.status === 'approved' ? 'Aprovado' : 'Rejeitado'}
                      </span>
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
                    {c.status !== 'approved' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          updateStatus.mutate({ id: c.id, status: 'approved' });
                          toast.success('Caso aprovado');
                        }}
                        className="text-emerald-400 hover:text-emerald-300"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                    )}
                    {c.status !== 'rejected' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          updateStatus.mutate({ id: c.id, status: 'rejected' });
                          toast.success('Caso rejeitado');
                        }}
                        className="text-red-400 hover:text-red-300"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
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

      <EditCaseModal
        caseData={editingCase}
        open={!!editingCase}
        onOpenChange={(o) => !o && setEditingCase(null)}
      />
    </div>
  );
};

export default Admin;
