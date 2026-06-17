import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RichTextEditor } from './ui/RichTextEditor';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload, X, Loader2, Activity, ImagePlus, Plus } from 'lucide-react';
import { useSubmitCase } from '@/hooks/useCases';
import { useAuth } from '@/hooks/authContent';
import { useDiseases } from '@/hooks/useGame';
import { toast } from 'sonner';
import type { ExamType } from '@/types/case';
import { convertDicomToJpeg, getDicomSortMetadata, sortFilesByDicomMetadata } from '@/utils/dicom';
import { DiseaseModal } from './DiseaseModal';

interface SubmitCaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SubmitCaseModal({ open, onOpenChange }: SubmitCaseModalProps) {
  const { user, isAdmin } = useAuth();
  const submitCase = useSubmitCase();
  const { data: diseases } = useDiseases();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const laudoFileInputRef = useRef<HTMLInputElement>(null);
  
  const [diseaseModalOpen, setDiseaseModalOpen] = useState(false);

  // Main Images States
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Laudo Images States
  const [laudoImages, setLaudoImages] = useState<File[]>([]);
  const [laudoPreviews, setLaudoPreviews] = useState<string[]>([]);
  const [draggedLaudoIndex, setDraggedLaudoIndex] = useState<number | null>(null);

  const [examType, setExamType] = useState<ExamType | ''>('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('');
  const [clinicalCase, setClinicalCase] = useState('');
  const [comments, setComments] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [source, setSource] = useState('');
  const [uploading, setUploading] = useState(false);
  
  // Game fields
  const [isMinigame, setIsMinigame] = useState(false);
  const [disease, setDisease] = useState('');
  const [clue1, setClue1] = useState('');
  const [clue2, setClue2] = useState('');
  const [clue3, setClue3] = useState('');

  // Drag & drop logic for Main Images
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

  // Drag & drop logic for Laudo Images
  const handleLaudoDragStart = (e: React.DragEvent, index: number) => {
    if (uploading) return;
    setDraggedLaudoIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleLaudoDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedLaudoIndex === null || draggedLaudoIndex === index) return;

    const newImages = [...laudoImages];
    const newPreviews = [...laudoPreviews];
    
    const [draggedImage] = newImages.splice(draggedLaudoIndex, 1);
    const [draggedPreview] = newPreviews.splice(draggedLaudoIndex, 1);
    
    newImages.splice(index, 0, draggedImage);
    newPreviews.splice(index, 0, draggedPreview);
    
    setLaudoImages(newImages);
    setLaudoPreviews(newPreviews);
    setDraggedLaudoIndex(index);
  };

  const handleLaudoDragEnd = () => {
    setDraggedLaudoIndex(null);
  };

