import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import dicomParser from 'dicom-parser';
import { toast } from 'sonner';
import {
  Save, Download, Upload, RotateCcw, ExternalLink, Plus,
  ChevronLeft, ChevronRight, Crosshair, Tag, Eye, EyeOff,
  Search, Trash2, Edit2, Check, AlertCircle, Layers, Sliders,
  HelpCircle, Compass, Sparkles, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { AnatomyLabel, SliceCoordinate, AnatomyCategory } from '@/types/conrademia';
import { conrademiaService, getCoordinatesForSlice } from '@/services/conrademiaService';
import { AnatomyLeaderOverlay } from '@/components/conrademia/AnatomyLeaderOverlay';

// Presets de Janelamento
const WINDOW_PRESETS = [
  { name: 'Abdome', wc: 40, ww: 400 },
  { name: 'Pulmão', wc: -600, ww: 1500 },
  { name: 'Fígado', wc: 60, ww: 150 },
  { name: 'Osso', wc: 300, ww: 1500 },
];

// Cores pré-definidas para facilidade
const COLOR_PRESETS = [
  '#e74c3c', '#9b59b6', '#2ecc71', '#e67e22', '#3498db',
  '#f39c12', '#1abc9c', '#e91e90', '#00bcd4', '#bdc3c7',
  '#8bc34a', '#795548', '#ff9800', '#4caf50', '#03a9f4',
];

export const ConrademiaAdminEditor: React.FC = () => {
  const navigate = useNavigate();

  // ─── Estados Principais ──────────────────────────────────────────────────
  const [labels, setLabels] = useState<AnatomyLabel[]>([]);
  const [loadingLabels, setLoadingLabels] = useState(true);
  const [currentSlice, setCurrentSlice] = useState(147); // Corte padrão com boa anatomia (1.5mm)
  const [selectedLabelId, setSelectedLabelId] = useState<string | null>('liver');
  const [hoveredLabelId, setHoveredLabelId] = useState<string | null>(null);

  // Modo de clique na imagem: 'pin' (ponto do órgão) ou 'label' (onde fica a etiqueta/linha)
  const [clickMode, setClickMode] = useState<'pin' | 'label'>('pin');
  // Escopo da alteração: 'slice' (somente neste corte) ou 'global' (padrão em todos)
  const [editScope, setEditScope] = useState<'slice' | 'global'>('slice');

  // Filtro e Busca
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'current' | 'all'>('current');

  // Janelamento DICOM
  const [windowCenter, setWindowCenter] = useState(40);
  const [windowWidth, setWindowWidth] = useState(400);

  // Dicionário de DICOMs e Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dicomCache, setDicomCache] = useState<Map<number, any>>(new Map());
  const [loadingSlice, setLoadingSlice] = useState(false);

  // Modais
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [editingLabelData, setEditingLabelData] = useState<Partial<AnatomyLabel> | null>(null);

  // Lista de 295 arquivos DICOM (1.5mm)
  const dicomFiles = useMemo(() => {
    const list: string[] = [];
    for (let i = 95; i <= 389; i++) {
      const num = String(i).padStart(4, '0');
      list.push(`/dicom/Abdome_1.5_B20s-CT-3-${num}.dcm`);
    }
    return list;
  }, []);

  // ─── Carregar Labels Inicialmente ─────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoadingLabels(true);
      const data = await conrademiaService.getLabels();
      setLabels(data);
      setLoadingLabels(false);
    };
    load();
  }, []);

  // ─── Carregar e Renderizar DICOM do corte atual ───────────────────────────
  const renderDicomSlice = useCallback((dicomData: any, wc: number, ww: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !dicomData) return;

    const { rows, cols, pixelData, rescaleIntercept, rescaleSlope } = dicomData;
    canvas.width = cols;
    canvas.height = rows;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.createImageData(cols, rows);
    const data = imageData.data;
    const lower = wc - ww / 2;
    const upper = wc + ww / 2;
    const range = upper - lower;

    for (let i = 0; i < pixelData.length; i++) {
      let hu = pixelData[i] * rescaleSlope + rescaleIntercept;
      let val = hu <= lower ? 0 : hu >= upper ? 255 : ((hu - lower) / range) * 255;
      const idx = i * 4;
      data[idx] = val;
      data[idx + 1] = val;
      data[idx + 2] = val;
      data[idx + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
  }, []);

  const loadSlice = useCallback(async (sliceIndex: number) => {
    if (dicomCache.has(sliceIndex)) {
      renderDicomSlice(dicomCache.get(sliceIndex), windowCenter, windowWidth);
      return;
    }

    const url = dicomFiles[sliceIndex];
    if (!url) return;

    setLoadingSlice(true);
    try {
      const res = await fetch(url);
      const buffer = await res.arrayBuffer();
      const byteArray = new Uint8Array(buffer);
      const dataSet = dicomParser.parseDicom(byteArray);

      const rows = dataSet.uint16('x00280010') || 512;
      const cols = dataSet.uint16('x00280011') || 512;
      const pixelRepresentation = dataSet.uint16('x00280103') || 0;
      const rescaleIntercept = parseFloat(dataSet.string('x00281052') || '0');
      const rescaleSlope = parseFloat(dataSet.string('x00281053') || '1');
      const pixelDataElement = dataSet.elements.x7fe00010;

      if (pixelDataElement) {
        const pixelData = pixelRepresentation === 1
          ? new Int16Array(buffer, pixelDataElement.dataOffset, pixelDataElement.length / 2)
          : new Uint16Array(buffer, pixelDataElement.dataOffset, pixelDataElement.length / 2);

        const parsed = { rows, cols, pixelData, rescaleIntercept, rescaleSlope };
        setDicomCache(prev => new Map(prev).set(sliceIndex, parsed));
        renderDicomSlice(parsed, windowCenter, windowWidth);
      }
    } catch (e) {
      console.error('Erro ao carregar corte DICOM:', e);
    } finally {
      setLoadingSlice(false);
    }
  }, [dicomFiles, dicomCache, windowCenter, windowWidth, renderDicomSlice]);

  useEffect(() => {
    loadSlice(currentSlice);
  }, [currentSlice, loadSlice]);

  // Re-renderizar ao mudar janelamento
  useEffect(() => {
    if (dicomCache.has(currentSlice)) {
      renderDicomSlice(dicomCache.get(currentSlice), windowCenter, windowWidth);
    }
  }, [windowCenter, windowWidth, currentSlice, dicomCache, renderDicomSlice]);

  // ─── Clique na Imagem para Posicionar ─────────────────────────────────────
  const handleCanvasContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedLabelId) {
      toast.info('Selecione primeiro uma estrutura anatômica na lista à direita.');
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const rawX = ((e.clientX - rect.left) / rect.width) * 100;
    const rawY = ((e.clientY - rect.top) / rect.height) * 100;

    const x = Math.round(Math.max(2, Math.min(98, rawX)) * 10) / 10;
    const y = Math.round(Math.max(2, Math.min(98, rawY)) * 10) / 10;

    let targetName = '';

    setLabels(prev => {
      const updated = prev.map(label => {
        if (label.id !== selectedLabelId) return label;
        targetName = label.namePt;

        if (editScope === 'slice') {
          // Altera apenas para este corte
          const existingCustom = label.slicePositions?.[currentSlice] || {
            x: label.x,
            y: label.y,
            labelX: label.labelX,
            labelY: label.labelY,
          };

          const updatedCustom: SliceCoordinate = {
            ...existingCustom,
            ...(clickMode === 'pin' ? { x, y } : { labelX: x, labelY: y }),
          };

          return {
            ...label,
            slicePositions: {
              ...(label.slicePositions || {}),
              [currentSlice]: updatedCustom,
            },
          };
        } else {
          // Altera globalmente (padrão)
          return {
            ...label,
            ...(clickMode === 'pin' ? { x, y } : { labelX: x, labelY: y }),
          };
        }
      });

      // Salva imediatamente no localStorage e sincroniza com abas abertas em tempo real
      conrademiaService.saveLabels(updated);
      return updated;
    });

    if (clickMode === 'pin') {
      toast.success(`🎯 Ponto de "${targetName || 'Estrutura'}" salvo em (${x}%, ${y}%) [${editScope === 'slice' ? `Corte #${currentSlice + 1}` : 'Geral'}]`);
    } else {
      toast.success(`🏷️ Linha/Etiqueta de "${targetName || 'Estrutura'}" salva em (${x}%, ${y}%) [${editScope === 'slice' ? `Corte #${currentSlice + 1}` : 'Geral'}]`);
    }
  };

  // ─── Salvar Alterações ────────────────────────────────────────────────────
  const handleSaveAll = async () => {
    const ok = await conrademiaService.saveLabels(labels);
    if (ok) {
      toast.success('Todas as posições anatômicas foram salvas com sucesso!');
    } else {
      toast.error('Erro ao salvar marcações anatômicas.');
    }
  };

  // ─── Exportar e Importar JSON ─────────────────────────────────────────────
  const handleExportJson = () => {
    const jsonStr = conrademiaService.exportToJson(labels);
    navigator.clipboard.writeText(jsonStr);
    
    // Também faz download do arquivo
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conrademia_anatomia_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success('JSON copiado para a área de transferência e download iniciado!');
  };

  const handleImportJson = () => {
    try {
      const imported = conrademiaService.importFromJson(importJsonText);
      setLabels(imported);
      setIsImportModalOpen(false);
      setImportJsonText('');
      toast.success(`${imported.length} estruturas anatômicas importadas com sucesso!`);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao importar JSON. Verifique a estrutura.');
    }
  };

  const handleResetDefaults = async () => {
    if (!window.confirm('Tem certeza que deseja restaurar as marcações anatômicas originais de fábrica? Todas as edições não exportadas serão perdidas.')) {
      return;
    }
    const defs = await conrademiaService.resetToDefaults();
    setLabels(defs);
    toast.success('Estruturas anatômicas restauradas para os padrões originais.');
  };

  // ─── Criar / Editar Estrutura ─────────────────────────────────────────────
  const handleOpenNewStructure = () => {
    setEditingLabelData({
      id: `structure_${Date.now()}`,
      name: '',
      namePt: '',
      color: COLOR_PRESETS[Math.floor(Math.random() * COLOR_PRESETS.length)],
      sliceRange: [Math.max(0, currentSlice - 10), Math.min(dicomFiles.length - 1, currentSlice + 10)],
      x: 50,
      y: 50,
      labelX: 70,
      labelY: 30,
      description: '',
      category: 'digestivo',
    });
    setIsEditModalOpen(true);
  };

  const handleOpenEditStructure = (label: AnatomyLabel) => {
    setEditingLabelData({ ...label });
    setIsEditModalOpen(true);
  };

  const handleSaveStructureForm = () => {
    if (!editingLabelData?.namePt?.trim()) {
      toast.error('O nome em Português é obrigatório.');
      return;
    }

    const newLabel: AnatomyLabel = {
      id: editingLabelData.id || `structure_${Date.now()}`,
      name: editingLabelData.name || editingLabelData.namePt,
      namePt: editingLabelData.namePt,
      color: editingLabelData.color || '#e74c3c',
      sliceRange: editingLabelData.sliceRange || [0, 90],
      x: editingLabelData.x ?? 50,
      y: editingLabelData.y ?? 50,
      labelX: editingLabelData.labelX,
      labelY: editingLabelData.labelY,
      description: editingLabelData.description || '',
      category: editingLabelData.category || 'outro',
      slicePositions: editingLabelData.slicePositions,
    };

    setLabels(prev => {
      const exists = prev.some(l => l.id === newLabel.id);
      const updated = exists ? prev.map(l => l.id === newLabel.id ? newLabel : l) : [...prev, newLabel];
      conrademiaService.saveLabels(updated);
      return updated;
    });

    setSelectedLabelId(newLabel.id);
    setIsEditModalOpen(false);
    toast.success(`Estrutura "${newLabel.namePt}" salva!`);
  };

  const handleDeleteStructure = (id: string, name: string) => {
    if (!window.confirm(`Deseja realmente remover a estrutura anatômica "${name}"?`)) {
      return;
    }
    setLabels(prev => {
      const updated = prev.filter(l => l.id !== id);
      conrademiaService.saveLabels(updated);
      return updated;
    });
    if (selectedLabelId === id) setSelectedLabelId(null);
    toast.success(`Estrutura "${name}" removida.`);
  };

  const handleClearSliceCustom = (labelId: string) => {
    setLabels(prev => {
      const updated = prev.map(label => {
        if (label.id !== labelId || !label.slicePositions?.[currentSlice]) return label;
        const copy = { ...label.slicePositions };
        delete copy[currentSlice];
        return { ...label, slicePositions: copy };
      });
      conrademiaService.saveLabels(updated);
      return updated;
    });
    toast.info('Ajuste específico deste corte removido. Voltando à coordenada padrão.');
  };

  // ─── Filtros de Lista ─────────────────────────────────────────────────────
  const filteredLabels = useMemo(() => {
    return labels.filter(label => {
      const matchesSearch =
        label.namePt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        label.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (label.description && label.description.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (filterMode === 'current') {
        return currentSlice >= label.sliceRange[0] && currentSlice <= label.sliceRange[1];
      }
      return true;
    });
  }, [labels, searchQuery, filterMode, currentSlice]);

  const selectedLabel = labels.find(l => l.id === selectedLabelId);
  const selectedLabelCoords = selectedLabel ? getCoordinatesForSlice(selectedLabel, currentSlice) : null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ─── Top Header & Global Actions ─────────────────────────────────── */}
      <div className="bg-card border border-border p-5 rounded-2xl shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-primary/20 text-primary">
                <Compass className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-heading font-bold text-foreground">
                Editor de Anatomia Radiológica - Conrademia
              </h2>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Defina o local exato dos órgãos na TC corte a corte, crie linhas indicadoras e adicione novas estruturas anatômicas.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                conrademiaService.saveLabels(labels);
                window.open(`/conrademia?slice=${currentSlice}`, '_blank');
              }}
              className="text-xs flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Testar Visualizador
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportJson}
              className="text-xs flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar JSON
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsImportModalOpen(true)}
              className="text-xs flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              Importar JSON
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetDefaults}
              className="text-xs text-muted-foreground hover:text-destructive"
              title="Restaurar dados originais"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>

            <Button
              onClick={handleSaveAll}
              size="sm"
              className="bg-primary text-primary-foreground font-semibold flex items-center gap-1.5 shadow-md shadow-primary/20"
            >
              <Save className="w-4 h-4" />
              Salvar Alterações
            </Button>
          </div>
        </div>
      </div>

      {/* ─── Main 2-Column Work Area ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ─── COLUNA ESQUERDA / CENTRO: VISUALIZADOR DE TC (8 cols) ──────── */}
        <div className="lg:col-span-8 bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col">
          {/* Controls Bar */}
          <div className="p-3 bg-muted/40 border-b border-border flex flex-wrap items-center justify-between gap-3">
            {/* Slice navigator */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="w-8 h-8 shrink-0"
                onClick={() => setCurrentSlice(prev => Math.max(0, prev - 1))}
                disabled={currentSlice === 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-1.5 text-xs font-mono">
                <span className="text-muted-foreground font-sans">Corte:</span>
                <span className="font-bold text-foreground bg-background px-2 py-1 rounded border border-border">
                  {currentSlice + 1} / {dicomFiles.length}
                </span>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="w-8 h-8 shrink-0"
                onClick={() => setCurrentSlice(prev => Math.min(dicomFiles.length - 1, prev + 1))}
                disabled={currentSlice === dicomFiles.length - 1}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Window presets */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-muted-foreground mr-1 hidden sm:inline">Janela:</span>
              {WINDOW_PRESETS.map(preset => (
                <button
                  key={preset.name}
                  onClick={() => {
                    setWindowCenter(preset.wc);
                    setWindowWidth(preset.ww);
                  }}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    windowCenter === preset.wc && windowWidth === preset.ww
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  }`}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Slider Bar */}
          <div className="px-4 py-2.5 bg-muted/20 border-b border-border">
            <Slider
              value={[currentSlice]}
              onValueChange={([v]) => setCurrentSlice(v)}
              min={0}
              max={dicomFiles.length - 1}
              step={1}
              className="w-full"
            />
          </div>

          {/* Active Tool / Placement Mode Banner */}
          <div className="p-3 bg-primary/10 border-b border-primary/20 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {selectedLabel ? (
                <>
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-white/50 shrink-0"
                    style={{ backgroundColor: selectedLabel.color }}
                  />
                  <span className="text-xs font-semibold text-foreground">
                    Editando: <span className="text-primary">{selectedLabel.namePt}</span>
                  </span>
                </>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Selecione um órgão na lista à direita para posicionar.
                </span>
              )}
            </div>

            {/* Mode selection buttons */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setClickMode('pin')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-all ${
                  clickMode === 'pin'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-background border border-border text-muted-foreground hover:text-foreground'
                }`}
                title="Clique na imagem para marcar o local exato do órgão"
              >
                <Crosshair className="w-3.5 h-3.5" />
                🎯 Ponto do Órgão
              </button>

              <button
                onClick={() => setClickMode('label')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-all ${
                  clickMode === 'label'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-background border border-border text-muted-foreground hover:text-foreground'
                }`}
                title="Clique fora da imagem para posicionar onde o nome e a linha indicadora devem ir"
              >
                <Tag className="w-3.5 h-3.5" />
                🏷️ Linha / Etiqueta
              </button>

              {/* Scope */}
              <div className="ml-2 pl-2 border-l border-border flex items-center gap-1 text-[11px]">
                <button
                  onClick={() => setEditScope('slice')}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    editScope === 'slice'
                      ? 'bg-green-500/20 text-green-400 font-bold border border-green-500/40'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Salva a coordenada exclusivamente para este corte (#)"
                >
                  Só Corte #{currentSlice + 1}
                </button>
                <button
                  onClick={() => setEditScope('global')}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    editScope === 'global'
                      ? 'bg-amber-500/20 text-amber-400 font-bold border border-amber-500/40'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Define a coordenada padrão de todos os cortes do órgão"
                >
                  Padrão Geral
                </button>
              </div>
            </div>
          </div>

          {/* Interactive CT Image Canvas Container with side margin space for leader lines */}
          <div
            className="relative bg-black flex items-center justify-center min-h-[540px] py-6 px-32 select-none overflow-visible rounded-xl"
            onWheel={(e) => {
              e.preventDefault();
              if (e.deltaY > 0) {
                setCurrentSlice(prev => Math.min(dicomFiles.length - 1, prev + 1));
              } else {
                setCurrentSlice(prev => Math.max(0, prev - 1));
              }
            }}
          >
            {loadingSlice && (
              <div className="absolute inset-0 bg-black/60 z-30 flex items-center justify-center">
                <span className="text-xs text-muted-foreground animate-pulse">Carregando corte...</span>
              </div>
            )}

            {/* Clickable Image Box with 1:1 Aspect Ratio */}
            <div
              ref={containerRef}
              onClick={handleCanvasContainerClick}
              className="relative cursor-crosshair max-w-[460px] w-full aspect-square border border-white/20 shadow-2xl overflow-visible"
              title="Clique para posicionar a coordenada do órgão selecionado"
            >
              <canvas
                ref={canvasRef}
                className="w-full h-full block"
                style={{ imageRendering: 'pixelated' }}
              />

              {/* Overlaid Anatomy Leader Lines & Badges */}
              <AnatomyLeaderOverlay
                labels={labels}
                currentSlice={currentSlice}
                selectedLabelId={selectedLabelId}
                hoveredLabelId={hoveredLabelId}
                onSelectLabel={setSelectedLabelId}
                onHoverLabel={setHoveredLabelId}
                showAllAlways={true}
                isEditMode={true}
              />
            </div>
          </div>

          {/* Help Footer */}
          <div className="p-3 bg-muted/20 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-primary" />
              <span>
                <strong>Modo de uso:</strong> Selecione o órgão na lista. Clique na imagem para definir o ponto anatômico ou a posição da linha.
              </span>
            </div>
            {selectedLabelCoords && (
              <span className="font-mono text-[10px]">
                Pino: ({selectedLabelCoords.pinX}%, {selectedLabelCoords.pinY}%) | Etiqueta: ({selectedLabelCoords.labelX}%, {selectedLabelCoords.labelY}%)
              </span>
            )}
          </div>
        </div>

        {/* ─── COLUNA DIREITA: LISTA E GERENCIADOR DE ESTRUTURAS (4 cols) ─── */}
        <div className="lg:col-span-4 bg-card border border-border rounded-2xl p-4 shadow-sm flex flex-col space-y-4">
          {/* Header of List */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading font-bold text-sm text-foreground flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                Estruturas Anatômicas ({labels.length})
              </h3>
              <p className="text-xs text-muted-foreground">
                {labels.filter(l => currentSlice >= l.sliceRange[0] && currentSlice <= l.sliceRange[1]).length} presentes no corte #{currentSlice + 1}
              </p>
            </div>

            <Button
              onClick={handleOpenNewStructure}
              size="sm"
              className="bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30 text-xs flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Nova Estrutura
            </Button>
          </div>

          {/* Search and Tabs */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar órgão ou estrutura..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-8 bg-background"
              />
            </div>

            <div className="flex bg-muted p-0.5 rounded-lg text-xs">
              <button
                onClick={() => setFilterMode('current')}
                className={`flex-1 py-1 rounded-md transition-colors font-medium ${
                  filterMode === 'current'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Neste Corte ({labels.filter(l => currentSlice >= l.sliceRange[0] && currentSlice <= l.sliceRange[1]).length})
              </button>
              <button
                onClick={() => setFilterMode('all')}
                className={`flex-1 py-1 rounded-md transition-colors font-medium ${
                  filterMode === 'all'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Todos ({labels.length})
              </button>
            </div>
          </div>

          {/* Organ Cards List */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
            {filteredLabels.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs">
                Nenhuma estrutura encontrada neste filtro.
              </div>
            ) : (
              filteredLabels.map(label => {
                const isSelected = selectedLabelId === label.id;
                const isVisible = currentSlice >= label.sliceRange[0] && currentSlice <= label.sliceRange[1];
                const hasCustomThisSlice = !!label.slicePositions?.[currentSlice];
                const customSlicesCount = label.slicePositions ? Object.keys(label.slicePositions).length : 0;

                return (
                  <div
                    key={label.id}
                    onClick={() => setSelectedLabelId(label.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-primary bg-primary/10 shadow-sm'
                        : 'border-border bg-card/60 hover:bg-muted/40 hover:border-border/80'
                    } ${!isVisible ? 'opacity-50' : 'opacity-100'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: label.color }}
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-foreground">
                              {label.namePt}
                            </span>
                            {isVisible && (
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500" title="Visível no corte atual" />
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground block capitalize">
                            {label.category || 'Anatomia'} • Cortes {label.sliceRange[0] + 1}-{label.sliceRange[1] + 1}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-6 h-6 text-muted-foreground hover:text-foreground"
                          onClick={() => handleOpenEditStructure(label)}
                          title="Editar propriedades"
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-6 h-6 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteStructure(label.id, label.namePt)}
                          title="Excluir estrutura"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Status Tags */}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
                      {hasCustomThisSlice && (
                        <span className="px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 font-medium flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" />
                          Calibrado no corte #{currentSlice + 1}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClearSliceCustom(label.id);
                            }}
                            className="hover:text-destructive ml-0.5"
                            title="Voltar ao padrão"
                          >
                            ×
                          </button>
                        </span>
                      )}

                      {customSlicesCount > 0 && !hasCustomThisSlice && (
                        <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {customSlicesCount} corte(s) calibrado(s)
                        </span>
                      )}

                      {isSelected && (
                        <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary font-bold ml-auto">
                          Selecionado
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ─── MODAL: CRIAR / EDITAR ESTRUTURA ─────────────────────────────── */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingLabelData?.id && labels.some(l => l.id === editingLabelData.id)
                ? 'Editar Estrutura Anatômica'
                : 'Nova Estrutura Anatômica'}
            </DialogTitle>
            <DialogDescription>
              Configure o nome, intervalo de cortes e cores da estrutura.
            </DialogDescription>
          </DialogHeader>

          {editingLabelData && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Nome em Português *</label>
                  <Input
                    value={editingLabelData.namePt || ''}
                    onChange={e => setEditingLabelData(prev => ({ ...prev, namePt: e.target.value }))}
                    placeholder="Ex: Fígado, Aorta..."
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Nome em Inglês</label>
                  <Input
                    value={editingLabelData.name || ''}
                    onChange={e => setEditingLabelData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Liver, Aorta..."
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Color Selection */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Cor da Marcação</label>
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {COLOR_PRESETS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setEditingLabelData(prev => ({ ...prev, color }))}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${
                        editingLabelData.color === color ? 'scale-125 border-white' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  <Input
                    type="color"
                    value={editingLabelData.color || '#e74c3c'}
                    onChange={e => setEditingLabelData(prev => ({ ...prev, color: e.target.value }))}
                    className="w-8 h-8 p-0 border-0 rounded cursor-pointer ml-1"
                  />
                </div>
              </div>

              {/* Slice Range */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-foreground">Intervalo de Cortes (Visibilidade)</label>
                  <span className="text-xs font-mono text-primary font-bold">
                    Corte {(editingLabelData.sliceRange?.[0] ?? 0) + 1} até {(editingLabelData.sliceRange?.[1] ?? 90) + 1}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Corte Inicial:</span>
                    <Input
                      type="number"
                      min={1}
                      max={91}
                      value={(editingLabelData.sliceRange?.[0] ?? 0) + 1}
                      onChange={e => {
                        const val = Math.max(0, Math.min(90, parseInt(e.target.value || '1', 10) - 1));
                        setEditingLabelData(prev => ({
                          ...prev,
                          sliceRange: [val, Math.max(val, prev?.sliceRange?.[1] ?? 90)],
                        }));
                      }}
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Corte Final:</span>
                    <Input
                      type="number"
                      min={1}
                      max={91}
                      value={(editingLabelData.sliceRange?.[1] ?? 90) + 1}
                      onChange={e => {
                        const val = Math.max(0, Math.min(90, parseInt(e.target.value || '91', 10) - 1));
                        setEditingLabelData(prev => ({
                          ...prev,
                          sliceRange: [Math.min(val, prev?.sliceRange?.[0] ?? 0), val],
                        }));
                      }}
                      className="text-xs"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-[10px] h-6"
                    onClick={() => {
                      setEditingLabelData(prev => ({
                        ...prev,
                        sliceRange: [currentSlice, Math.max(currentSlice, prev?.sliceRange?.[1] ?? 90)],
                      }));
                    }}
                  >
                    Usar corte atual (#{currentSlice + 1}) como inicial
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-[10px] h-6"
                    onClick={() => {
                      setEditingLabelData(prev => ({
                        ...prev,
                        sliceRange: [Math.min(currentSlice, prev?.sliceRange?.[0] ?? 0), currentSlice],
                      }));
                    }}
                  >
                    Usar corte atual (#{currentSlice + 1}) como final
                  </Button>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Descrição Anatômica / Clínicas</label>
                <Textarea
                  value={editingLabelData.description || ''}
                  onChange={e => setEditingLabelData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Informações relevantes, marcos anatômicos ou dicas radiológicas..."
                  rows={3}
                  className="text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveStructureForm} className="bg-primary text-primary-foreground">
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: IMPORTAR JSON ────────────────────────────────────────── */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Importar Estruturas Anatômicas (JSON)</DialogTitle>
            <DialogDescription>
              Cole abaixo o JSON com as coordenadas e estruturas salvas anteriormente.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <Textarea
              value={importJsonText}
              onChange={e => setImportJsonText(e.target.value)}
              placeholder="Cole aqui o array JSON com as marcações..."
              rows={12}
              className="font-mono text-xs"
            />
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsImportModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleImportJson} className="bg-primary text-primary-foreground">
              Importar e Aplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
