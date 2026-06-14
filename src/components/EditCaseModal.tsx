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
import { RichTextEditor } from './ui/RichTextEditor';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, X, Plus, ImagePlus } from 'lucide-react';
import { useUpdateCase, uploadCaseImage } from '@/hooks/useCases';
import { useDiseases } from '@/hooks/useGame';
import { toast } from 'sonner';
import type { Case, ExamType } from '@/types/case';
import { convertDicomToJpeg, getDicomSortMetadata, sortFilesByDicomMetadata } from '@/utils/dicom';
import { supabase } from '@/integrations/supabase/client';

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
  const [newlyUploadedImages, setNewlyUploadedImages] = useState<string[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (uploading) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newImages = [...images];
    const [draggedImage] = newImages.splice(draggedIndex, 1);
    newImages.splice(index, 0, draggedImage);
    
    setImages(newImages);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };
  
  // Game fields
  const [isMinigame, setIsMinigame] = useState(false);
  const { data: diseases } = useDiseases();
  const [disease, setDisease] = useState('');
  const [clue1, setClue1] = useState('');
  const [clue2, setClue2] = useState('');
  const [clue3, setClue3] = useState('');

  useEffect(() => {
    if (caseData) {
      setExamType(caseData.exam_type);
      setAge(caseData.age?.toString() ?? '');
      setSex(caseData.sex ?? '');
      setClinicalCase(caseData.clinical_case);
      setDiagnosis(caseData.diagnosis);
      setImages(caseData.images ?? []);
      setIsMinigame(!!caseData.disease);
      setDisease(caseData.disease ?? '');
      setClue1(caseData.clue1 ?? '');
      setClue2(caseData.clue2 ?? '');
      setClue3(caseData.clue3 ?? '');
      setNewlyUploadedImages([]);
    }
  }, [caseData]);

  if (!caseData) return null;

  const handleAddImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileListArray = Array.from(files);

    const validFileList = fileListArray.filter(f =>
      f.type.startsWith('image/') ||
      f.name.toLowerCase().endsWith('.dcm') ||
      f.name.toLowerCase().endsWith('.dicom') ||
      f.type === 'application/dicom'
    );

    if (validFileList.length === 0) {
      e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      // Extract metadata for sorting (Instance Number, Slice Position, etc.)
      const filesWithMetadata = await Promise.all(validFileList.map(getDicomSortMetadata));
      
      // Sort using DICOM metadata (with filename fallback)
      const sortedFiles = sortFilesByDicomMetadata(filesWithMetadata);

      const newUrls: string[] = [];
      for (const file of sortedFiles) {
        const isDicom =
          file.name.toLowerCase().endsWith('.dcm') ||
          file.name.toLowerCase().endsWith('.dicom') ||
          file.type === 'application/dicom';

        let uploadFile: File = file;
        if (isDicom) {
          try {
            uploadFile = await convertDicomToJpeg(file);
          } catch (err: any) {
            console.error(`Erro ao converter DICOM ${file.name}:`, err);
            toast.error(`Falha ao processar DICOM ${file.name}: ${err.message || err}`);
            continue;
          }
        }

        const url = await uploadCaseImage(uploadFile, examType, caseData.case_number);
        newUrls.push(url);
      }
      if (newUrls.length > 0) {
        setImages(prev => [...prev, ...newUrls]);
        setNewlyUploadedImages(prev => [...prev, ...newUrls]);
        toast.success(`${newUrls.length} imagem(ns) adicionada(s)`);
      }
    } catch {
      toast.error('Erro ao enviar imagem');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    const removedUrl = images[index];
    setImages(prev => prev.filter((_, i) => i !== index));
    
    // If it was newly uploaded during this session, delete it immediately from storage
    if (newlyUploadedImages.includes(removedUrl)) {
      const fileName = removedUrl.split('/').pop();
      if (fileName) {
        supabase.storage
          .from('radiology-images')
          .remove([fileName])
          .then(({ error }) => {
            if (error) console.error("Erro ao deletar imagem removida do storage:", error);
          });
      }
      setNewlyUploadedImages(prev => prev.filter(url => url !== removedUrl));
    }
  };

  const handleSave = async () => {
    if (!examType || !clinicalCase.trim() || !diagnosis.trim() || !disease) {
      toast.error('Preencha todos os campos obrigatórios (Tipo, Caso Clínico, Laudo e Diagnóstico).');
      return;
    }
    if (isMinigame && images.length === 0) {
      toast.error('O quiz exige que o caso tenha pelo menos uma imagem.');
      return;
    }

    try {
      await updateCase.mutateAsync({
        id: caseData.id,
        exam_type: examType,
        age: age ? parseInt(age) : null,
        sex: sex || null,
        clinical_case: clinicalCase,
        diagnosis,
        images,
        disease: disease || null,
        clue1: isMinigame ? (clue1.trim() || clinicalCase) : null,
        clue2: isMinigame ? clue2 : null,
        clue3: isMinigame ? clue3 : null
      });
      toast.success('Caso atualizado com sucesso');
      setNewlyUploadedImages([]);
      onOpenChange(false);
    } catch {
      toast.error('Erro ao atualizar caso');
    }
  };

  const handleOpenChange = async (isOpen: boolean) => {
    if (!isOpen) {
      // User is canceling, clean up newly uploaded images that were never saved
      if (newlyUploadedImages.length > 0) {
        const fileNames = newlyUploadedImages
          .map(url => url.split('/').pop())
          .filter(Boolean) as string[];
        
        if (fileNames.length > 0) {
          supabase.storage
            .from('radiology-images')
            .remove(fileNames)
            .then(({ error }) => {
              if (error) console.error("Erro ao limpar imagens órfãs no cancelamento:", error);
            });
        }
      }
      setNewlyUploadedImages([]);
      onOpenChange(false);
    } else {
      onOpenChange(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-foreground">Editar Caso</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Images management */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Imagens</label>
            {images.length > 0 && (
              <span className="text-xs text-muted-foreground block mb-2">
                Arraste e solte as imagens para alterar a ordem de exibição.
              </span>
            )}
            <div className="flex flex-wrap gap-2">
              {images.map((img, i) => (
                <div
                  key={i}
                  draggable={!uploading}
                  onDragStart={(e) => handleDragStart(e, i)}
                  onDragOver={(e) => handleDragOver(e, i)}
                  onDragEnd={handleDragEnd}
                  className={`relative w-20 h-20 rounded-lg overflow-hidden border transition-all cursor-grab active:cursor-grabbing group ${
                    draggedIndex === i ? 'opacity-40 border-primary scale-90' : 'border-border'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" draggable="false" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveImage(i);
                    }}
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
                  accept="image/*,.dcm,.dicom"
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
            <RichTextEditor
              value={clinicalCase}
              onChange={setClinicalCase}
              minHeight="120px"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Diagnóstico *</label>
            <Select value={disease} onValueChange={setDisease}>
              <SelectTrigger className="bg-card border-border">
                <SelectValue placeholder="Selecione o diagnóstico correspondente" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border max-h-48">
                {diseases?.map(d => (
                  <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Laudo *</label>
            <RichTextEditor
              value={diagnosis}
              onChange={setDiagnosis}
              minHeight="100px"
            />
          </div>

          {/* Seção Minigame */}
          <div className="pt-4 border-t border-border mt-4">
            <div className="flex items-center gap-3 mb-4">
              <input
                type="checkbox"
                id="editIsMinigameToggle"
                checked={isMinigame}
                onChange={(e) => setIsMinigame(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
              />
              <label htmlFor="editIsMinigameToggle" className="font-heading text-primary font-semibold cursor-pointer select-none">
                Disponível no Quiz
              </label>
            </div>
            
            {isMinigame && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Dica 1 (Após 1º erro)</label>
                  <Input value={clue1} onChange={e => setClue1(e.target.value)} className="bg-card border-border" />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Dica 2 (Após 2º erro)</label>
                  <Input value={clue2} onChange={e => setClue2(e.target.value)} className="bg-card border-border" />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Dica 3 (Após 3º erro)</label>
                  <Input value={clue3} onChange={e => setClue3(e.target.value)} className="bg-card border-border" />
                </div>
              </div>
            )}
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
