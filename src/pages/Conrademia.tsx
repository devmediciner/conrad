import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  ArrowLeft, Sun, Contrast, ZoomIn, ZoomOut, RotateCcw, Move,
  Crosshair, Eye, EyeOff, MapPin, Search, ChevronLeft, ChevronRight,
  ChevronUp, ChevronDown,
  Layers, Maximize2, Minimize2, MousePointer, Hand, Info, X,
  Compass, Edit2, Sparkles, Tag, Palette
} from 'lucide-react';
import dicomParser from 'dicom-parser';
import { useAuth } from '@/hooks/authContent';
import { AnatomyLabel } from '@/types/conrademia';
import { conrademiaService, ViewingPlane, PLANE_CONFIG } from '@/services/conrademiaService';
import { AnatomyLeaderOverlay } from '@/components/conrademia/AnatomyLeaderOverlay';
import { ConrademiaHub } from '@/components/conrademia/ConrademiaHub';

// Anatomy labels are now dynamically managed via conrademiaService and Admin Editor

// ─── DICOM Parsing Utilities ───────────────────────────────────────────────
function parseDicomPixelData(arrayBuffer: ArrayBuffer) {
  const byteArray = new Uint8Array(arrayBuffer);
  const dataSet = dicomParser.parseDicom(byteArray);

  const rows = dataSet.uint16('x00280010') || 512;
  const cols = dataSet.uint16('x00280011') || 512;
  const bitsAllocated = dataSet.uint16('x00280100') || 16;
  const bitsStored = dataSet.uint16('x00280101') || 12;
  const highBit = dataSet.uint16('x00280102') || 11;
  const pixelRepresentation = dataSet.uint16('x00280103') || 0;
  const rescaleIntercept = parseFloat(dataSet.string('x00281052') || '0');
  const rescaleSlope = parseFloat(dataSet.string('x00281053') || '1');
  const windowCenter = parseFloat((dataSet.string('x00281050') || '40').split('\\')[0]);
  const windowWidth = parseFloat((dataSet.string('x00281051') || '400').split('\\')[0]);
  const instanceNumber = dataSet.intString('x00200013') || 0;
  const sliceLocation = parseFloat(dataSet.string('x00201041') || '0');

  const pixelDataElement = dataSet.elements.x7fe00010;
  if (!pixelDataElement) {
    throw new Error('No pixel data found in DICOM file');
  }

  let pixelData: Int16Array | Uint16Array;
  if (pixelRepresentation === 1) {
    pixelData = new Int16Array(
      arrayBuffer,
      pixelDataElement.dataOffset,
      pixelDataElement.length / 2
    );
  } else {
    pixelData = new Uint16Array(
      arrayBuffer,
      pixelDataElement.dataOffset,
      pixelDataElement.length / 2
    );
  }

  return {
    rows,
    cols,
    pixelData,
    rescaleIntercept,
    rescaleSlope,
    windowCenter,
    windowWidth,
    instanceNumber,
    sliceLocation,
    bitsStored,
  };
}

function renderDicomToCanvas(
  canvas: HTMLCanvasElement,
  dicomData: ReturnType<typeof parseDicomPixelData>,
  wc: number,
  ww: number,
  invert: boolean = false
) {
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
    let val: number;

    if (hu <= lower) {
      val = 0;
    } else if (hu >= upper) {
      val = 255;
    } else {
      val = ((hu - lower) / range) * 255;
    }

    if (invert) val = 255 - val;

    const idx = i * 4;
    data[idx] = val;
    data[idx + 1] = val;
    data[idx + 2] = val;
    data[idx + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);
}

// ─── Window Presets ────────────────────────────────────────────────────────
interface WindowPreset {
  name: string;
  wc: number;
  ww: number;
  icon: string;
  contrast: number;
  brightness: number;
  description: string;
}

const WINDOW_PRESETS: WindowPreset[] = [
  { name: 'Abdome', wc: 40, ww: 400, icon: '🫁', contrast: 1.0, brightness: 1.0, description: 'Partes Moles (Padrão)' },
  { name: 'Fígado', wc: 60, ww: 150, icon: '🟤', contrast: 2.2, brightness: 0.95, description: 'Contraste Hepático' },
  { name: 'Osso', wc: 300, ww: 1500, icon: '🦴', contrast: 1.85, brightness: 0.62, description: 'Estruturas Ósseas' },
  { name: 'Pulmão', wc: -600, ww: 1500, icon: '💨', contrast: 1.45, brightness: 1.8, description: 'Bases Pulmonares' },
  { name: 'Mediastino', wc: 50, ww: 350, icon: '❤️', contrast: 1.25, brightness: 0.95, description: 'Gordura e Vasos' },
  { name: 'Vasos', wc: 100, ww: 500, icon: '🩸', contrast: 1.6, brightness: 1.1, description: 'Aorta e Cava' },
];

