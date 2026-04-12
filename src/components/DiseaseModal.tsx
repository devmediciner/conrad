import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAddDisease } from '@/hooks/useGame';

interface DiseaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DiseaseModal({ open, onOpenChange }: DiseaseModalProps) {
  const [name, setName] = useState('');
  const addDisease = useAddDisease();

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Informe o nome da doença.');
      return;
    }
    try {
      await addDisease.mutateAsync(name.trim());
      toast.success('Doença adicionada com sucesso!');
      setName('');
      onOpenChange(false);
    } catch (error) {
      toast.error('Erro ao adicionar doença.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-heading text-foreground">Nova Doença</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Pneumotórax" className="bg-card border-border" />
          <Button onClick={handleSave} disabled={addDisease.isPending} className="w-full">
            {addDisease.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Salvando...</> : 'Salvar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}