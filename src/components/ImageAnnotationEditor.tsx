import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import {
  X, Undo2, Redo2, MousePointer2, Pen, Type, ArrowUpRight,
  Circle, Square, Eraser, Download, Check, RotateCcw, Minus,
  Trash2, Pencil, Loader2,
} from 'lucide-react';

// --- Types ---
export type ToolType = 'select' | 'arrow' | 'pen' | 'line' | 'circle' | 'rect' | 'text' | 'eraser';

export interface Point {
  x: number;
  y: number;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface BaseAnnotation {
  id: string;
  color: string;
  opacity: number;
  strokeWidth: number;
}

export interface PenAnnotation extends BaseAnnotation {
  type: 'pen';
  points: Point[];
}

export interface ArrowAnnotation extends BaseAnnotation {
  type: 'arrow';
  start: Point;
  end: Point;
}

export interface TextAnnotation extends BaseAnnotation {
  type: 'text';
  position: Point;
  text: string;
  fontSize: number;
}

export interface CircleAnnotation extends BaseAnnotation {
  type: 'circle';
  center: Point;
  radiusX: number;
  radiusY: number;
}

export interface RectAnnotation extends BaseAnnotation {
  type: 'rect';
  start: Point;
  end: Point;
}

export interface LineAnnotation extends BaseAnnotation {
  type: 'line';
  start: Point;
  end: Point;
}

export type Annotation =
  | PenAnnotation
  | ArrowAnnotation
  | TextAnnotation
  | CircleAnnotation
  | RectAnnotation
  | LineAnnotation;

// --- Color presets ---
const COLOR_PRESETS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#ffffff', // White
  '#000000', // Black
  '#06b6d4', // Cyan
];

