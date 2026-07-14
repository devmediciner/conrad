import { useState, useEffect, useRef } from 'react';
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
import { Loader2, X, ImagePlus, Activity, Plus } from 'lucide-react';
import { useUpdateCase, uploadCaseImage } from '@/hooks/useCases';
import { useDiseases } from '@/hooks/useGame';
import { toast } from 'sonner';
import type { Case, ExamType } from '@/types/case';
import { convertDicomToJpeg, getDicomSortMetadata, sortFilesByDicomMetadata } from '@/utils/dicom';
import { supabase } from '@/integrations/supabase/client';
import { DiseaseModal } from './DiseaseModal';

interface EditCaseModalProps {
  caseData: Case | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditCaseModal({ caseData, open, onOpenChange }: EditCaseModalProps) {
  const updateCase = useUpdateCase();
  const { data: diseases } = useDiseases();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const laudoFileInputRef = useRef<HTMLInputElement>(null);

  const [examType, setExamType] = useState<ExamType>('RX');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('');
  const [clinicalCase, setClinicalCase] = useState('');
  const [comments, setComments] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [author, setAuthor] = useState('');
  const [imageSource, setImageSource] = useState('');

  // Main Images
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [newlyUploadedImages, setNewlyUploadedImages] = useState<string[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Laudo Images
  const [laudoImages, setLaudoImages] = useState<string[]>([]);
  const [newlyUploadedLaudoImages, setNewlyUploadedLaudoImages] = useState<string[]>([]);
  const [draggedLaudoIndex, setDraggedLaudoIndex] = useState<number | null>(null);

  // Game fields
  const [isMinigame, setIsMinigame] = useState(false);
  const [disease, setDisease] = useState('');
  const [diseaseModalOpen, setDiseaseModalOpen] = useState(false);
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
    const [draggedImage] = newImages.splice(draggedIndex, 1);
    newImages.splice(index, 0, draggedImage);

    setImages(newImages);
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
    const [draggedImage] = newImages.splice(draggedLaudoIndex, 1);
    newImages.splice(index, 0, draggedImage);

    setLaudoImages(newImages);
    setDraggedLaudoIndex(index);
  };

  const handleLaudoDragEnd = () => {
    setDraggedLaudoIndex(null);
  };

  useEffect(() => {
    if (caseData) {
      setExamType(caseData.exam_type);
      setAge(caseData.age?.toString() ?? '');
      setSex(caseData.sex ?? '');
      setClinicalCase(caseData.clinical_case);
      setComments(caseData.comments ?? '');
      setDiagnosis(caseData.diagnosis);
      setAuthor(caseData.author ?? '');
      setImageSource(caseData.image_source ?? '');
      setImages(caseData.images ?? []);
      setLaudoImages(caseData.laudo_images ?? []);
      setIsMinigame(!!caseData.disease);
      setDisease(caseData.disease ?? '');
      setClue1(caseData.clue1 ?? '');
      setClue2(caseData.clue2 ?? '');
      setClue3(caseData.clue3 ?? '');
      setNewlyUploadedImages([]);
      setNewlyUploadedLaudoImages([]);
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
      const filesWithMetadata = await Promise.all(validFileList.map(getDicomSortMetadata));
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

  const handleAddLaudoImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      const filesWithMetadata = await Promise.all(validFileList.map(getDicomSortMetadata));
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
        setLaudoImages(prev => [...prev, ...newUrls]);
        setNewlyUploadedLaudoImages(prev => [...prev, ...newUrls]);
        toast.success(`${newUrls.length} imagem(ns) de laudo adicionada(s)`);
      }
    } catch {
      toast.error('Erro ao enviar imagem de laudo');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    const removedUrl = images[index];
    setImages(prev => prev.filter((_, i) => i !== index));

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

  const handleRemoveLaudoImage = (index: number) => {
    const removedUrl = laudoImages[index];
    setLaudoImages(prev => prev.filter((_, i) => i !== index));

    if (newlyUploadedLaudoImages.includes(removedUrl)) {
      const fileName = removedUrl.split('/').pop();
      if (fileName) {
        supabase.storage
          .from('radiology-images')
          .remove([fileName])
          .then(({ error }) => {
            if (error) console.error("Erro ao deletar imagem de laudo removida do storage:", error);
          });
      }
      setNewlyUploadedLaudoImages(prev => prev.filter(url => url !== removedUrl));
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
        laudo_images: laudoImages,
        disease: disease || null,
        clue1: isMinigame ? (clue1.trim() || clinicalCase) : null,
        clue2: isMinigame ? clue2 : null,
        clue3: isMinigame ? clue3 : null,
        comments: comments.trim() || null,
        author: author.trim() || null,
        image_source: imageSource.trim() || null
      });
      toast.success('Caso atualizado com sucesso');
      setNewlyUploadedImages([]);
      setNewlyUploadedLaudoImages([]);
      onOpenChange(false);
    } catch {
      toast.error('Erro ao atualizar caso');
    }
  };

  const handleOpenChange = async (isOpen: boolean) => {
    if (!isOpen) {
      if (newlyUploadedImages.length > 0) {
        const fileNames = newlyUploadedImages
          .map(url => url.split('/').pop())
          .filter(Boolean) as string[];

        if (fileNames.length > 0) {
          supabase.storage
            .from('radiology-images')
            .remove(fileNames)
            .catch(e => console.error("Erro ao limpar imagens órfãs:", e));
        }
      }
      if (newlyUploadedLaudoImages.length > 0) {
        const fileNames = newlyUploadedLaudoImages
          .map(url => url.split('/').pop())
          .filter(Boolean) as string[];

        if (fileNames.length > 0) {
          supabase.storage
            .from('radiology-images')
            .remove(fileNames)
            .catch(e => console.error("Erro ao limpar imagens órfãs do laudo:", e));
        }
      }
      setNewlyUploadedImages([]);
      setNewlyUploadedLaudoImages([]);
      onOpenChange(false);
    } else {
      onOpenChange(true);
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
              <h2 className="text-sm font-bold font-heading text-foreground">Editar Caso Radiológico</h2>
            </div>
            <Button variant="ghost" size="icon" onClick={() => handleOpenChange(false)} className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Fullscreen Workspace */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-background">

          {/* Left Column: Metadata & Images (Scrollable) */}
          <div className="w-full lg:w-[380px] lg:shrink-0 lg:border-r border-border bg-muted/15 overflow-y-auto p-6 space-y-5 lg:h-full max-h-[35vh] lg:max-h-none shrink-0 border-b lg:border-b-0 custom-scrollbar">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1.5">Informações do Caso</h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-foreground">Tipo de Exame</label>
                <Select value={examType} onValueChange={(v) => setExamType(v as ExamType)}>
                  <SelectTrigger className="bg-background border-border h-9 text-xs">
                    <SelectValue />
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

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-foreground">Idade</label>
              <Input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="bg-background border-border h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-foreground">Elaborado por (Autor)</label>
                <Input
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Ex: Dr. Fulano / Liga CONRAD"
                  className="bg-background border-border h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-foreground">Fonte da Imagem</label>
                <Input
                  value={imageSource}
                  onChange={(e) => setImageSource(e.target.value)}
                  placeholder="Ex: Radiopaedia / Arquivo Pessoal"
                  className="bg-background border-border h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-foreground">Diagnóstico *</label>
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

            {/* Imagens do Caso */}
            <div className="space-y-2 pt-2 border-t border-border">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">Imagens do Caso</label>
              <div className="flex flex-wrap gap-2">
                {images.map((img, i) => (
                  <div
                    key={i}
                    draggable={!uploading}
                    onDragStart={(e) => handleDragStart(e, i)}
                    onDragOver={(e) => handleDragOver(e, i)}
                    onDragEnd={handleDragEnd}
                    className={`relative w-16 h-16 rounded-md overflow-hidden border transition-all cursor-grab active:cursor-grabbing group ${draggedIndex === i ? 'opacity-40 border-primary scale-90' : 'border-border'
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

                <label className="w-16 h-16 rounded-md border border-dashed border-border hover:border-primary flex flex-col items-center justify-center cursor-pointer transition-colors text-muted-foreground hover:text-primary">
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <ImagePlus className="w-4 h-4" />
                      <span className="text-[9px] mt-0.5 font-semibold">Upload</span>
                    </>
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

            {/* Imagens do Laudo */}
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">Imagens Detalhadas</label>
                <span className="text-[9px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.2 rounded font-bold">Detalhada apenas</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {laudoImages.map((img, i) => (
                  <div
                    key={i}
                    draggable={!uploading}
                    onDragStart={(e) => handleLaudoDragStart(e, i)}
                    onDragOver={(e) => handleLaudoDragOver(e, i)}
                    onDragEnd={handleLaudoDragEnd}
                    className={`relative w-16 h-16 rounded-md overflow-hidden border transition-all cursor-grab active:cursor-grabbing group ${draggedLaudoIndex === i ? 'opacity-40 border-primary scale-90' : 'border-border'
                      }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" draggable="false" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveLaudoImage(i);
                      }}
                      className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                <label className="w-16 h-16 rounded-md border border-dashed border-border hover:border-primary flex flex-col items-center justify-center cursor-pointer transition-colors text-muted-foreground hover:text-primary">
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <ImagePlus className="w-4 h-4" />
                      <span className="text-[9px] mt-0.5 font-semibold">Upload</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*,.dcm,.dicom"
                    multiple
                    onChange={handleAddLaudoImages}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              </div>
            </div>

          </div>

          {/* Right Column: Writing Area & Quiz (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 lg:h-full custom-scrollbar">

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">Caso Clínico</label>
              <RichTextEditor
                value={clinicalCase}
                onChange={setClinicalCase}
                minHeight="140px"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">Laudo *</label>
              <RichTextEditor
                value={diagnosis}
                onChange={setDiagnosis}
                minHeight="140px"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">Comentários</label>
              <RichTextEditor
                value={comments}
                onChange={setComments}
                minHeight="110px"
              />
            </div>

            {/* Seção Minigame */}
            <div className="pt-5 border-t border-border">
              <div className="flex items-center gap-3 mb-4">
                <input
                  type="checkbox"
                  id="editIsMinigameToggle"
                  checked={isMinigame}
                  onChange={(e) => setIsMinigame(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                />
                <label htmlFor="editIsMinigameToggle" className="font-heading text-primary font-bold text-sm cursor-pointer select-none">
                  Disponível no Quiz Radiológico
                </label>
              </div>

              {isMinigame && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Dica 1 (Após 1º erro)</label>
                    <Input
                      value={clue1}
                      onChange={e => setClue1(e.target.value)}
                      placeholder="Dica inicial sobre a história clínica"
                      className="bg-card border-border h-10 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Dica 2 (Após 2º erro)</label>
                      <Input
                        value={clue2}
                        onChange={e => setClue2(e.target.value)}
                        placeholder="Dica anatômica ou epidemiológica"
                        className="bg-card border-border h-10 text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Dica 3 (Após 3º erro)</label>
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
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={updateCase.isPending || uploading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={updateCase.isPending || uploading} className="px-6 min-w-[130px]">
            {updateCase.isPending ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> Salvando...</>
            ) : (
              'Salvar Alterações'
            )}
          </Button>
        </div>

      </div>
      <DiseaseModal open={diseaseModalOpen} onOpenChange={setDiseaseModalOpen} />
    </div>
  );
}
