import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Upload, X, Loader2 } from 'lucide-react';
import { useSubmitCase, uploadCaseImage } from '@/hooks/useCases';
import { useAuth } from '@/hooks/authContent';
import { useDiseases } from '@/hooks/useGame';
import { toast } from 'sonner';
import type { ExamType } from '@/types/case';
import { convertDicomToJpeg, getDicomSortMetadata, sortFilesByDicomMetadata } from '@/utils/dicom';
import { supabase } from '@/integrations/supabase/client';

interface SubmitCaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SubmitCaseModal({ open, onOpenChange }: SubmitCaseModalProps) {
  const { user, isAdmin } = useAuth();
  const submitCase = useSubmitCase();
  const { data: diseases } = useDiseases();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
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
    const newPreviews = [...previews];
    
    const [draggedImage] = newImages.splice(draggedIndex, 1);
    const [draggedPreview] = newPreviews.splice(draggedIndex, 1);
    
    newImages.splice(index, 0, draggedImage);
    newPreviews.splice(index, 0, draggedPreview);
    
    setImages(newImages);
    setPreviews(newPreviews);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const [examType, setExamType] = useState<ExamType | ''>('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('');
  const [clinicalCase, setClinicalCase] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [source, setSource] = useState('');
  const [uploading, setUploading] = useState(false);
  
  // Game fields
  const [isMinigame, setIsMinigame] = useState(false);
  const [disease, setDisease] = useState('');
  const [clue1, setClue1] = useState('');
  const [clue2, setClue2] = useState('');
  const [clue3, setClue3] = useState('');

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;

    const fileListArray = Array.from(files);

    const validFileList = fileListArray.filter(f =>
      f.type.startsWith('image/') ||
      f.name.toLowerCase().endsWith('.dcm') ||
      f.name.toLowerCase().endsWith('.dicom') ||
      f.type === 'application/dicom'
    );

    if (validFileList.length === 0) return;

    setUploading(true);
    try {
      // Extract metadata for sorting (Instance Number, Slice Position, etc.)
      const filesWithMetadata = await Promise.all(validFileList.map(getDicomSortMetadata));
      
      // Sort using DICOM metadata (with filename fallback)
      const sortedFiles = sortFilesByDicomMetadata(filesWithMetadata);

      const processedFiles: File[] = [];

      for (const file of sortedFiles) {
        const isDicom =
          file.name.toLowerCase().endsWith('.dcm') ||
          file.name.toLowerCase().endsWith('.dicom') ||
          file.type === 'application/dicom';

        if (isDicom) {
          try {
            const converted = await convertDicomToJpeg(file);
            processedFiles.push(converted);
          } catch (err: any) {
            console.error(`Erro ao converter DICOM ${file.name}:`, err);
            toast.error(`Falha ao processar DICOM ${file.name}: ${err.message || err}`);
          }
        } else {
          processedFiles.push(file);
        }
      }

      if (processedFiles.length > 0) {
        setImages(prev => [...prev, ...processedFiles]);
        
        // Read all previews maintaining the exact same index order
        const previewUrls = await Promise.all(
          processedFiles.map(file => {
            return new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = (e) => resolve(e.target?.result as string);
              reader.readAsDataURL(file);
            });
          })
        );
        setPreviews(prev => [...prev, ...previewUrls]);
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao processar arquivos.');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setImages([]);
    setPreviews([]);
    setExamType('');
    setAge('');
    setSex('');
    setClinicalCase('');
    setDiagnosis('');
    setSource('');
    setIsMinigame(false);
    setDisease('');
    setClue1('');
    setClue2('');
    setClue3('');
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Sessão expirada. Faça login novamente.');
      return;
    }
    if (!examType || !clinicalCase.trim() || !diagnosis.trim() || !disease) {
      toast.error('Preencha todos os campos obrigatórios (Tipo, Caso Clínico, Laudo e Diagnóstico).');
      return;
    }
    if (isMinigame && images.length === 0) {
      toast.error('O quiz exige que o caso tenha pelo menos uma imagem.');
      return;
    }