// --- Helpers ---
function genId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function hexToRgba(hex: string, opacity: number): string {
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) return hex;
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.slice(0, 2), 16) || 0;
  const g = parseInt(cleanHex.slice(2, 4), 16) || 0;
  const b = parseInt(cleanHex.slice(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, opacity))})`;
}

function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return dist(p, a);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return dist(p, { x: a.x + t * dx, y: a.y + t * dy });
}

// Compute bounding box for any annotation
export function getAnnotationBounds(ann: Annotation): BoundingBox {
  switch (ann.type) {
    case 'pen': {
      if (ann.points.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const p of ann.points) {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      }
      const pad = ann.strokeWidth / 2 + 6;
      return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
    }
    case 'arrow':
    case 'line': {
      const minX = Math.min(ann.start.x, ann.end.x);
      const maxX = Math.max(ann.start.x, ann.end.x);
      const minY = Math.min(ann.start.y, ann.end.y);
      const maxY = Math.max(ann.start.y, ann.end.y);
      const pad = Math.max(ann.strokeWidth * 2, 16);
      return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
    }
    case 'rect': {
      const minX = Math.min(ann.start.x, ann.end.x);
      const maxX = Math.max(ann.start.x, ann.end.x);
      const minY = Math.min(ann.start.y, ann.end.y);
      const maxY = Math.max(ann.start.y, ann.end.y);
      const pad = ann.strokeWidth / 2 + 4;
      return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
    }
    case 'circle': {
      const rx = Math.abs(ann.radiusX);
      const ry = Math.abs(ann.radiusY);
      const pad = ann.strokeWidth / 2 + 4;
      return {
        minX: ann.center.x - rx - pad,
        minY: ann.center.y - ry - pad,
        maxX: ann.center.x + rx + pad,
        maxY: ann.center.y + ry + pad,
      };
    }
    case 'text': {
      const approxCharWidth = ann.fontSize * 0.62;
      const width = Math.max(ann.text.length * approxCharWidth, 24);
      const height = ann.fontSize * 1.25;
      return {
        minX: ann.position.x - 6,
        minY: ann.position.y - 4,
        maxX: ann.position.x + width + 6,
        maxY: ann.position.y + height + 4,
      };
    }
  }
}

// Generous Hit testing for selecting or erasing
export function hitTestAnnotation(ann: Annotation, point: Point, threshold = 18): boolean {
  switch (ann.type) {
    case 'pen': {
      for (let i = 0; i < ann.points.length - 1; i++) {
        if (distToSegment(point, ann.points[i], ann.points[i + 1]) < threshold + ann.strokeWidth / 2) {
          return true;
        }
      }
      return ann.points.length === 1 && dist(point, ann.points[0]) < threshold + ann.strokeWidth / 2;
    }

    case 'arrow': {
      // Check shaft
      if (distToSegment(point, ann.start, ann.end) < threshold + ann.strokeWidth / 2) {
        return true;
      }
      // Check arrowhead tip & wings area
      const headSize = Math.max(ann.strokeWidth * 3.5, 18);
      if (dist(point, ann.end) < headSize + threshold) {
        return true;
      }
      return false;
    }

    case 'line': {
      return distToSegment(point, ann.start, ann.end) < threshold + ann.strokeWidth / 2;
    }

    case 'text': {
      const bounds = getAnnotationBounds(ann);
      return (
        point.x >= bounds.minX - threshold &&
        point.x <= bounds.maxX + threshold &&
        point.y >= bounds.minY - threshold &&
        point.y <= bounds.maxY + threshold
      );
    }

    case 'circle': {
      const rx = Math.abs(ann.radiusX) || 1;
      const ry = Math.abs(ann.radiusY) || 1;
      const dx = (point.x - ann.center.x) / rx;
      const dy = (point.y - ann.center.y) / ry;
      const d = Math.sqrt(dx * dx + dy * dy);
      // Hit on the stroke or inside the circle
      const onStroke = Math.abs(d - 1) < (threshold + ann.strokeWidth) / Math.min(rx, ry);
      const inside = d <= 1.05;
      return onStroke || inside;
    }

    case 'rect': {
      const minX = Math.min(ann.start.x, ann.end.x);
      const maxX = Math.max(ann.start.x, ann.end.x);
      const minY = Math.min(ann.start.y, ann.end.y);
      const maxY = Math.max(ann.start.y, ann.end.y);
      // Hit if anywhere inside or near border
      return (
        point.x >= minX - threshold &&
        point.x <= maxX + threshold &&
        point.y >= minY - threshold &&
        point.y <= maxY + threshold
      );
    }
  }
}

// Move annotation by delta
export function moveAnnotation(ann: Annotation, dx: number, dy: number): Annotation {
  const mp = (p: Point): Point => ({ x: p.x + dx, y: p.y + dy });
  switch (ann.type) {
    case 'pen':
      return { ...ann, points: ann.points.map(mp) };
    case 'arrow':
    case 'line':
      return { ...ann, start: mp(ann.start), end: mp(ann.end) };
    case 'text':
      return { ...ann, position: mp(ann.position) };
    case 'circle':
      return { ...ann, center: mp(ann.center) };
    case 'rect':
      return { ...ann, start: mp(ann.start), end: mp(ann.end) };
  }
}

// Scale helper for exporting
function scaleAnnotation(ann: Annotation, sx: number, sy: number): Annotation {
  const scalePoint = (p: Point): Point => ({ x: p.x * sx, y: p.y * sy });
  switch (ann.type) {
    case 'pen':
      return { ...ann, points: ann.points.map(scalePoint), strokeWidth: ann.strokeWidth * sx };
    case 'arrow':
    case 'line':
      return { ...ann, start: scalePoint(ann.start), end: scalePoint(ann.end), strokeWidth: ann.strokeWidth * sx };
    case 'text':
      return { ...ann, position: scalePoint(ann.position), fontSize: ann.fontSize * sx };
    case 'circle':
      return {
        ...ann,
        center: scalePoint(ann.center),
        radiusX: ann.radiusX * sx,
        radiusY: ann.radiusY * sy,
        strokeWidth: ann.strokeWidth * sx,
      };
    case 'rect':
      return { ...ann, start: scalePoint(ann.start), end: scalePoint(ann.end), strokeWidth: ann.strokeWidth * sx };
  }
}

// --- Crisp Medical Arrow Drawing ---
function drawCrispArrow(
  ctx: CanvasRenderingContext2D,
  start: Point,
  end: Point,
  strokeWidth: number,
  color: string,
  opacity: number
) {
  const totalLength = Math.hypot(end.x - start.x, end.y - start.y);
  if (totalLength < 3) return;

  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const rgba = hexToRgba(color, opacity);

  // Arrowhead sizing - clinical proportion
  const headLength = Math.min(Math.max(strokeWidth * 3.8, 18), Math.max(totalLength * 0.65, 10));
  const wingAngle = Math.PI / 6.5; // ~28 degrees
  const wingSpan = headLength * Math.tan(wingAngle);

  // Tip is precisely at `end`
  const tip = end;

  // Base of arrowhead where shaft meets
  const baseCenter = {
    x: tip.x - headLength * Math.cos(angle),
    y: tip.y - headLength * Math.sin(angle),
  };

  // Left & right wing tips
  const leftWing = {
    x: baseCenter.x - wingSpan * Math.sin(angle),
    y: baseCenter.y + wingSpan * Math.cos(angle),
  };
  const rightWing = {
    x: baseCenter.x + wingSpan * Math.sin(angle),
    y: baseCenter.y - wingSpan * Math.cos(angle),
  };

  // Notch at the back for a sleek arrow
  const notch = {
    x: baseCenter.x + (headLength * 0.15) * Math.cos(angle),
    y: baseCenter.y + (headLength * 0.15) * Math.sin(angle),
  };

  ctx.save();
  ctx.strokeStyle = rgba;
  ctx.fillStyle = rgba;

  // 1. Draw shaft - 'butt' lineCap is CRITICAL so it does not poke out!
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';

  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  // Extend shaft 1px into the arrowhead base so there is no gap
  ctx.lineTo(
    baseCenter.x + 1.5 * Math.cos(angle),
    baseCenter.y + 1.5 * Math.sin(angle)
  );
  ctx.stroke();

  // 2. Draw sharp arrowhead
  ctx.beginPath();
  ctx.moveTo(tip.x, tip.y);
  ctx.lineTo(leftWing.x, leftWing.y);
  ctx.lineTo(notch.x, notch.y);
  ctx.lineTo(rightWing.x, rightWing.y);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

// --- Render single annotation ---
export function renderAnnotation(ctx: CanvasRenderingContext2D, ann: Annotation) {
  ctx.save();
  const rgba = hexToRgba(ann.color, ann.opacity);

  switch (ann.type) {
    case 'arrow':
      drawCrispArrow(ctx, ann.start, ann.end, ann.strokeWidth, ann.color, ann.opacity);
      break;

    case 'line':
      ctx.strokeStyle = rgba;
      ctx.lineWidth = ann.strokeWidth;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(ann.start.x, ann.start.y);
      ctx.lineTo(ann.end.x, ann.end.y);
      ctx.stroke();
      break;

    case 'pen':
      if (ann.points.length > 0) {
        ctx.strokeStyle = rgba;
        ctx.lineWidth = ann.strokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(ann.points[0].x, ann.points[0].y);
        for (let i = 1; i < ann.points.length; i++) {
          const midX = (ann.points[i - 1].x + ann.points[i].x) / 2;
          const midY = (ann.points[i - 1].y + ann.points[i].y) / 2;
          ctx.quadraticCurveTo(ann.points[i - 1].x, ann.points[i - 1].y, midX, midY);
        }
        ctx.stroke();
      }
      break;

    case 'circle': {
      const rx = Math.abs(ann.radiusX);
      const ry = Math.abs(ann.radiusY);
      if (rx > 0 && ry > 0) {
        ctx.strokeStyle = rgba;
        ctx.lineWidth = ann.strokeWidth;
        ctx.beginPath();
        ctx.ellipse(ann.center.x, ann.center.y, rx, ry, 0, 0, 2 * Math.PI);
        ctx.stroke();
      }
      break;
    }

    case 'rect': {
      const x = Math.min(ann.start.x, ann.end.x);
      const y = Math.min(ann.start.y, ann.end.y);
      const w = Math.abs(ann.end.x - ann.start.x);
      const h = Math.abs(ann.end.y - ann.start.y);
      ctx.strokeStyle = rgba;
      ctx.lineWidth = ann.strokeWidth;
      ctx.lineJoin = 'round';
      ctx.strokeRect(x, y, w, h);
      break;
    }

    case 'text': {
      ctx.font = `bold ${ann.fontSize}px Inter, system-ui, -apple-system, sans-serif`;
      ctx.textBaseline = 'top';

      // Text outline for legibility over any radiological background
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.lineWidth = Math.max(3, ann.fontSize * 0.14);
      ctx.lineJoin = 'round';
      ctx.strokeText(ann.text, ann.position.x, ann.position.y);

      // Text fill
      ctx.fillStyle = rgba;
      ctx.fillText(ann.text, ann.position.x, ann.position.y);
      break;
    }
  }

  ctx.restore();
}

// --- Props ---
export interface ImageAnnotationEditorProps {
  imageSrc: string;
  onSave: (editedBlob: Blob) => void;
  onCancel: () => void;
}

export function ImageAnnotationEditor({ imageSrc, onSave, onCancel }: ImageAnnotationEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  const [tool, setTool] = useState<ToolType>('arrow');
  const [color, setColor] = useState('#ef4444');
  const [opacity, setOpacity] = useState(1);
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [fontSize, setFontSize] = useState(24);

  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [undoStack, setUndoStack] = useState<Annotation[][]>([]);
  const [redoStack, setRedoStack] = useState<Annotation[][]>([]);

  // Selection & dragging state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point | null>(null);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null);

  // Eraser cursor position for follower circle
  const [eraserCursor, setEraserCursor] = useState<Point | null>(null);

  // Text inline editing state
  const [textInput, setTextInput] = useState('');
  const [textPosition, setTextPosition] = useState<Point | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  // Image & Canvas state
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgElement, setImgElement] = useState<HTMLImageElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Clear selection when tool changes
  useEffect(() => {
    if (tool !== 'select') {
      setSelectedId(null);
    }
  }, [tool]);

  // Record undo snapshot before changes
  const pushUndo = useCallback((currentList: Annotation[]) => {
    setUndoStack(prev => [...prev.slice(-30), currentList]);
    setRedoStack([]);
  }, []);

  // --- Measure & Size Canvas Immediately and on Resizes ---
  const updateDimensions = useCallback(() => {
    if (!imgElement) return;

    const container = containerRef.current;
    const availW = container?.clientWidth || window.innerWidth;
    const availH = container?.clientHeight || (window.innerHeight - 90);

    const maxW = Math.max(80, availW - 32);
    const maxH = Math.max(80, availH - 32);

    const naturalW = imgElement.naturalWidth || 800;
    const naturalH = imgElement.naturalHeight || 600;
    const imgRatio = naturalW / naturalH;

    let targetW = maxW;
    let targetH = targetW / imgRatio;

    if (targetH > maxH) {
      targetH = maxH;
      targetW = targetH * imgRatio;
    }

    setCanvasSize({
      width: Math.max(50, Math.floor(targetW)),
      height: Math.max(50, Math.floor(targetH)),
    });
  }, [imgElement]);

  // --- Load Image safely (converting remote URLs to base64 dataURL to guarantee canvas is never tainted or revoked) ---
  useEffect(() => {
    let active = true;

    async function loadImage() {
      if (!imageSrc) return;

      // 1. Data URLs and Blob URLs load directly
      if (imageSrc.startsWith('data:') || imageSrc.startsWith('blob:')) {
        const img = new Image();
        img.onload = () => {
          if (!active) return;
          setImgElement(img);
          setImgLoaded(true);
        };
        img.onerror = () => {
          console.error('Falha ao carregar imagem local');
        };
        img.src = imageSrc;
        return;
      }

      // 2. Remote URLs: fetch as blob and convert to Base64 Data URL so it is 100% in-memory and never tainted
      try {
        const resp = await fetch(imageSrc, { mode: 'cors' });
        if (resp.ok) {
          const blob = await resp.blob();
          const reader = new FileReader();
          reader.onloadend = () => {
            if (!active) return;
            const dataUrl = reader.result as string;
            const img = new Image();
            img.onload = () => {
              if (!active) return;
              setImgElement(img);
              setImgLoaded(true);
            };
            img.onerror = () => loadDirect(imageSrc);
            img.src = dataUrl;
          };
          reader.readAsDataURL(blob);
          return;
        }
      } catch (err) {
        console.warn('Fetch image as blob failed, using direct image loader:', err);
      }

      // 3. Fallback: direct Image element
      loadDirect(imageSrc);
    }

    function loadDirect(src: string) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (!active) return;
        setImgElement(img);
        setImgLoaded(true);
      };
      img.onerror = () => {
        if (!active) return;
        const imgFallback = new Image();
        imgFallback.onload = () => {
          if (!active) return;
          setImgElement(imgFallback);
          setImgLoaded(true);
        };
        imgFallback.onerror = () => {
          console.error('Falha ao carregar imagem remota');
        };
        imgFallback.src = src;
      };
      img.src = src;
    }

    loadImage();

    return () => {
      active = false;
    };
  }, [imageSrc]);

  // --- Run sizing on mount, image load, window resize, and ResizeObserver ---
  useEffect(() => {
    if (!imgElement) return;

    // Sizing immediately on first tick
    updateDimensions();

    const container = containerRef.current;
    let ro: ResizeObserver | null = null;
    if (container) {
      ro = new ResizeObserver(() => {
        updateDimensions();
      });
      ro.observe(container);
    }

    window.addEventListener('resize', updateDimensions);

    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', updateDimensions);
    };
  }, [imgElement, updateDimensions]);

  // --- Render Base Canvas: Image + Committed Annotations ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgElement || canvasSize.width === 0) return;

    if (canvas.width !== canvasSize.width || canvas.height !== canvasSize.height) {
      canvas.width = canvasSize.width;
      canvas.height = canvasSize.height;
    }

    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    // 1. Draw radiological image
    ctx.drawImage(imgElement, 0, 0, canvasSize.width, canvasSize.height);

    // 2. Draw annotations on top
    for (const ann of annotations) {
      renderAnnotation(ctx, ann);
    }
  }, [annotations, imgElement, canvasSize]);

  // --- Render Overlay Canvas: Live Preview, Selection Bounding Box, Eraser Indicator ---
  useEffect(() => {
    const overlay = overlayCanvasRef.current;
    if (!overlay || canvasSize.width === 0) return;

    if (overlay.width !== canvasSize.width || overlay.height !== canvasSize.height) {
      overlay.width = canvasSize.width;
      overlay.height = canvasSize.height;
    }

    const ctx = overlay.getContext('2d')!;
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    // 1. Draw current drawing annotation preview
    if (currentAnnotation) {
      renderAnnotation(ctx, currentAnnotation);
    }

    // 2. Draw selection bounding box and handles
    if (selectedId && tool === 'select') {
      const selected = annotations.find(a => a.id === selectedId);
      if (selected) {
        const bounds = getAnnotationBounds(selected);

        ctx.save();
        // Dashed bounding box
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 4]);
        ctx.strokeRect(
          bounds.minX,
          bounds.minY,
          bounds.maxX - bounds.minX,
          bounds.maxY - bounds.minY
        );

        // Corner anchor dots
        ctx.setLineDash([]);
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 1.5;
        const corners = [
          { x: bounds.minX, y: bounds.minY },
          { x: bounds.maxX, y: bounds.minY },
          { x: bounds.maxX, y: bounds.maxY },
          { x: bounds.minX, y: bounds.maxY },
        ];
        for (const c of corners) {
          ctx.beginPath();
          ctx.arc(c.x, c.y, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    // 3. Draw eraser cursor circle follower
    if (tool === 'eraser' && eraserCursor) {
      ctx.save();
      ctx.beginPath();
      const radius = Math.max(16, strokeWidth * 3);
      ctx.arc(eraserCursor.x, eraserCursor.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 4;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(eraserCursor.x, eraserCursor.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = '#ef4444';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }
  }, [currentAnnotation, canvasSize, selectedId, tool, annotations, eraserCursor, strokeWidth]);

  // --- Coordinate conversion ---
  const getCanvasPos = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = overlayCanvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  // --- Real-time Eraser Action: deletes touched elements immediately ---
  const performErasureAt = useCallback((pos: Point) => {
    const eraserRadius = Math.max(16, strokeWidth * 3);
    setAnnotations(prev => {
      const remaining = prev.filter(ann => !hitTestAnnotation(ann, pos, eraserRadius));
      if (remaining.length !== prev.length) {
        // Record undo on first removal
        pushUndo(prev);
        return remaining;
      }
      return prev;
    });
  }, [strokeWidth, pushUndo]);

  // --- Pointer Down ---
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPos(e);
    const canvas = overlayCanvasRef.current;
    if (canvas) canvas.setPointerCapture(e.pointerId);

    // 1. SELECT TOOL
    if (tool === 'select') {
      // If clicking already selected item bounds, start dragging immediately
      if (selectedId) {
        const current = annotations.find(a => a.id === selectedId);
        if (current && hitTestAnnotation(current, pos, 20)) {
          setIsDragging(true);
          setDragStart(pos);
          pushUndo(annotations);
          return;
        }
      }

      // Hit-test annotations in reverse (topmost first)
      for (let i = annotations.length - 1; i >= 0; i--) {
        if (hitTestAnnotation(annotations[i], pos, 18)) {
          setSelectedId(annotations[i].id);
          setIsDragging(true);
          setDragStart(pos);
          pushUndo(annotations);
          return;
        }
      }

      // Clicked on empty space: deselect
      setSelectedId(null);
      return;
    }

    // 2. ERASER TOOL: erase on contact in real time!
    if (tool === 'eraser') {
      setIsDrawing(true);
      performErasureAt(pos);
      return;
    }

    // 3. TEXT TOOL
    if (tool === 'text') {
      setTextPosition(pos);
      setTextInput('');
      setEditingTextId(null);
      setTimeout(() => textInputRef.current?.focus(), 50);
      return;
    }

    // 4. DRAWING TOOLS
    setIsDrawing(true);
    const base = { id: genId(), color, opacity, strokeWidth };

    switch (tool) {
      case 'arrow':
        setCurrentAnnotation({ ...base, type: 'arrow', start: pos, end: pos });
        break;
      case 'line':
        setCurrentAnnotation({ ...base, type: 'line', start: pos, end: pos });
        break;
      case 'pen':
        setCurrentAnnotation({ ...base, type: 'pen', points: [pos] });
        break;
      case 'circle':
        setCurrentAnnotation({ ...base, type: 'circle', center: pos, radiusX: 0, radiusY: 0 });
        break;
      case 'rect':
        setCurrentAnnotation({ ...base, type: 'rect', start: pos, end: pos });
        break;
    }
  };

  // --- Pointer Move ---
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPos(e);

    // Update eraser follower cursor
    if (tool === 'eraser') {
      setEraserCursor(pos);
    }

    // 1. SELECT TOOL DRAGGING
    if (tool === 'select' && isDragging && selectedId && dragStart) {
      const dx = pos.x - dragStart.x;
      const dy = pos.y - dragStart.y;
      setAnnotations(prev =>
        prev.map(a => (a.id === selectedId ? moveAnnotation(a, dx, dy) : a))
      );
      setDragStart(pos);
      return;
    }

    // 2. ERASER DRAGGING: erase anything under path in real time
    if (tool === 'eraser' && isDrawing) {
      performErasureAt(pos);
      return;
    }

    // 3. DRAWING PREVIEW
    if (!isDrawing || !currentAnnotation) return;

    switch (currentAnnotation.type) {
      case 'arrow':
      case 'line':
        setCurrentAnnotation({ ...currentAnnotation, end: pos });
        break;
      case 'pen':
        setCurrentAnnotation({
          ...currentAnnotation,
          points: [...currentAnnotation.points, pos],
        });
        break;
      case 'circle':
        setCurrentAnnotation({
          ...currentAnnotation,
          radiusX: pos.x - currentAnnotation.center.x,
          radiusY: pos.y - currentAnnotation.center.y,
        });
        break;
      case 'rect':
        setCurrentAnnotation({ ...currentAnnotation, end: pos });
        break;
    }
  };

  // --- Pointer Up ---
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = overlayCanvasRef.current;
    if (canvas && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }

    if (tool === 'select') {
      setIsDragging(false);
      setDragStart(null);
      return;
    }

    if (tool === 'eraser') {
      setIsDrawing(false);
      return;
    }

    if (!isDrawing || !currentAnnotation) return;
    setIsDrawing(false);

    // Commit annotation if meaningful
    let valid = true;
    if (currentAnnotation.type === 'arrow' || currentAnnotation.type === 'line') {
      valid = dist(currentAnnotation.start, currentAnnotation.end) > 5;
    } else if (currentAnnotation.type === 'pen') {
      valid = currentAnnotation.points.length > 1;
    } else if (currentAnnotation.type === 'circle') {
      valid = Math.abs(currentAnnotation.radiusX) > 4 && Math.abs(currentAnnotation.radiusY) > 4;
    } else if (currentAnnotation.type === 'rect') {
      valid =
        Math.abs(currentAnnotation.end.x - currentAnnotation.start.x) > 4 &&
        Math.abs(currentAnnotation.end.y - currentAnnotation.start.y) > 4;
    }

    if (valid) {
      pushUndo(annotations);
      setAnnotations(prev => [...prev, currentAnnotation]);
    }
    setCurrentAnnotation(null);
  };

  const handlePointerLeave = () => {
    setEraserCursor(null);
  };

  // --- Double-click to edit text ---
  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const pos = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    for (let i = annotations.length - 1; i >= 0; i--) {
      const ann = annotations[i];
      if (ann.type === 'text' && hitTestAnnotation(ann, pos, 20)) {
        setEditingTextId(ann.id);
        setTextInput(ann.text);
        setTextPosition(ann.position);
        setSelectedId(ann.id);
        setTimeout(() => textInputRef.current?.focus(), 50);
        return;
      }
    }
  };

  // --- Confirm Text Annotation ---
  const confirmText = () => {
    if (!textInput.trim()) {
      setTextPosition(null);
      setTextInput('');
      setEditingTextId(null);
      return;
    }

    if (editingTextId) {
      // Editing existing text
      pushUndo(annotations);
      setAnnotations(prev =>
        prev.map(a =>
          a.id === editingTextId && a.type === 'text'
            ? ({ ...a, text: textInput.trim() } as TextAnnotation)
            : a
        )
      );
      setEditingTextId(null);
    } else if (textPosition) {
      // Adding new text
      const ann: TextAnnotation = {
        id: genId(),
        type: 'text',
        color,
        opacity,
        strokeWidth,
        position: textPosition,
        text: textInput.trim(),
        fontSize,
      };
      pushUndo(annotations);
      setAnnotations(prev => [...prev, ann]);
    }

    setTextPosition(null);
    setTextInput('');
  };

  // --- Delete selected annotation ---
  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    pushUndo(annotations);
    setAnnotations(prev => prev.filter(a => a.id !== selectedId));
    setSelectedId(null);
  }, [selectedId, annotations, pushUndo]);

  // --- Edit selected text annotation ---
  const editSelectedText = useCallback(() => {
    if (!selectedId) return;
    const ann = annotations.find(a => a.id === selectedId);
    if (ann?.type !== 'text') return;
    setEditingTextId(ann.id);
    setTextInput(ann.text);
    setTextPosition(ann.position);
    setTimeout(() => textInputRef.current?.focus(), 50);
  }, [selectedId, annotations]);

  // --- Undo / Redo ---
  const undo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack(rs => [...rs, annotations]);
    setAnnotations(prev);
    setUndoStack(us => us.slice(0, -1));
    setSelectedId(null);
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack(us => [...us, annotations]);
    setAnnotations(next);
    setRedoStack(rs => rs.slice(0, -1));
  };

  const clearAll = () => {
    if (annotations.length === 0) return;
    pushUndo(annotations);
    setAnnotations([]);
    setSelectedId(null);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && !textPosition) {
        e.preventDefault();
        deleteSelected();
      } else if (e.key === 'Escape') {
        if (textPosition) {
          setTextPosition(null);
          setTextInput('');
          setEditingTextId(null);
        } else if (selectedId) {
          setSelectedId(null);
        } else {
          onCancel();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [textPosition, onCancel, selectedId, deleteSelected, undoStack, redoStack]);

  // --- Export at Full Original Resolution ---
  const exportCanvas = useCallback((): HTMLCanvasElement | null => {
    if (!imgElement || canvasSize.width === 0) return null;

    const exportC = document.createElement('canvas');
    exportC.width = imgElement.naturalWidth;
    exportC.height = imgElement.naturalHeight;
    const ctx = exportC.getContext('2d')!;

    // Draw background image
    ctx.drawImage(imgElement, 0, 0);

    // Scale annotations to original resolution
    const scaleX = imgElement.naturalWidth / canvasSize.width;
    const scaleY = imgElement.naturalHeight / canvasSize.height;

    for (const ann of annotations) {
      const scaled = scaleAnnotation(ann, scaleX, scaleY);
      renderAnnotation(ctx, scaled);
    }

    return exportC;
  }, [imgElement, canvasSize, annotations]);

  const handleSave = () => {
    const c = exportCanvas();
    if (!c) return;
    c.toBlob(
      blob => {
        if (blob) onSave(blob);
      },
      'image/jpeg',
      0.95
    );
  };

  const handleDownload = () => {
    const c = exportCanvas();
    if (!c) return;
    const link = document.createElement('a');
    link.download = `imagem-editada-${Date.now()}.jpg`;
    link.href = c.toDataURL('image/jpeg', 0.95);
    link.click();
  };

  // Selected item position for floating action buttons
  const selectedAnnotation = selectedId ? annotations.find(a => a.id === selectedId) : null;
  const selectedBounds = selectedAnnotation ? getAnnotationBounds(selectedAnnotation) : null;

  // Tool button component
  const ToolBtn = ({
    t,
    icon: Icon,
    label,
  }: {
    t: ToolType;
    icon: React.ElementType;
    label: string;
  }) => (
    <button
      onClick={() => setTool(t)}
      className={`flex flex-col items-center justify-center gap-0.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
        tool === t
          ? 'bg-primary text-primary-foreground shadow-md shadow-primary/30 scale-105'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
      title={label}
      type="button"
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </button>
  );

  if (!imgLoaded) {
    return (
      <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <div className="text-muted-foreground text-xs font-semibold">Carregando imagem para edição...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col overflow-hidden select-none animate-in fade-in duration-200">
      {/* Top Toolbar */}
      <div className="shrink-0 border-b border-border bg-card/95 backdrop-blur-sm shadow-sm">
        <div className="flex items-center justify-between px-3 py-2 gap-2 max-w-full overflow-x-auto">
          {/* Tool Selector */}
          <div className="flex items-center gap-1 bg-muted/60 rounded-xl p-1 shrink-0">
            <ToolBtn t="select" icon={MousePointer2} label="Mover" />
            <ToolBtn t="arrow" icon={ArrowUpRight} label="Seta" />
            <ToolBtn t="pen" icon={Pen} label="Caneta" />
            <ToolBtn t="line" icon={Minus} label="Linha" />
            <ToolBtn t="circle" icon={Circle} label="Círculo" />
            <ToolBtn t="rect" icon={Square} label="Retângulo" />
            <ToolBtn t="text" icon={Type} label="Texto" />
            <ToolBtn t="eraser" icon={Eraser} label="Apagar" />
          </div>

          {/* Color & Settings */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Color swatches */}
            <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-lg">
              {COLOR_PRESETS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-5 h-5 rounded-full border transition-all hover:scale-110 ${
                    color === c ? 'border-primary ring-2 ring-primary/40 scale-110' : 'border-border/40'
                  }`}
                  style={{ backgroundColor: c }}
                  type="button"
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                className="w-5 h-5 rounded cursor-pointer border-0 p-0 ml-0.5"
                title="Cor personalizada"
              />
            </div>

            {/* Opacity slider */}
            <div className="flex items-center gap-1.5 min-w-[95px]">
              <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap">Opac.</span>
              <Slider
                value={[opacity * 100]}
                onValueChange={([v]) => setOpacity(v / 100)}
                max={100}
                min={15}
                step={5}
                className="w-14"
              />
              <span className="text-[10px] font-mono text-muted-foreground w-6">
                {Math.round(opacity * 100)}%
              </span>
            </div>

            {/* Stroke width */}
            <div className="flex items-center gap-1.5 min-w-[90px]">
              <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap">Esp.</span>
              <Slider
                value={[strokeWidth]}
                onValueChange={([v]) => setStrokeWidth(v)}
                max={18}
                min={1}
                step={1}
                className="w-14"
              />
              <span className="text-[10px] font-mono text-muted-foreground w-4">{strokeWidth}</span>
            </div>

            {/* Font size (text tool only) */}
            {tool === 'text' && (
              <div className="flex items-center gap-1.5 min-w-[95px]">
                <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap">Fonte</span>
                <Slider
                  value={[fontSize]}
                  onValueChange={([v]) => setFontSize(v)}
                  max={72}
                  min={12}
                  step={2}
                  className="w-14"
                />
                <span className="text-[10px] font-mono text-muted-foreground w-5">{fontSize}</span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={undo}
              disabled={undoStack.length === 0}
              className="h-8 px-2"
              title="Desfazer (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={redo}
              disabled={redoStack.length === 0}
              className="h-8 px-2"
              title="Refazer (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              disabled={annotations.length === 0}
              className="h-8 px-2 text-destructive hover:text-destructive"
              title="Limpar tudo"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>

            <div className="w-px h-6 bg-border mx-1" />

            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="h-8 px-2"
              title="Baixar imagem"
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={onCancel} className="h-8 px-3 text-xs">
              <X className="w-3.5 h-3.5 mr-1" /> Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} className="h-8 px-3 text-xs bg-primary font-bold">
              <Check className="w-3.5 h-3.5 mr-1" /> Salvar Imagem
            </Button>
          </div>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center bg-neutral-950 overflow-hidden p-3"
      >
        {canvasSize.width > 0 ? (
          <div
            className="relative shadow-2xl rounded-md overflow-visible"
            style={{ width: canvasSize.width, height: canvasSize.height }}
          >
            {/* Background image & committed annotations */}
            <canvas
              ref={canvasRef}
              width={canvasSize.width}
              height={canvasSize.height}
              className="absolute inset-0 rounded-md"
            />

            {/* Interactive overlay canvas */}
            <canvas
              ref={overlayCanvasRef}
              width={canvasSize.width}
              height={canvasSize.height}
              className="absolute inset-0 rounded-md"
              style={{
                cursor:
                  tool === 'select'
                    ? isDragging
                      ? 'grabbing'
                      : 'grab'
                    : tool === 'text'
                    ? 'text'
                    : tool === 'eraser'
                    ? 'none'
                    : 'crosshair',
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerLeave}
              onDoubleClick={handleDoubleClick}
            />

            {/* Floating Action Bar for Selected Item (Edit / Delete) */}
            {selectedId && selectedBounds && !textPosition && (
              <div
                className="absolute z-30 flex items-center gap-1.5 bg-card/95 border border-border shadow-xl rounded-lg p-1 animate-in fade-in zoom-in-95 duration-100"
                style={{
                  left: Math.max(
                    4,
                    Math.min(selectedBounds.minX, canvasSize.width - 150)
                  ),
                  top:
                    selectedBounds.minY > 44
                      ? selectedBounds.minY - 42
                      : selectedBounds.maxY + 8,
                }}
                onMouseDown={e => e.stopPropagation()}
                onTouchStart={e => e.stopPropagation()}
              >
                {selectedAnnotation?.type === 'text' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={e => {
                      e.stopPropagation();
                      editSelectedText();
                    }}
                    className="h-7 px-2.5 text-[11px] font-semibold gap-1 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Pencil className="w-3 h-3" />
                    Editar
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={e => {
                    e.stopPropagation();
                    deleteSelected();
                  }}
                  className="h-7 px-2.5 text-[11px] font-semibold gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Excluir
                </Button>
              </div>
            )}

            {/* Floating Text Input Box */}
            {textPosition && (
              <div
                className="absolute z-30"
                style={{
                  left: Math.max(4, Math.min(textPosition.x, canvasSize.width - 240)),
                  top: Math.max(4, Math.min(textPosition.y, canvasSize.height - 50)),
                }}
                onMouseDown={e => e.stopPropagation()}
                onTouchStart={e => e.stopPropagation()}
              >
                <div className="flex items-center gap-1 bg-card border-2 border-primary rounded-lg shadow-2xl p-1 animate-in zoom-in-95 duration-150">
                  <Input
                    ref={textInputRef}
                    value={textInput}
                    onChange={e => setTextInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') confirmText();
                      if (e.key === 'Escape') {
                        setTextPosition(null);
                        setTextInput('');
                        setEditingTextId(null);
                      }
                    }}
                    placeholder="Digite o texto e pressione Enter..."
                    className="h-8 text-xs min-w-[200px] border-0 focus-visible:ring-0 bg-transparent font-semibold"
                    autoFocus
                  />
                  <Button size="sm" onClick={confirmText} className="h-7 px-2.5 shrink-0 bg-primary font-bold">
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setTextPosition(null);
                      setTextInput('');
                      setEditingTextId(null);
                    }}
                    className="h-7 px-2 shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-muted-foreground text-xs animate-pulse">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span>Ajustando visualização da imagem...</span>
          </div>
        )}
      </div>

      {/* Bottom Info Bar */}
      <div className="shrink-0 border-t border-border bg-card/90 px-4 py-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>
            {annotations.length} anotaç{annotations.length === 1 ? 'ão' : 'ões'}
          </span>
          {selectedId && <span className="text-primary font-bold">· 1 selecionada (arraste para mover)</span>}
          <span>· Ferramenta atual: <strong className="text-foreground capitalize">{tool}</strong></span>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-[10px]">
          <span>Mover: clique para selecionar e arrastar</span>
          <span>Texto: clique duplo para editar</span>
          <span>Delete / Backspace: excluir</span>
          <span>Ctrl+Z: desfazer</span>
          <span>Esc: cancelar</span>
        </div>
      </div>
    </div>
  );
}
