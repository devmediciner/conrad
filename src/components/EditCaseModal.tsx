import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, X, Plus, ImagePlus } from 'lucide-react';
import { useUpdateCase, uploadCaseImage } from '@/hooks/useCases';
import { toast } from 'sonner';
import type { Case, ExamType } from '@/types/case';

interface EditCaseModalProps {
  caseData: Case | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditCaseModal({ caseData, open, onOpenChange }: EditCaseModalProps) {
  const updateCase = useUpdateCase();
  const [examType, setExamType] = useState<ExamType>('RX');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('');
  const [clinicalCase, setClinicalCase] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (caseData) {
      setExamType(caseData.exam_type);
      setAge(caseData.age?.toString() ?? '');
      setSex(caseData.sex ?? '');
      setClinicalCase(caseData.clinical_case);
      setDiagnosis(caseData.diagnosis);
      setImages(caseData.images ?? []);
    }
  }, [caseData]);

  if (!caseData) return null;

  const handleAddImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const newUrls: string[] = [];
      for (const file of Array.from(files)) {
        const url = await uploadCaseImage(file);
        newUrls.push(url);
      }
      setImages(prev => [...prev, ...newUrls]);
      toast.success(`${newUrls.length} imagem(ns) adicionada(s)`);
    } catch {
      toast.error('Erro ao enviar imagem');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    try {
      await updateCase.mutateAsync({
        id: caseData.id,
        exam_type: examType,
        age: age ? parseInt(age) : null,
        sex: sex || null,
        clinical_case: clinicalCase,
        diagnosis,
        images,
      });
      toast.success('Caso atualizado com sucesso');
      onOpenChange(false);
    } catch {
      toast.error('Erro ao atualizar caso');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-foreground">Editar Caso</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Images management */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Imagens</label>
            <div className="flex flex-wrap gap-2">
              {images.map((img, i) => (
                <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border group">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => handleRemoveImage(i)}
                    className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <label className="w-20 h-20 rounded-lg border-2 border-dashed border-border hover:border-primary flex items-center justify-center cursor-pointer transition-colors">
                {uploading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                ) : (
                  <ImagePlus className="w-5 h-5 text-muted-foreground" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleAddImages}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Tipo de Exame</label>
              <Select value={examType} onValueChange={(v) => setExamType(v as ExamType)}>
                <SelectTrigger className="bg-card border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="RX">Raio-X</SelectItem>
                  <SelectItem value="TC">Tomografia</SelectItem>
                  <SelectItem value="RM">Ressonância</SelectItem>
                  <SelectItem value="USG">Ultrassom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Sexo</label>
              <Select value={sex} onValueChange={setSex}>
                <SelectTrigger className="bg-card border-border">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="M">Masculino</SelectItem>
                  <SelectItem value="F">Feminino</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Idade</label>
            <Input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="bg-card border-border"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Caso Clínico</label>
            <Textarea
              value={clinicalCase}
              onChange={(e) => setClinicalCase(e.target.value)}
              className="bg-card border-border min-h-[100px]"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Diagnóstico</label>
            <Textarea
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              className="bg-card border-border min-h-[80px]"
            />
          </div>

          <Button onClick={handleSave} disabled={updateCase.isPending || uploading} className="w-full">
            {updateCase.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Salvando...</>
            ) : (
              'Salvar Alterações'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