// ─── Tool Enum ─────────────────────────────────────────────────────────────
type ViewerTool = 'scroll' | 'windowing' | 'zoom' | 'pan' | 'pin';

// ═══════════════════════════════════════════════════════════════════════════
// Viewer Component
// ═══════════════════════════════════════════════════════════════════════════
function ConrademiaViewer() {
  const navigate = useNavigate();

  // ─── Plane State (Axial, Coronal, Sagittal) ───────────────────────────
  const [currentPlane, setCurrentPlane] = useState<ViewingPlane>('axial');
  const planeInfo = PLANE_CONFIG[currentPlane];
  const totalSlices = planeInfo.totalSlices;

  // ─── State ─────────────────────────────────────────────────────────────
  const [showColors, setShowColors] = useState(true);
  const [currentSlice, setCurrentSlice] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const sliceParam = params.get('slice');
    if (sliceParam !== null) {
      const parsed = parseInt(sliceParam, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed < PLANE_CONFIG.axial.totalSlices) {
        return parsed;
      }
    }
    return PLANE_CONFIG.axial.defaultSlice;
  });
  const [loading, setLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(100);

  // Viewer state
  const [windowCenter, setWindowCenter] = useState(40);
  const [windowWidth, setWindowWidth] = useState(400);
  const [zoom, setZoom] = useState(1.15);
  const [colorOpacity, setColorOpacity] = useState(0.65);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [invert, setInvert] = useState(false);
  const [activeTool, setActiveTool] = useState<ViewerTool>('scroll');

  // Labels
  const { isAdmin } = useAuth();
  const [anatomyLabels, setAnatomyLabels] = useState<AnatomyLabel[]>([]);
  const [showLabels, setShowLabels] = useState(true);
  const [showAllLines, setShowAllLines] = useState(true);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 1024 : true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ─── CT Windowing CSS Filter ───────────────────────────────────────────
  const ctFilterStyle = useMemo(() => {
    const preset = WINDOW_PRESETS.find(p => p.wc === windowCenter && p.ww === windowWidth);
    let contrastFactor: number;
    let brightnessFactor: number;

    if (preset) {
      contrastFactor = preset.contrast;
      brightnessFactor = preset.brightness;
    } else {
      // Dynamic computation for manual Janela drag tool
      contrastFactor = Math.max(0.35, Math.min(3.5, 400 / Math.max(40, windowWidth)));
      const wcDelta = 40 - windowCenter;
      if (wcDelta >= 0) {
        brightnessFactor = Math.min(2.5, 1.0 + (wcDelta / 640) * 0.9);
      } else {
        brightnessFactor = Math.max(0.4, 1.0 + (wcDelta / 400) * 0.5);
      }
    }

    let filterStr = `contrast(${contrastFactor.toFixed(2)}) brightness(${brightnessFactor.toFixed(2)})`;
    if (invert) {
      filterStr += ' invert(1)';
    }
    return filterStr;
  }, [windowCenter, windowWidth, invert]);

  // Carregar labels para o plano ativo
  useEffect(() => {
    conrademiaService.getLabels(currentPlane).then(setAnatomyLabels);
    const unsub = conrademiaService.onUpdate((detail: any) => {
      if (Array.isArray(detail)) {
        setAnatomyLabels(detail);
      } else if (detail && detail.plane === currentPlane && Array.isArray(detail.labels)) {
        setAnatomyLabels(detail.labels);
      }
    });
    return () => unsub();
  }, [currentPlane]);

  // Alternar plano de visualização
  const handlePlaneChange = useCallback((newPlane: ViewingPlane) => {
    if (newPlane === currentPlane) return;
    setCurrentPlane(newPlane);
    const config = PLANE_CONFIG[newPlane];
    setCurrentSlice(config.defaultSlice);
    setSelectedLabel(null);
    setHoveredLabel(null);
    conrademiaService.getLabels(newPlane).then(setAnatomyLabels);
  }, [currentPlane]);

  // Interaction refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // ─── Preload Nearby Slices for Instant 60fps Scrubbing ─────────────────
  useEffect(() => {
    for (let offset = -8; offset <= 8; offset++) {
      const s = currentSlice + offset;
      if (s >= 0 && s < totalSlices) {
        const imgColored = new Image();
        imgColored.src = `/slices/${currentPlane}/colored/slice_${String(s).padStart(3, '0')}.webp`;
        const imgPlain = new Image();
        imgPlain.src = `/slices/${currentPlane}/plain/slice_${String(s).padStart(3, '0')}.webp`;
      }
    }
  }, [currentSlice, currentPlane, totalSlices]);

  // ─── Visible Labels for Current Slice ──────────────────────────────────
  const visibleLabels = useMemo(() => {
    return anatomyLabels.filter(
      label => currentSlice >= label.sliceRange[0] && currentSlice <= label.sliceRange[1]
    );
  }, [anatomyLabels, currentSlice]);

  const selectedLabelData = useMemo(
    () => anatomyLabels.find(l => l.id === selectedLabel),
    [anatomyLabels, selectedLabel]
  );

  // ─── Filtered Labels for Search ────────────────────────────────────────
  const filteredLabels = useMemo(() => {
    if (!searchTerm) return anatomyLabels;
    const term = searchTerm.toLowerCase();
    return anatomyLabels.filter(
      l => l.name.toLowerCase().includes(term) ||
           l.namePt.toLowerCase().includes(term)
    );
  }, [anatomyLabels, searchTerm]);

  // ─── Mouse/Touch Handlers ─────────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    lastMousePos.current = { x: e.clientX, y: e.clientY };

    if (activeTool === 'windowing') {
      setWindowWidth(prev => Math.max(1, prev + dx * 2));
      setWindowCenter(prev => prev - dy * 2);
    } else if (activeTool === 'pan') {
      setPanOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    } else if (activeTool === 'zoom') {
      const zoomDelta = -dy * 0.005;
      setZoom(prev => Math.max(0.2, Math.min(5, prev + zoomDelta)));
    }
  }, [activeTool]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  // ─── Scroll for Slices ─────────────────────────────────────────────────
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (activeTool === 'zoom') {
      const zoomDelta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(prev => Math.max(0.2, Math.min(5, prev + zoomDelta)));
    } else {
      const delta = e.deltaY > 0 ? 1 : -1;
      setCurrentSlice(prev => Math.max(0, Math.min(totalSlices - 1, prev + delta)));
    }
  }, [activeTool, totalSlices]);

  // ─── Keyboard Shortcuts ────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'ArrowLeft':
          e.preventDefault();
          setCurrentSlice(prev => Math.max(0, prev - 1));
          break;
        case 'ArrowDown':
        case 'ArrowRight':
          e.preventDefault();
          setCurrentSlice(prev => Math.min(totalSlices - 1, prev + 1));
          break;
        case 'r':
          resetView();
          break;
        case 'l':
          setShowLabels(prev => !prev);
          break;
        case 'i':
          setInvert(prev => !prev);
          break;
        case 'f':
          toggleFullscreen();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [totalSlices]);

  // ─── Ultra-thin PC Scrubber Handlers (PACS style) ──────────────────────
  const scrubberTrackRef = useRef<HTMLDivElement>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [isHoveringScrubber, setIsHoveringScrubber] = useState(false);

  const updateSliceFromPointer = useCallback((clientY: number) => {
    if (!scrubberTrackRef.current) return;
    const rect = scrubberTrackRef.current.getBoundingClientRect();
    const clampedY = Math.max(0, Math.min(rect.height, clientY - rect.top));
    const pct = clampedY / rect.height;
    const slice = Math.round(pct * (totalSlices - 1));
    setCurrentSlice(Math.max(0, Math.min(totalSlices - 1, slice)));
  }, [totalSlices]);

  const handleScrubberPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsScrubbing(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    updateSliceFromPointer(e.clientY);
  }, [updateSliceFromPointer]);

  const handleScrubberPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbing) return;
    e.preventDefault();
    e.stopPropagation();
    updateSliceFromPointer(e.clientY);
  }, [isScrubbing, updateSliceFromPointer]);

  const handleScrubberPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (isScrubbing) {
      setIsScrubbing(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  }, [isScrubbing]);

  const handleScrubberWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY > 0 ? 1 : -1;
    setCurrentSlice(prev => Math.max(0, Math.min(totalSlices - 1, prev + delta)));
  }, [totalSlices]);

  // ─── Actions ───────────────────────────────────────────────────────────
  const resetView = () => {
    setZoom(1.15);
    setPanOffset({ x: 0, y: 0 });
    setWindowCenter(40);
    setWindowWidth(400);
    setInvert(false);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      viewerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const jumpToLabel = (label: AnatomyLabel) => {
    const midSlice = Math.floor((label.sliceRange[0] + label.sliceRange[1]) / 2);
    setCurrentSlice(midSlice);
    setSelectedLabel(label.id);
  };

  // ─── Set page title ────────────────────────────────────────────────────
  useEffect(() => {
    document.title = 'Atlas Radiológico | CONRAD';
    return () => { document.title = 'CONRAD - Galeria Radiológica'; };
  }, []);

  // ─── Cursor ────────────────────────────────────────────────────────────
  const cursorClass = activeTool === 'pan' ? 'cursor-grab active:cursor-grabbing' :
                      activeTool === 'windowing' ? 'cursor-crosshair' :
                      activeTool === 'zoom' ? 'cursor-zoom-in' :
                      activeTool === 'pin' ? 'cursor-crosshair' :
                      'cursor-default';

  return (
    <div className="min-h-screen bg-background text-foreground" ref={viewerRef}>
      <Navbar />

      <div className="pt-16 h-screen flex flex-col">
        {/* ─── Top Toolbar (Single horizontal scroll row) ──────────── */}
        <div className="bg-[hsl(0,0%,8%)] border-b border-border px-3 py-1.5 flex items-center gap-2 overflow-x-auto scrollbar-none flex-nowrap z-30 shrink-0">
          {/* Back Button to Catalog */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/atlas')}
            className="text-muted-foreground hover:text-foreground mr-2 gap-1.5"
            title="Voltar ao catálogo do Atlas Radiológico"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-xs font-semibold">Catálogo</span>
          </Button>

          <div className="h-6 w-px bg-border" />

          {/* Title */}
          <div className="flex items-center gap-2 mr-2">
            <span className="text-sm font-heading font-bold text-gold-DEFAULT tracking-wide" style={{ color: 'hsl(48 100% 50%)' }}>
              ATLAS RADIOLÓGICO
            </span>
          </div>

          <div className="h-6 w-px bg-border" />

          {/* Plane Selector Tabs (Axial, Coronal, Sagital) */}
          {/* Plane Selector Tabs (Axial, Coronal, Sagital) */}
          <div className="flex items-center bg-black/40 border border-white/10 rounded-lg p-0.5 gap-1 shrink-0">
            {(['axial', 'coronal', 'sagittal'] as ViewingPlane[]).map(plane => {
              const info = PLANE_CONFIG[plane];
              const isActive = currentPlane === plane;
              return (
                <button
                  key={plane}
                  onClick={() => handlePlaneChange(plane)}
                  className={`px-2 sm:px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 sm:gap-1.5 ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                  title={info.description}
                >
                  <span className="sm:hidden">{info.shortName}</span>
                  <span className="hidden sm:inline">{info.name}</span>
                  <span className={`text-[10px] px-1 py-0.2 rounded font-mono ${isActive ? 'bg-black/25 text-white' : 'text-white/40'}`}>
                    {info.totalSlices}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="h-6 w-px bg-border shrink-0" />

          {/* Tool Buttons in Portuguese */}
          <div className="flex items-center gap-1 shrink-0">
            <ToolButton
              icon={<MousePointer className="w-4 h-4" />}
              label="Navegar"
              active={activeTool === 'scroll'}
              onClick={() => setActiveTool('scroll')}
              shortcut="S"
            />
            <ToolButton
              icon={<Sun className="w-4 h-4" />}
              label="Janela"
              active={activeTool === 'windowing'}
              onClick={() => setActiveTool('windowing')}
              shortcut="W"
            />
            <ToolButton
              icon={<Search className="w-4 h-4" />}
              label="Zoom"
              active={activeTool === 'zoom'}
              onClick={() => setActiveTool('zoom')}
              shortcut="Z"
            />
            <ToolButton
              icon={<Hand className="w-4 h-4" />}
              label="Arrastar"
              active={activeTool === 'pan'}
              onClick={() => setActiveTool('pan')}
              shortcut="P"
            />
            {/* Quick Zoom In / Out */}
            <div className="flex items-center gap-0.5 ml-0.5 pl-1 border-l border-border/50">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setZoom(prev => Math.min(5, +(prev + 0.15).toFixed(2)))}
                className="w-7 h-7 text-muted-foreground hover:text-foreground"
                title="Aumentar Zoom (+)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setZoom(prev => Math.max(0.4, +(prev - 0.15).toFixed(2)))}
                className="w-7 h-7 text-muted-foreground hover:text-foreground"
                title="Diminuir Zoom (-)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          <div className="h-6 w-px bg-border shrink-0" />

          {/* Window Presets (no WC / WW text) */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none shrink-0">
            {WINDOW_PRESETS.map(p => (
              <button
                key={p.name}
                onClick={() => { setWindowCenter(p.wc); setWindowWidth(p.ww); }}
                className={`text-xs px-2 py-1 rounded-md whitespace-nowrap transition-all
                  ${windowCenter === p.wc && windowWidth === p.ww
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-surface-hover'
                  }`}
                title={p.description}
              >
                <span className="mr-1">{p.icon}</span>{p.name}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          {/* Right Side Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Botão para Admin Editar */}
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/admin?tab=conrademia')}
                className="h-8 px-2.5 text-xs bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 flex items-center gap-1.5"
                title="Abrir o Editor de Anatomia no Painel Admin"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline font-semibold">Editar no Admin</span>
              </Button>
            )}

            {/* Alternar Cores Anatômicas e Controle de Opacidade */}
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowColors(prev => !prev)}
                className={`h-8 px-2.5 text-xs flex items-center gap-1.5 border border-border/60 ${showColors ? 'text-primary bg-primary/10 border-primary/30' : 'text-muted-foreground'}`}
                title="Alternar: Cores dos Órgãos vs Tomografia Pura"
              >
                <Palette className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">{showColors ? 'Cores Ativas' : 'TC Pura'}</span>
              </Button>

              {/* Slider de Opacidade de Cor */}
              {showColors && (
                <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-md bg-surface/80 border border-border/50 text-[11px] text-muted-foreground" title="Ajustar opacidade das cores">
                  <span className="text-[10px]">Opacidade</span>
                  <input
                    type="range"
                    min="15"
                    max="100"
                    value={Math.round(colorOpacity * 100)}
                    onChange={(e) => setColorOpacity(Number(e.target.value) / 100)}
                    className="w-14 h-1.5 accent-primary cursor-pointer"
                  />
                  <span className="font-mono text-[10px] w-6 text-foreground">{Math.round(colorOpacity * 100)}%</span>
                </div>
              )}
            </div>

            {/* Botão Único para Ocultar / Mostrar Linhas Anatômicas */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLabels(prev => !prev)}
              className={`h-8 px-2.5 text-xs flex items-center gap-1.5 border border-border/60 ${showLabels ? 'text-primary bg-primary/10 border-primary/30' : 'text-muted-foreground'}`}
              title="Ocultar ou exibir as linhas anatômicas de referência (L)"
            >
              {showLabels ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{showLabels ? 'Ocultar Linhas' : 'Mostrar Linhas'}</span>
            </Button>

            <Button
              variant="ghost" size="icon"
              onClick={() => setInvert(prev => !prev)}
              className={`w-8 h-8 ${invert ? 'text-primary' : 'text-muted-foreground'}`}
              title="Inverter Tons (I)"
            >
              <Contrast className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="w-8 h-8 text-muted-foreground" title="Tela Cheia (F)">
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost" size="icon"
              onClick={() => setSidebarOpen(prev => !prev)}
              className="w-8 h-8 text-muted-foreground"
              title="Painel de Estruturas Anatômicas"
            >
              <Layers className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* ─── Main Content ────────────────────────────────────────── */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* ─── DICOM / Image Viewer Area ─────────────────────────── */}
          <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
            {/* Canvas / Image Container with strict 1:1 aspect ratio */}
            <div
              className={`relative atlas-canvas-container shrink-0 select-none ${cursorClass}`}
              style={{
                transform: `scale(${zoom}) translate(${panOffset.x / zoom}px, ${panOffset.y / zoom}px)`,
                transition: isDragging.current ? 'none' : 'transform 0.1s ease-out',
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
            >
              {/* Base Plain CT image */}
              <img
                src={`/slices/${currentPlane}/plain/slice_${String(currentSlice).padStart(3, '0')}.webp`}
                alt={`Corte ${planeInfo.name} ${currentSlice + 1}`}
                className="w-full h-full block object-cover shadow-2xl pointer-events-none select-none transition-[filter] duration-150"
                style={{
                  filter: ctFilterStyle,
                }}
              />

              {/* Colored TotalSegmentator Overlay with dynamic opacity */}
              {showColors && (
                <img
                  src={`/slices/${currentPlane}/colored/slice_${String(currentSlice).padStart(3, '0')}.webp`}
                  alt={`Cores ${planeInfo.name} ${currentSlice + 1}`}
                  className="absolute inset-0 w-full h-full block object-cover pointer-events-none select-none transition-opacity duration-100 transition-[filter] duration-150"
                  style={{
                    opacity: colorOpacity,
                    filter: ctFilterStyle,
                  }}
                />
              )}

              {/* Anatomy Leader Lines & Pins Overlay */}
              {showLabels && (
                <AnatomyLeaderOverlay
                  labels={anatomyLabels}
                  currentSlice={currentSlice}
                  selectedLabelId={selectedLabel}
                  hoveredLabelId={hoveredLabel}
                  onSelectLabel={setSelectedLabel}
                  onHoverLabel={setHoveredLabel}
                  showAllAlways={showAllLines}
                  isEditMode={false}
                />
              )}
            </div>

            {/* ─── Ultra-thin Vertical Slice Scrollbar on PC (Far corner PACS style) ─── */}
            <div
              className="hidden md:flex absolute right-1.5 md:right-2 top-1/2 -translate-y-1/2 z-40 flex-col items-center select-none"
              onMouseEnter={() => setIsHoveringScrubber(true)}
              onMouseLeave={() => setIsHoveringScrubber(false)}
            >
              {/* Rail hit area with subtle 3px track */}
              <div
                ref={scrubberTrackRef}
                onPointerDown={handleScrubberPointerDown}
                onPointerMove={handleScrubberPointerMove}
                onPointerUp={handleScrubberPointerUp}
                onPointerCancel={handleScrubberPointerUp}
                onWheel={handleScrubberWheel}
                className="relative w-4 h-[55vh] max-h-[480px] min-h-[220px] flex items-center justify-center cursor-pointer group touch-none"
                title="Rolar cortes (arraste ou role a roda do mouse)"
              >
                {/* 3px Ultra-thin background track */}
                <div className="relative w-[3px] h-full bg-white/15 group-hover:bg-white/30 rounded-full transition-colors overflow-hidden">
                  {/* Active fill from top to current slice */}
                  <div
                    className="absolute top-0 left-0 right-0 bg-primary/80 transition-none"
                    style={{
                      height: `${(currentSlice / Math.max(1, totalSlices - 1)) * 100}%`,
                    }}
                  />
                </div>

                {/* Ultra-slim thumb indicator pill */}
                <div
                  className="absolute left-1/2 -translate-x-1/2 w-[7px] h-6 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))] transition-transform duration-75 group-hover:scale-110 pointer-events-none"
                  style={{
                    top: `calc(${(currentSlice / Math.max(1, totalSlices - 1)) * 100}% - 12px)`,
                  }}
                />

                {/* Floating slice tooltip badge: only visible on hover or drag */}
                <div
                  className={`absolute right-5 pointer-events-none transition-all duration-150 px-2 py-0.5 rounded-md bg-black/90 border border-white/20 backdrop-blur-md shadow-2xl text-center font-mono whitespace-nowrap z-50 ${
                    isScrubbing || isHoveringScrubber ? 'opacity-100 scale-100 translate-x-0' : 'opacity-0 scale-95 translate-x-2'
                  }`}
                  style={{
                    top: `calc(${(currentSlice / Math.max(1, totalSlices - 1)) * 100}% - 12px)`,
                  }}
                >
                  <span className="text-[11px] font-bold text-white tracking-tight">
                    {currentSlice + 1}
                  </span>
                  <span className="text-[9px] text-white/50 ml-1">
                    / {totalSlices}
                  </span>
                </div>
              </div>
            </div>

            {/* ─── Desktop Viewport Info (Discreet in corner) ─── */}
            <div className="hidden md:flex absolute bottom-4 left-5 z-20 pointer-events-none flex-col gap-0.5 text-xs text-white/70 select-none">
              <p className="font-semibold text-white/95 drop-shadow-md">
                TC Abdome e Pelve • Plano {planeInfo.name}
              </p>
              <p className="text-white/50 text-[11px] drop-shadow-md">
                {showColors ? 'Cores Anatômicas' : 'TC Pura'} • Zoom: {(zoom * 100).toFixed(0)}%
              </p>
            </div>

            {/* ─── Bottom Mobile Controls & Anatomy Bar ──────────────── */}
            <div className="md:hidden absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/95 to-transparent px-3 pb-3 pt-6 z-30 pointer-events-none flex flex-col gap-2">
              {/* Selected Structure Details Card (Mobile) */}
              <AnimatePresence>
                {selectedLabelData && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="p-3 bg-neutral-950/95 border rounded-2xl backdrop-blur-md shadow-2xl pointer-events-auto flex items-start justify-between gap-3 max-w-md mx-auto w-full"
                    style={{ borderColor: `${selectedLabelData.color}80` }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{
                            backgroundColor: selectedLabelData.color,
                            boxShadow: `0 0 8px ${selectedLabelData.color}`,
                          }}
                        />
                        <h4 className="text-sm font-bold text-white truncate">
                          {selectedLabelData.namePt}
                        </h4>
                        <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-white/70 shrink-0">
                          {selectedLabelData.category || 'Anatomia'}
                        </span>
                      </div>
                      {selectedLabelData.description && (
                        <p className="text-[11px] text-white/80 mt-1 line-clamp-2 leading-relaxed">
                          {selectedLabelData.description}
                        </p>
                      )}
                      <div className="text-[10px] text-white/50 mt-1 flex items-center justify-between">
                        <span>Cortes: {selectedLabelData.sliceRange[0] + 1} - {selectedLabelData.sliceRange[1] + 1}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedLabel(null)}
                      className="text-white/60 hover:text-white p-1 rounded-full hover:bg-white/10 shrink-0"
                      title="Fechar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Mobile Organ Chips Carousel (Horizontally scrollable list of organs in current cut) */}
              {showLabels && visibleLabels.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-1 scrollbar-none pointer-events-auto max-w-md mx-auto w-full">
                  <span className="text-[9px] uppercase font-bold text-white/50 tracking-wider shrink-0 pl-1">
                    Corte ({visibleLabels.length}):
                  </span>
                  {visibleLabels.map(label => {
                    const isSel = selectedLabel === label.id;
                    return (
                      <button
                        key={label.id}
                        onClick={() => setSelectedLabel(isSel ? null : label.id)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs whitespace-nowrap transition-all shrink-0 ${
                          isSel
                            ? 'bg-primary text-primary-foreground font-bold shadow-md scale-105'
                            : 'bg-black/70 border border-white/15 text-white/90 hover:text-white active:scale-95'
                        }`}
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: label.color }}
                        />
                        <span>{label.namePt}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Mobile Slice Slider */}
              <div className="flex items-center justify-between gap-2 max-w-md mx-auto w-full pointer-events-auto bg-black/70 border border-white/10 rounded-full px-3 py-1.5 backdrop-blur-md shadow-lg">
                <button
                  onClick={() => setCurrentSlice(prev => Math.max(0, prev - 1))}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                  title="Corte anterior (←)"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex-1 py-1">
                  <Slider
                    value={[currentSlice]}
                    onValueChange={([v]) => setCurrentSlice(v)}
                    min={0}
                    max={totalSlices - 1}
                    step={1}
                    className="w-full"
                  />
                </div>
                <button
                  onClick={() => setCurrentSlice(prev => Math.min(totalSlices - 1, prev + 1))}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                  title="Próximo corte (→)"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <span className="text-xs text-white/90 font-mono font-semibold min-w-[55px] text-center shrink-0">
                  {currentSlice + 1}/{totalSlices}
                </span>
              </div>
            </div>
          </div>

          {/* ─── Anatomy Sidebar (Drawer on mobile, Split-pane on desktop) ─── */}
          <AnimatePresence>
            {sidebarOpen && (
              <>
                {/* Mobile Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSidebarOpen(false)}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                />

                <motion.div
                  initial={{ x: '100%', opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: '100%', opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="fixed md:static inset-y-0 right-0 top-16 md:top-0 z-50 md:z-auto w-[290px] sm:w-[320px] bg-[hsl(0,0%,7%)] border-l border-border flex flex-col overflow-hidden shadow-2xl md:shadow-none"
                >
                {/* Sidebar Header */}
                <div className="p-4 border-b border-border">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-heading font-bold text-foreground flex items-center gap-2">
                      <MapPin className="w-4 h-4" style={{ color: 'hsl(48,100%,50%)' }} />
                      Estruturas Anatômicas
                    </h2>
                    <Button
                      variant="ghost" size="icon"
                      className="w-7 h-7 text-muted-foreground"
                      onClick={() => setSidebarOpen(false)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Buscar estrutura..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full bg-surface pl-8 pr-3 py-2 rounded-lg text-xs text-foreground placeholder:text-muted-foreground border border-border focus:border-primary/50 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Label List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
                  {filteredLabels.map(label => {
                    const isVisible = currentSlice >= label.sliceRange[0] && currentSlice <= label.sliceRange[1];
                    const isSelected = selectedLabel === label.id;

                    return (
                      <button
                        key={label.id}
                        onClick={() => jumpToLabel(label)}
                        onMouseEnter={() => setHoveredLabel(label.id)}
                        onMouseLeave={() => setHoveredLabel(null)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg transition-all duration-200 group flex items-start gap-3
                          ${isSelected
                            ? 'bg-primary/10 border border-primary/30'
                            : 'hover:bg-surface-hover border border-transparent'
                          }
                          ${!isVisible ? 'opacity-40' : 'opacity-100'}
                        `}
                      >
                        {/* Color dot */}
                        <div className="mt-0.5 flex-shrink-0">
                          <div
                            className={`w-3 h-3 rounded-full border-2 transition-all ${isSelected ? 'scale-125' : ''}`}
                            style={{
                              backgroundColor: label.color,
                              borderColor: isSelected ? '#fff' : `${label.color}80`,
                              boxShadow: isSelected ? `0 0 8px ${label.color}80` : 'none',
                            }}
                          />
                        </div>

                        {/* Label info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-medium ${isSelected ? 'text-foreground' : 'text-foreground/80 group-hover:text-foreground'}`}>
                              {label.namePt}
                            </span>
                            {isVisible && (
                              <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" title="Visível neste corte" />
                            )}
                          </div>

                          {isSelected && (
                            <motion.p
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              className="text-[10px] text-muted-foreground mt-1 leading-relaxed"
                            >
                              {label.description}
                            </motion.p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Sidebar Footer */}
                <div className="p-3 border-t border-border">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{visibleLabels.length} estruturas visíveis</span>
                    <span className="font-mono">Corte {currentSlice + 1} de {totalSlices}</span>
                  </div>
                </div>

                {/* Keyboard Shortcuts in Portuguese */}
                <div className="p-3 border-t border-border">
                  <p className="text-[10px] text-muted-foreground font-medium mb-1.5">Atalhos do Teclado</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {[
                      ['↑↓', 'Navegar fatias'],
                      ['Rolar', 'Navegar fatias'],
                      ['L', 'Linhas on/off'],
                      ['I', 'Inverter tons'],
                      ['F', 'Tela cheia'],
                    ].map(([key, desc]) => (
                      <div key={key} className="flex items-center gap-1.5">
                        <kbd className="text-[9px] px-1 py-0.5 rounded bg-surface border border-border text-muted-foreground font-mono">
                          {key}
                        </kbd>
                        <span className="text-[9px] text-muted-foreground/70">{desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </>
          )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ─── Tool Button Component ─────────────────────────────────────────────────
function ToolButton({
  icon,
  label,
  active,
  onClick,
  shortcut,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  shortcut: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all
        ${active
          ? 'bg-primary/20 text-primary border border-primary/30 shadow-sm shadow-primary/10'
          : 'text-muted-foreground hover:text-foreground hover:bg-surface-hover'
        }`}
      title={`${label} (${shortcut})`}
    >
      {icon}
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Root Conrademia Component (Hub / Router)
// ═══════════════════════════════════════════════════════════════════════════
export default function Conrademia() {
  const navigate = useNavigate();
  const { examId } = useParams();
  const [searchParams] = useSearchParams();

  const activeExam = examId || searchParams.get('exam');

  // If no exam selected (e.g. visiting /atlas directly), show the Exams Hub Grid
  if (!activeExam) {
    return (
      <ConrademiaHub
        onSelectExam={(selectedId) => navigate(`/atlas/${selectedId}`)}
      />
    );
  }

  // Otherwise, render the interactive viewer
  return <ConrademiaViewer />;
}