    setUploading(true);
    try {
      await submitCase.mutateAsync({
        files: images,
        exam_type: examType,
        age: age ? parseInt(age) : 0,
        sex: sex || 'Outro',
        clinical_case: clinicalCase,
        diagnosis,
        source: source.trim() || undefined,
        status: isAdmin ? 'approved' : 'pending',
        disease: disease || null,
        clue1: isMinigame ? (clue1.trim() || clinicalCase) : null,
        clue2: isMinigame ? clue2 : null,
        clue3: isMinigame ? clue3 : null
      });
      
      toast.success(isAdmin ? 'Caso adicionado à galeria!' : 'Caso enviado para aprovação!');
      resetForm();
      onOpenChange(false);
    } catch (err) {
      console.error("Erro na submissão do caso:", err);
      toast.error('Erro ao enviar caso. Tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-foreground">Enviar Caso Clínico</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Adicione um caso diretamente para a Galeria e para o Minigame.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image upload */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Imagens</label>
            {previews.length > 0 && (
              <span className="text-xs text-muted-foreground block mb-2">
                Arraste e solte as imagens para alterar a ordem de exibição.
              </span>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.dcm,.dicom"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
              disabled={uploading}
            />
            <div className="flex flex-wrap gap-2">
              {previews.map((src, i) => (
                <div
                  key={i}
                  draggable={!uploading}
                  onDragStart={(e) => handleDragStart(e, i)}
                  onDragOver={(e) => handleDragOver(e, i)}
                  onDragEnd={handleDragEnd}
                  className={`relative w-20 h-20 rounded-md overflow-hidden border transition-all cursor-grab active:cursor-grabbing ${
                    draggedIndex === i ? 'opacity-40 border-primary scale-90' : 'border-border'
                  }`}
                >
                  <img src={src} alt="" className="w-full h-full object-cover" draggable="false" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImage(i);
                    }}
                    className="absolute top-0.5 right-0.5 bg-background/80 hover:bg-destructive hover:text-destructive-foreground rounded-full p-0.5 transition-colors"
                    disabled={uploading}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => !uploading && fileInputRef.current?.click()}
                disabled={uploading}
                className="w-20 h-20 rounded-md border border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                ) : (
                  <Upload className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Tipo de Exame *</label>
              <Select value={examType} onValueChange={(v) => setExamType(v as ExamType)}>
                <SelectTrigger className="bg-card border-border">
                  <SelectValue placeholder="Selecione" />
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
              placeholder="Ex: 45"
              className="bg-card border-border"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Caso Clínico *</label>
            <RichTextEditor
              value={clinicalCase}
              onChange={setClinicalCase}
              placeholder="Descreva o caso clínico..."
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
              placeholder="Escreva o laudo detalhado..."
              minHeight="100px"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Fonte</label>
            <Input
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="Ex: Radiopaedia, caso próprio, acervo institucional..."
              className="bg-card border-border"
            />
          </div>

          {/* Seção Minigame */}
          <div className="pt-4 border-t border-border mt-4">
            <div className="flex items-center gap-3 mb-4">
              <input
                type="checkbox"
                id="isMinigameToggle"
                checked={isMinigame}
                onChange={(e) => setIsMinigame(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
              />
              <label htmlFor="isMinigameToggle" className="font-heading text-primary font-semibold cursor-pointer select-none">
                Adicionar este caso ao Quiz
              </label>
            </div>
            
            {isMinigame && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Dica 1 (Após 1º erro)</label>
                  <Input value={clue1} onChange={e => setClue1(e.target.value)} placeholder="Sintoma principal (opcional, usa caso clínico por padrão)" className="bg-card border-border" />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Dica 2 (Após 2º erro)</label>
                  <Input value={clue2} onChange={e => setClue2(e.target.value)} placeholder="Sintoma associado (opcional)" className="bg-card border-border" />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Dica 3 (Após 3º erro)</label>
                  <Input value={clue3} onChange={e => setClue3(e.target.value)} placeholder="Laboratório ou história (opcional)" className="bg-card border-border" />
                </div>
              </div>
            )}
          </div>

          <Button onClick={handleSubmit} disabled={uploading} className="w-full">
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" /> Enviando...
              </>
            ) : (
              'Enviar Caso'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