  const handleFiles = async (files: FileList | null, type: 'main' | 'laudo') => {
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
      const filesWithMetadata = await Promise.all(validFileList.map(getDicomSortMetadata));
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
        if (type === 'main') {
          setImages(prev => [...prev, ...processedFiles]);
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
        } else {
          setLaudoImages(prev => [...prev, ...processedFiles]);
          const previewUrls = await Promise.all(
            processedFiles.map(file => {
              return new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target?.result as string);
                reader.readAsDataURL(file);
              });
            })
          );
          setLaudoPreviews(prev => [...prev, ...previewUrls]);
        }
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

  const removeLaudoImage = (index: number) => {
    setLaudoImages(prev => prev.filter((_, i) => i !== index));
    setLaudoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setImages([]);
    setPreviews([]);
    setLaudoImages([]);
    setLaudoPreviews([]);
    setExamType('');
    setAge('');
    setSex('');
    setClinicalCase('');
    setComments('');
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
        laudo_files: laudoImages,
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
        clue3: isMinigame ? clue3 : null,
        comments: comments.trim() || null
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden animate-in fade-in duration-200">
      <div className="bg-card w-full h-full flex flex-col relative">
        
        {/* Header Bar */}
        <div className="border-b border-border bg-muted/30 shrink-0">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between py-3 px-6">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary animate-pulse" />
              <h2 className="text-sm font-bold font-heading text-foreground">Enviar Novo Caso Clínico</h2>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Fullscreen Workspace */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-background">
          
          {/* Left Column: Metadata & Images (Scrollable) */}
          <div className="w-full lg:w-[380px] lg:shrink-0 lg:border-r border-border bg-muted/15 overflow-y-auto p-6 space-y-5 lg:h-full max-h-[35vh] lg:max-h-none shrink-0 border-b lg:border-b-0 custom-scrollbar">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1.5">Informações Gerais</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-foreground">Tipo de Exame *</label>
                <Select value={examType} onValueChange={(v) => setExamType(v as ExamType)}>
                  <SelectTrigger className="bg-background border-border h-9 text-xs">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="RX">Raio-X (RX)</SelectItem>
                    <SelectItem value="TC">Tomografia (TC)</SelectItem>
                    <SelectItem value="RM">Ressonância (RM)</SelectItem>
                    <SelectItem value="USG">Ultrassom (USG)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-foreground">Sexo</label>
                <Select value={sex} onValueChange={setSex}>
                  <SelectTrigger className="bg-background border-border h-9 text-xs">
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-foreground">Idade</label>
                <Input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="Ex: 45"
                  className="bg-background border-border h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-foreground">Fonte</label>
                <Input
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="Ex: Radiopaedia"
                  className="bg-background border-border h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-foreground">Diagnóstico (Doença correspondente) *</label>
                <Button 
                  type="button" 
                  variant="link" 
                  size="sm" 
                  className="h-auto p-0 text-[10px] text-primary font-bold flex items-center gap-1 hover:underline"
                  onClick={() => setDiseaseModalOpen(true)}
                >
                  <Plus className="w-3 h-3" /> Cadastrar
                </Button>
              </div>
              <Select value={disease} onValueChange={setDisease}>
                <SelectTrigger className="bg-background border-border h-9 text-xs">
                  <SelectValue placeholder="Selecione o diagnóstico" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border max-h-48">
                  {diseases?.map(d => (
                    <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Imagens Principais */}
            <div className="space-y-2 pt-2 border-t border-border">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">Imagens do Caso</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.dcm,.dicom"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files, 'main')}
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
                    className={`relative w-16 h-16 rounded-md overflow-hidden border transition-all cursor-grab active:cursor-grabbing ${
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
                  className="w-16 h-16 rounded-md border border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
                  type="button"
                >
                  <Upload className="w-4 h-4" />
                  <span className="text-[9px] mt-0.5 font-semibold">Upload</span>
                </button>
              </div>
            </div>

            {/* Imagens Adicionais do Laudo [NOVO] */}
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">Imagens do Laudo</label>
                <span className="text-[9px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.2 rounded font-bold">Laudo apenas</span>
              </div>
              
              <input
                ref={laudoFileInputRef}
                type="file"
                accept="image/*,.dcm,.dicom"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files, 'laudo')}
                disabled={uploading}
              />
              
              <div className="flex flex-wrap gap-2">
                {laudoPreviews.map((src, i) => (
                  <div
                    key={i}
                    draggable={!uploading}
                    onDragStart={(e) => handleLaudoDragStart(e, i)}
                    onDragOver={(e) => handleLaudoDragOver(e, i)}
                    onDragEnd={handleLaudoDragEnd}
                    className={`relative w-16 h-16 rounded-md overflow-hidden border transition-all cursor-grab active:cursor-grabbing ${
                      draggedLaudoIndex === i ? 'opacity-40 border-primary scale-90' : 'border-border'
                    }`}
                  >
                    <img src={src} alt="" className="w-full h-full object-cover" draggable="false" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeLaudoImage(i);
                      }}
                      className="absolute top-0.5 right-0.5 bg-background/80 hover:bg-destructive hover:text-destructive-foreground rounded-full p-0.5 transition-colors"
                      disabled={uploading}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                
                <button
                  onClick={() => !uploading && laudoFileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-16 h-16 rounded-md border border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
                  type="button"
                >
                  <ImagePlus className="w-4 h-4" />
                  <span className="text-[9px] mt-0.5 font-semibold">Upload</span>
                </button>
              </div>
            </div>

          </div>

          {/* Right Column: Writing Area & Quiz (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 lg:h-full custom-scrollbar">
            
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">Caso Clínico *</label>
              <RichTextEditor
                value={clinicalCase}
                onChange={setClinicalCase}
                placeholder="Descreva a história e apresentação clínica do paciente..."
                minHeight="140px"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">Laudo Clínico *</label>
              <RichTextEditor
                value={diagnosis}
                onChange={setDiagnosis}
                placeholder="Escreva a descrição radiológica detalhada (laudo)..."
                minHeight="140px"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">Observações e Comentários Adicionais</label>
              <RichTextEditor
                value={comments}
                onChange={setComments}
                placeholder="Insira comentários adicionais, referências, links, etc..."
                minHeight="110px"
              />
            </div>

            {/* Seção Minigame / Quiz */}
            <div className="pt-5 border-t border-border">
              <div className="flex items-center gap-3 mb-4">
                <input
                  type="checkbox"
                  id="isMinigameToggle"
                  checked={isMinigame}
                  onChange={(e) => setIsMinigame(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                />
                <label htmlFor="isMinigameToggle" className="font-heading text-primary font-bold text-sm cursor-pointer select-none">
                  Ativar Caso no Quiz Radiológico
                </label>
              </div>
              
              {isMinigame && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Dica 1 (Revelada após o 1º erro ou ao pedir dica)</label>
                    <Input 
                      value={clue1} 
                      onChange={e => setClue1(e.target.value)} 
                      placeholder="Dica inicial sobre a história clínica (Ex: Sintoma de início súbito...)" 
                      className="bg-card border-border h-10 text-xs" 
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Dica 2 (Revelada após o 2º erro)</label>
                      <Input 
                        value={clue2} 
                        onChange={e => setClue2(e.target.value)} 
                        placeholder="Dica anatômica ou epidemiológica" 
                        className="bg-card border-border h-10 text-xs" 
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Dica 3 (Revelada após o 3º erro)</label>
                      <Input 
                        value={clue3} 
                        onChange={e => setClue3(e.target.value)} 
                        placeholder="Dica laboratorial ou achado chave" 
                        className="bg-card border-border h-10 text-xs" 
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>

        {/* Action Bar (Footer) */}
        <div className="border-t border-border bg-muted/30 shrink-0 py-3 px-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={uploading || submitCase.isPending} className="px-6 min-w-[130px]">
            {uploading || submitCase.isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> Enviando...
              </>
            ) : (
              'Enviar Caso'
            )}
          </Button>
        </div>

      </div>
      <DiseaseModal open={diseaseModalOpen} onOpenChange={setDiseaseModalOpen} />
    </div>
  );
}
