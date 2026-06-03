import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { 
  Sun, Contrast, RotateCcw, RotateCw, FlipHorizontal2, 
  Maximize2, X, Ruler, Search, Eye, EyeOff, ArrowUpRight
} from 'lucide-react';

interface RulerLine {
  id: string;
  start: { x: number; y: number };
  end: { x: number; y: number };
}

interface ArrowLine {
  id: string;
  start: { x: number; y: number };
  end: { x: number; y: number };
}

interface ImageViewerProps {
  src: string;
  alt: string;
  images?: string[];
  selectedImage?: number;
  setSelectedImage?: (index: number) => void;
}

export default function ImageViewer({ src, alt, images, selectedImage, setSelectedImage }: ImageViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);
  
  // Tool and View State
  const [activeTool, setActiveTool] = useState<'lens' | 'ruler' | 'arrow'>('lens');
  const [arrowLines, setArrowLines] = useState<ArrowLine[]>([]);
  const [zoom] = useState(2.5); // Fixed zoom magnification factor
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [invert, setInvert] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFSControls, setShowFSControls] = useState(true);

  // Ruler Drawing State
  const [rulerLines, setRulerLines] = useState<RulerLine[]>([]);
  const [currentLine, setCurrentLine] = useState<{ start: { x: number; y: number }; end: { x: number; y: number } } | null>(null);
  const [isDrawingRuler, setIsDrawingRuler] = useState(false);
  const [activeDrag, setActiveDrag] = useState<{
    lineId: string;
    type: 'start' | 'end' | 'move';
    initialMouse: { x: number; y: number };
    initialStart: { x: number; y: number };
    initialEnd: { x: number; y: number };
  } | null>(null);

  // Magnifier State
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [showLens, setShowLens] = useState(false);
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    });

    resizeObserver.observe(containerRef.current);

    setDimensions({
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    return () => {
      resizeObserver.disconnect();
    };
  }, [isFullscreen, src]);

  // Reset controls to defaults
  const resetControls = useCallback(() => {
    setBrightness(100);
    setContrast(100);
    setInvert(false);
    setRotation(0);
    setFlipH(false);
    setRulerLines([]);
    setArrowLines([]);
    setCurrentLine(null);
    setShowLens(false);
    setActiveDrag(null);
  }, []);

  // Sync state resets on image changes
  useEffect(() => {
    setRulerLines([]);
    setArrowLines([]);
    setCurrentLine(null);
    setShowLens(false);
    setImageAspectRatio(null);
    setActiveDrag(null);
  }, [src]);

  useEffect(() => {
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth) {
      setImageAspectRatio(imgRef.current.naturalWidth / imgRef.current.naturalHeight);
    }
  }, [src]);

  // Coordinates calculation helper (Returns relative percentage coordinates [0, 1] relative to the actual visible image rect)
  const getCoordinates = useCallback((e: React.MouseEvent | React.Touch) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const containerW = rect.width;
    const containerH = rect.height;

    // Default to container size
    let imgW = containerW;
    let imgH = containerH;
    let imgL = 0;
    let imgT = 0;

    if (imageAspectRatio && containerW > 0 && containerH > 0) {
      const containerRatio = containerW / containerH;
      if (imageAspectRatio > containerRatio) {
        imgH = containerW / imageAspectRatio;
        imgT = (containerH - imgH) / 2;
      } else {
        imgW = containerH * imageAspectRatio;
        imgL = (containerW - imgW) / 2;
      }
    }

    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const clickX_img = clickX - imgL;
    const clickY_img = clickY - imgT;

    return {
      x: Math.max(0, Math.min(1, clickX_img / imgW)),
      y: Math.max(0, Math.min(1, clickY_img / imgH)),
    };
  }, [imageAspectRatio]);

  // Handler to initiate dragging of an existing ruler line or its endpoints
  const handleRulerStartDrag = useCallback((
    e: React.MouseEvent | React.TouchEvent, 
    line: RulerLine, 
    type: 'start' | 'end' | 'move'
  ) => {
    e.stopPropagation();
    
    // Prevent default scroll behavior for touch interactions to allow dragging smoothly
    if (e.cancelable) {
      e.preventDefault();
    }
    
    const clientEvent = 'touches' in e ? e.touches[0] : e;
    const coords = getCoordinates(clientEvent);
    setActiveDrag({
      lineId: line.id,
      type,
      initialMouse: coords,
      initialStart: { ...line.start },
      initialEnd: { ...line.end },
    });
  }, [getCoordinates]);

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool === 'ruler' || activeTool === 'arrow') {
      const coords = getCoordinates(e);
      setCurrentLine({ start: coords, end: coords });
      setIsDrawingRuler(true);
    }
  }, [activeTool, getCoordinates]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const coords = getCoordinates(e);
    setMousePos(coords);

    if (activeDrag) {
      const dx = coords.x - activeDrag.initialMouse.x;
      const dy = coords.y - activeDrag.initialMouse.y;
      
      setRulerLines(prev => prev.map(line => {
        if (line.id !== activeDrag.lineId) return line;

        if (activeDrag.type === 'start') {
          return {
            ...line,
            start: {
              x: Math.max(0, Math.min(1, activeDrag.initialStart.x + dx)),
              y: Math.max(0, Math.min(1, activeDrag.initialStart.y + dy))
            }
          };
        } else if (activeDrag.type === 'end') {
          return {
            ...line,
            end: {
              x: Math.max(0, Math.min(1, activeDrag.initialEnd.x + dx)),
              y: Math.max(0, Math.min(1, activeDrag.initialEnd.y + dy))
            }
          };
        } else {
          // move type
          let newStartX = activeDrag.initialStart.x + dx;
          let newStartY = activeDrag.initialStart.y + dy;
          let newEndX = activeDrag.initialEnd.x + dx;
          let newEndY = activeDrag.initialEnd.y + dy;

          const minX = Math.min(newStartX, newEndX);
          const maxX = Math.max(newStartX, newEndX);
          const minY = Math.min(newStartY, newEndY);
          const maxY = Math.max(newStartY, newEndY);

          if (minX < 0) {
            newStartX -= minX;
            newEndX -= minX;
          } else if (maxX > 1) {
            newStartX -= (maxX - 1);
            newEndX -= (maxX - 1);
          }

          if (minY < 0) {
            newStartY -= minY;
            newEndY -= minY;
          } else if (maxY > 1) {
            newStartY -= (maxY - 1);
            newEndY -= (maxY - 1);
          }

          return {
            ...line,
            start: { x: newStartX, y: newStartY },
            end: { x: newEndX, y: newEndY }
          };
        }
      }));
    } else if (activeTool === 'lens') {
      setIsTouch(false);
      setShowLens(true);
    } else if ((activeTool === 'ruler' || activeTool === 'arrow') && isDrawingRuler) {
      setCurrentLine(prev => prev ? { ...prev, end: coords } : null);
    }
  }, [activeTool, isDrawingRuler, activeDrag, getCoordinates]);

  const handleMouseUp = useCallback(() => {
    if (activeDrag) {
      setActiveDrag(null);
      return;
    }
    if (activeTool === 'ruler') {
      if (currentLine) {
        const newLine: RulerLine = {
          id: Math.random().toString(36).substr(2, 9),
          start: currentLine.start,
          end: currentLine.end,
        };
        setRulerLines(prev => [...prev, newLine]);
        setCurrentLine(null);
      }
      setIsDrawingRuler(false);
    } else if (activeTool === 'arrow') {
      if (currentLine) {
        const newArrow: ArrowLine = {
          id: Math.random().toString(36).substr(2, 9),
          start: currentLine.start,
          end: currentLine.end,
        };
        setArrowLines(prev => [...prev, newArrow]);
        setCurrentLine(null);
      }
      setIsDrawingRuler(false);
    }
  }, [activeTool, currentLine, activeDrag]);

  const handleMouseLeave = useCallback(() => {
    setShowLens(false);
    if (activeDrag) {
      setActiveDrag(null);
      return;
    }
    if (activeTool === 'ruler') {
      if (currentLine) {
        const newLine: RulerLine = {
          id: Math.random().toString(36).substr(2, 9),
          start: currentLine.start,
          end: currentLine.end,
        };
        setRulerLines(prev => [...prev, newLine]);
        setCurrentLine(null);
      }
      setIsDrawingRuler(false);
    } else if (activeTool === 'arrow') {
      if (currentLine) {
        const newArrow: ArrowLine = {
          id: Math.random().toString(36).substr(2, 9),
          start: currentLine.start,
          end: currentLine.end,
        };
        setArrowLines(prev => [...prev, newArrow]);
        setCurrentLine(null);
      }
      setIsDrawingRuler(false);
    }
  }, [activeTool, currentLine, activeDrag]);

  // Touch event handlers
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 0) return;
    const coords = getCoordinates(e.touches[0]);
    setMousePos(coords);

    if (activeTool === 'lens') {
      setIsTouch(true);
      setShowLens(true);
    } else if (activeTool === 'ruler' || activeTool === 'arrow') {
      setCurrentLine({ start: coords, end: coords });
      setIsDrawingRuler(true);
    }
  }, [activeTool, getCoordinates]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 0) return;
    const coords = getCoordinates(e.touches[0]);
    setMousePos(coords);

    if (activeDrag) {
      const dx = coords.x - activeDrag.initialMouse.x;
      const dy = coords.y - activeDrag.initialMouse.y;
      
      setRulerLines(prev => prev.map(line => {
        if (line.id !== activeDrag.lineId) return line;

        if (activeDrag.type === 'start') {
          return {
            ...line,
            start: {
              x: Math.max(0, Math.min(1, activeDrag.initialStart.x + dx)),
              y: Math.max(0, Math.min(1, activeDrag.initialStart.y + dy))
            }
          };
        } else if (activeDrag.type === 'end') {
          return {
            ...line,
            end: {
              x: Math.max(0, Math.min(1, activeDrag.initialEnd.x + dx)),
              y: Math.max(0, Math.min(1, activeDrag.initialEnd.y + dy))
            }
          };
        } else {
          // move type
          let newStartX = activeDrag.initialStart.x + dx;
          let newStartY = activeDrag.initialStart.y + dy;
          let newEndX = activeDrag.initialEnd.x + dx;
          let newEndY = activeDrag.initialEnd.y + dy;

          const minX = Math.min(newStartX, newEndX);
          const maxX = Math.max(newStartX, newEndX);
          const minY = Math.min(newStartY, newEndY);
          const maxY = Math.max(newStartY, newEndY);

          if (minX < 0) {
            newStartX -= minX;
            newEndX -= minX;
          } else if (maxX > 1) {
            newStartX -= (maxX - 1);
            newEndX -= (maxX - 1);
          }

          if (minY < 0) {
            newStartY -= minY;
            newEndY -= minY;
          } else if (maxY > 1) {
            newStartY -= (maxY - 1);
            newEndY -= (maxY - 1);
          }

          return {
            ...line,
            start: { x: newStartX, y: newStartY },
            end: { x: newEndX, y: newEndY }
          };
        }
      }));
    } else if (activeTool === 'lens') {
      setIsTouch(true);
      setShowLens(true);
    } else if ((activeTool === 'ruler' || activeTool === 'arrow') && isDrawingRuler) {
      setCurrentLine(prev => prev ? { ...prev, end: coords } : null);
    }
  }, [activeTool, isDrawingRuler, activeDrag, getCoordinates]);

  const handleTouchEnd = useCallback(() => {
    setShowLens(false);
    if (activeDrag) {
      setActiveDrag(null);
      return;
    }
    if (activeTool === 'ruler') {
      if (currentLine) {
        const newLine: RulerLine = {
          id: Math.random().toString(36).substr(2, 9),
          start: currentLine.start,
          end: currentLine.end,
        };
        setRulerLines(prev => [...prev, newLine]);
        setCurrentLine(null);
      }
      setIsDrawingRuler(false);
    } else if (activeTool === 'arrow') {
      if (currentLine) {
        const newArrow: ArrowLine = {
          id: Math.random().toString(36).substr(2, 9),
          start: currentLine.start,
          end: currentLine.end,
        };
        setArrowLines(prev => [...prev, newArrow]);
        setCurrentLine(null);
      }
      setIsDrawingRuler(false);
    }
  }, [activeTool, currentLine, activeDrag]);

  // Calculator for ruler distance in mm (approx 200mm physical image width reference)
  const calculateDistance = useCallback((start: { x: number; y: number }, end: { x: number; y: number }) => {
    const IMAGE_PHYSICAL_WIDTH_MM = 200;
    const dx = (end.x - start.x) * IMAGE_PHYSICAL_WIDTH_MM;
    const dy = (end.y - start.y) * IMAGE_PHYSICAL_WIDTH_MM;
    const mm = Math.sqrt(dx * dx + dy * dy).toFixed(1);
    return `${mm} mm`;
  }, []);

  // CSS variables for interactive components
  const filterStyle = `brightness(${brightness}%) contrast(${contrast}%)${invert ? ' invert(1)' : ''}`;
  const lensSize = 180;
  const containerWidth = dimensions.width;
  const containerHeight = dimensions.height;

  // Convert relative coordinates back to pixels
  const mouseXPx = mousePos.x * containerWidth;
  const mouseYPx = mousePos.y * containerHeight;

  // Lens coordinate positioning with mobile touch offset
  let targetX = mouseXPx;
  let targetY = mouseYPx;
  if (isTouch && activeTool === 'lens') {
    targetY = mouseYPx - 80; // Offset 80px vertically on mobile to avoid finger obstruction
  }

  const lensLeft = targetX - lensSize / 2;
  const lensTop = targetY - lensSize / 2;
  const clampedX = Math.max(0, Math.min(lensLeft, containerWidth - lensSize));
  const clampedY = Math.max(0, Math.min(lensTop, containerHeight - lensSize));

  // Determine translation zoom align
  const offsetLeft = isTouch ? lensSize / 2 : mouseXPx - clampedX;
  const offsetTop = isTouch ? lensSize / 2 : mouseYPx - clampedY;
  const zoomedX = offsetLeft - mouseXPx * zoom;
  const zoomedY = offsetTop - mouseYPx * zoom;

  // Sub-render method to draw the image alongside the SVG ruler overlay (so both get zoomed inside the lens)
  const renderImageWithRuler = (isZoomed: boolean, width: number, height: number) => {
    const currentZoom = isZoomed ? zoom : 1;
    const computedWidth = width || 400;
    const computedHeight = height || 400;

    let imgW = computedWidth;
    let imgH = computedHeight;
    let imgL = 0;
    let imgT = 0;

    if (imageAspectRatio && computedWidth > 0 && computedHeight > 0) {
      const containerRatio = computedWidth / computedHeight;
      if (imageAspectRatio > containerRatio) {
        imgH = computedWidth / imageAspectRatio;
        imgT = (computedHeight - imgH) / 2;
      } else {
        imgW = computedHeight * imageAspectRatio;
        imgL = (computedWidth - imgW) / 2;
      }
    }
    
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Main Image */}
        <img
          ref={isZoomed ? undefined : imgRef}
          src={src}
          alt={alt}
          onLoad={(e) => {
            if (!isZoomed) {
              const img = e.currentTarget;
              setImageAspectRatio(img.naturalWidth / img.naturalHeight);
            }
          }}
          draggable={false}
          className="w-full h-full object-contain select-none"
          style={{
            transform: `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1})`,
            filter: filterStyle,
          }}
        />

        {/* Ruler SVG Overlay (Neon Yellow, scales stroke width inside magnifier) */}
        {(rulerLines.length > 0 || arrowLines.length > 0 || currentLine) && (
          <svg 
            className="absolute pointer-events-none"
            style={{ 
              zIndex: 20,
              left: `${imgL}px`,
              top: `${imgT}px`,
              width: `${imgW}px`,
              height: `${imgH}px`,
            }}
            viewBox={`0 0 ${imgW} ${imgH}`}
            preserveAspectRatio="none"
          >
            <defs>
              <marker
                id={isZoomed ? 'arrowhead-zoom' : 'arrowhead-main'}
                markerWidth="8"
                markerHeight="6"
                refX="8"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill="#f43f5e" />
              </marker>
            </defs>

            {/* Draw completed lines */}
            {rulerLines.map((line) => {
              const x1 = line.start.x * imgW;
              const y1 = line.start.y * imgH;
              const x2 = line.end.x * imgW;
              const y2 = line.end.y * imgH;
              
              // Only make the ruler interactive when on the main image and the ruler tool is active
              const isInteractive = !isZoomed && activeTool === 'ruler';
              
              return (
                <g key={line.id}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#eab308" // High contrast neon yellow
                    strokeWidth={2.5 / currentZoom}
                    strokeDasharray={`${5 / currentZoom} ${3 / currentZoom}`}
                  />
                  {/* Start Point */}
                  <circle cx={x1} cy={y1} r={5 / currentZoom} fill="#eab308" />
                  <circle cx={x1} cy={y1} r={9 / currentZoom} stroke="#eab308" strokeWidth={1 / currentZoom} fill="none" />
                  {/* End Point */}
                  <circle cx={x2} cy={y2} r={5 / currentZoom} fill="#eab308" />
                  <circle cx={x2} cy={y2} r={9 / currentZoom} stroke="#eab308" strokeWidth={1 / currentZoom} fill="none" />
                  
                  {/* Distance label */}
                  <g transform={`translate(${(x1 + x2) / 2}, ${(y1 + y2) / 2 - 12 / currentZoom})`}>
                    <text
                      fill="#eab308"
                      fontSize={12 / currentZoom}
                      fontWeight="bold"
                      fontFamily="monospace"
                      textAnchor="middle"
                      style={{ filter: 'drop-shadow(0px 1px 3px rgba(0,0,0,0.9))' }}
                    >
                      {calculateDistance(line.start, line.end)}
                    </text>
                  </g>

                  {/* Interactive invisible targets for mouse & touch dragging */}
                  {isInteractive && (
                    <>
                      {/* Invisible line target for moving the entire line */}
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke="transparent"
                        strokeWidth={15 / currentZoom}
                        style={{ cursor: activeDrag ? 'grabbing' : 'grab' }}
                        className="pointer-events-auto"
                        onMouseDown={(e) => handleRulerStartDrag(e, line, 'move')}
                        onTouchStart={(e) => handleRulerStartDrag(e, line, 'move')}
                      />
                      
                      {/* Invisible larger target for the start point */}
                      <circle
                        cx={x1}
                        cy={y1}
                        r={14 / currentZoom}
                        fill="transparent"
                        style={{ cursor: activeDrag ? 'grabbing' : 'grab' }}
                        className="pointer-events-auto"
                        onMouseDown={(e) => handleRulerStartDrag(e, line, 'start')}
                        onTouchStart={(e) => handleRulerStartDrag(e, line, 'start')}
                      />

                      {/* Invisible larger target for the end point */}
                      <circle
                        cx={x2}
                        cy={y2}
                        r={14 / currentZoom}
                        fill="transparent"
                        style={{ cursor: activeDrag ? 'grabbing' : 'grab' }}
                        className="pointer-events-auto"
                        onMouseDown={(e) => handleRulerStartDrag(e, line, 'end')}
                        onTouchStart={(e) => handleRulerStartDrag(e, line, 'end')}
                      />
                    </>
                  )}
                </g>
              );
            })}

            {/* Draw completed arrows */}
            {arrowLines.map((line) => {
              const x1 = line.start.x * imgW;
              const y1 = line.start.y * imgH;
              const x2 = line.end.x * imgW;
              const y2 = line.end.y * imgH;
              return (
                <g key={line.id}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#f43f5e"
                    strokeWidth={2.5 / currentZoom}
                    markerEnd={`url(#${isZoomed ? 'arrowhead-zoom' : 'arrowhead-main'})`}
                  />
                </g>
              );
            })}

            {/* Draw active line in progress */}
            {currentLine && (
              <g>
                {(() => {
                  const x1 = currentLine.start.x * imgW;
                  const y1 = currentLine.start.y * imgH;
                  const x2 = currentLine.end.x * imgW;
                  const y2 = currentLine.end.y * imgH;
                  
                  if (activeTool === 'arrow') {
                    return (
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke="#fda4af" // Lighter pink
                        strokeWidth={2.5 / currentZoom}
                        markerEnd={`url(#${isZoomed ? 'arrowhead-zoom' : 'arrowhead-main'})`}
                      />
                    );
                  }

                  return (
                    <>
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke="#fef08a" // lighter yellow
                        strokeWidth={2.5 / currentZoom}
                        strokeDasharray={`${5 / currentZoom} ${3 / currentZoom}`}
                      />
                      <circle cx={x1} cy={y1} r={5 / currentZoom} fill="#fef08a" />
                      <circle cx={x1} cy={y1} r={9 / currentZoom} stroke="#fef08a" strokeWidth={1 / currentZoom} fill="none" />
                      <circle cx={x2} cy={y2} r={5 / currentZoom} fill="#fef08a" />
                      <circle cx={x2} cy={y2} r={9 / currentZoom} stroke="#fef08a" strokeWidth={1 / currentZoom} fill="none" />
                      
                      <g transform={`translate(${(x1 + x2) / 2}, ${(y1 + y2) / 2 - 12 / currentZoom})`}>
                        <text
                          fill="#fef08a"
                          fontSize={12 / currentZoom}
                          fontWeight="bold"
                          fontFamily="monospace"
                          textAnchor="middle"
                          style={{ filter: 'drop-shadow(0px 1px 3px rgba(0,0,0,0.9))' }}
                        >
                          {calculateDistance(currentLine.start, currentLine.end)}
                        </text>
                      </g>
                    </>
                  );
                })()}
              </g>
            )}
          </svg>
        )}
      </div>
    );
  };

  // Interactive Container Render Function (Reusable)
  const renderInteractiveContainer = (isFS: boolean) => {
    return (
      <div
        ref={containerRef}
        className={`relative w-full overflow-hidden bg-black select-none ${
          isFS ? 'h-full max-h-full' : 'aspect-square rounded-lg'
        }`}
        style={{ 
          cursor: activeDrag 
            ? 'grabbing' 
            : (activeTool === 'ruler' || activeTool === 'arrow') ? 'crosshair' : 'default',
          touchAction: 'none' // Lock mobile gestures completely when interacting with tools
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Render base image and ruler */}
        {renderImageWithRuler(false, containerWidth, containerHeight)}

        {/* Magnifier Lens (Draws zoomed image and scaled ruler inside) */}
        {showLens && activeTool === 'lens' && containerWidth > 0 && containerHeight > 0 && (
          <div
            className="absolute pointer-events-none border-2 border-primary rounded-lg shadow-[0_10px_25px_-5px_rgba(0,0,0,0.5),_0_8px_10px_-6px_rgba(0,0,0,0.5)] overflow-hidden bg-black"
            style={{
              left: `${clampedX}px`,
              top: `${clampedY}px`,
              width: `${lensSize}px`,
              height: `${lensSize}px`,
              zIndex: 30, // Higher than the main container's SVG ruler (which has z-20)
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: `${containerWidth}px`,
                height: `${containerHeight}px`,
                transformOrigin: '0 0',
                transform: `translate(${zoomedX}px, ${zoomedY}px) scale(${zoom})`,
              }}
            >
              {renderImageWithRuler(true, containerWidth, containerHeight)}
            </div>
          </div>
        )}

        {/* Maximize Button */}
        {!isFS && (
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setIsFullscreen(true);
            }}
            className="absolute top-2 right-2 bg-black/60 backdrop-blur-md border border-white/10 hover:bg-black/80 rounded-md p-1.5 transition-colors z-30 shadow-md"
            title="Tela Cheia"
          >
            <Maximize2 className="w-4 h-4 text-white" />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Normal Interactive Image Area (only mount when not in fullscreen to preserve React Ref) */}
      {!isFullscreen && renderInteractiveContainer(false)}

      {/* Control Buttons with flex wrap for mobile screens */}
      <div className="bg-secondary/50 rounded-lg p-3 space-y-2 select-none">
        <div className="flex items-center gap-3">
          <Sun className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <Slider value={[brightness]} onValueChange={([v]) => setBrightness(v)} min={20} max={300} step={5} className="flex-1" />
          <span className="text-xs text-muted-foreground w-10 text-right">{brightness}%</span>
        </div>
        <div className="flex items-center gap-3">
          <Contrast className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <Slider value={[contrast]} onValueChange={([v]) => setContrast(v)} min={20} max={300} step={5} className="flex-1" />
          <span className="text-xs text-muted-foreground w-10 text-right">{contrast}%</span>
        </div>
        
        {/* Buttons wrapping enabled via flex-wrap */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/20 mt-1">
          {/* Tool selector buttons styled identically */}
          <Button
            variant={activeTool === 'lens' ? 'default' : 'outline'}
            size="sm"
            className="text-xs h-7 px-3 py-1"
            onClick={() => { setActiveTool('lens'); setShowLens(false); }}
          >
            <Search className="w-3 h-3 mr-1" /> Lupa
          </Button>
          <Button
            variant={activeTool === 'ruler' ? 'default' : 'outline'}
            size="sm"
            className="text-xs h-7 px-3 py-1"
            onClick={() => { setActiveTool('ruler'); setShowLens(false); }}
          >
            <Ruler className="w-3 h-3 mr-1" /> Régua
          </Button>
          <Button
            variant={activeTool === 'arrow' ? 'default' : 'outline'}
            size="sm"
            className="text-xs h-7 px-3 py-1"
            onClick={() => { setActiveTool('arrow'); setShowLens(false); }}
          >
            <ArrowUpRight className="w-3 h-3 mr-1" /> Seta
          </Button>

          {/* Divider */}
          <div className="w-px h-6 bg-border mx-1 hidden sm:block" />

          {/* Adjustments (Reset handles clearing all ruler markings) */}
          <Button variant={invert ? 'default' : 'outline'} size="sm" className="text-xs h-7 px-3 py-1" onClick={() => setInvert(!invert)}>
            Inverter
          </Button>
          <Button variant="outline" size="sm" className="text-xs h-7 px-3 py-1" onClick={() => setRotation((r) => (r + 90) % 360)}>
            <RotateCw className="w-3 h-3 mr-1" /> Rotacionar
          </Button>
          <Button variant={flipH ? 'default' : 'outline'} size="sm" className="text-xs h-7 px-3 py-1" onClick={() => setFlipH(!flipH)}>
            <FlipHorizontal2 className="w-3 h-3 mr-1" /> Espelhar
          </Button>
          <Button variant="outline" size="sm" className="text-xs h-7 px-3 py-1" onClick={resetControls}>
            <RotateCcw className="w-3 h-3 mr-1" /> Resetar
          </Button>
        </div>
      </div>

      {/* Fullscreen Overlay */}
      {isFullscreen && createPortal(
        <div 
          id="image-viewer-fullscreen"
          className="fixed inset-0 z-[200] bg-black w-screen h-screen select-none flex flex-col overflow-hidden pointer-events-auto"
        >
          {/* Header Controls for Adjustments (Collapsible top bar) */}
          {showFSControls && (
            <div className="w-full flex flex-wrap items-center justify-between gap-3 p-4 border-b border-white/10 bg-black/90 backdrop-blur-md pr-28 z-40 flex-shrink-0">
              <span className="text-white/80 text-sm font-semibold">
                Caso Radiológico
              </span>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <label className="text-white/60 text-xs flex items-center gap-1.5 bg-white/5 px-2.5 py-1.5 rounded border border-white/10">
                  <Sun className="w-3.5 h-3.5" />
                  <span className="w-8">{brightness}%</span>
                  <input 
                    type="range" 
                    min={20} 
                    max={300} 
                    value={brightness} 
                    onChange={(e) => setBrightness(Number(e.target.value))} 
                    className="w-16 sm:w-20 accent-primary" 
                  />
                </label>
                <label className="text-white/60 text-xs flex items-center gap-1.5 bg-white/5 px-2.5 py-1.5 rounded border border-white/10">
                  <Contrast className="w-3.5 h-3.5" />
                  <span className="w-8">{contrast}%</span>
                  <input 
                    type="range" 
                    min={20} 
                    max={300} 
                    value={contrast} 
                    onChange={(e) => setContrast(Number(e.target.value))} 
                    className="w-16 sm:w-20 accent-primary" 
                  />
                </label>

                {/* Unified Tools Group in Fullscreen (Outlined style matching bottom buttons) */}
                <button
                  onClick={() => { setActiveTool('lens'); setShowLens(false); }}
                  className={`text-xs px-3 py-1.5 rounded border transition-colors flex items-center gap-1 ${activeTool === 'lens' ? 'bg-primary text-primary-foreground border-primary' : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10'}`}
                >
                  <Search className="w-3.5 h-3.5" /> Lupa
                </button>
                <button
                  onClick={() => { setActiveTool('ruler'); setShowLens(false); }}
                  className={`text-xs px-3 py-1.5 rounded border transition-colors flex items-center gap-1 ${activeTool === 'ruler' ? 'bg-primary text-primary-foreground border-primary' : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10'}`}
                >
                  <Ruler className="w-3.5 h-3.5" /> Régua
                </button>
                <button
                  onClick={() => { setActiveTool('arrow'); setShowLens(false); }}
                  className={`text-xs px-3 py-1.5 rounded border transition-colors flex items-center gap-1 ${activeTool === 'arrow' ? 'bg-primary text-primary-foreground border-primary' : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10'}`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" /> Seta
                </button>

                <div className="w-px h-6 bg-white/20" />
                
                <button
                  onClick={() => setInvert(!invert)}
                  className={`text-xs px-3 py-1.5 rounded border transition-colors ${invert ? 'bg-primary text-primary-foreground border-primary' : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10'}`}
                >
                  Inverter
                </button>
                <button
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="text-xs px-3 py-1.5 rounded bg-white/5 text-white/80 border border-white/10 hover:bg-white/10 flex items-center gap-1 transition-colors"
                >
                  <RotateCw className="w-3.5 h-3.5" /> Rotacionar
                </button>
                <button
                  onClick={() => setFlipH(!flipH)}
                  className={`text-xs px-3 py-1.5 rounded border transition-colors ${flipH ? 'bg-primary border-primary text-primary-foreground' : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10'}`}
                >
                  Espelhar
                </button>
                <button
                  onClick={resetControls}
                  className="text-xs px-3 py-1.5 rounded bg-white/5 text-white/80 border border-white/10 hover:bg-white/10 flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Resetar
                </button>
              </div>
            </div>
          )}

          {/* Fullscreen Interactive image box - takes remaining height */}
          <div className="flex-1 min-h-0 w-full relative bg-black z-10 flex items-center justify-center">
            {renderInteractiveContainer(true)}
          </div>

          {/* Thumbnails Navigation inside fullscreen */}
          {showFSControls && images && images.length > 1 && selectedImage !== undefined && setSelectedImage && (
            <div className="w-full flex gap-2 justify-center p-4 bg-black/90 backdrop-blur-md border-t border-white/10 z-40 flex-shrink-0">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => { setSelectedImage(i); setShowLens(false); }}
                  className={`w-14 h-14 rounded-md overflow-hidden border-2 flex-shrink-0 transition-colors ${
                    i === selectedImage ? 'border-primary' : 'border-white/20'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Floating Action Overlay (Always visible in Fullscreen, z-50) */}
          <div className="absolute top-4 right-4 flex items-center gap-2 z-50">
            <button
              onClick={() => setShowFSControls(prev => !prev)}
              className="bg-black/60 backdrop-blur-md border border-white/20 hover:bg-black/85 rounded-full p-2.5 transition-colors shadow-lg text-white"
              title={showFSControls ? 'Ocultar Controles' : 'Mostrar Controles'}
            >
              {showFSControls ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
            <button
              id="image-viewer-fs-close"
              onClick={() => { setIsFullscreen(false); setShowFSControls(true); }}
              className="bg-black/60 backdrop-blur-md border border-white/20 hover:bg-black/85 rounded-full p-2.5 transition-colors shadow-lg text-white"
              title="Sair da Tela Cheia"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
