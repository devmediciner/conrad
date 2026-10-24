import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnatomyLabel } from '@/types/conrademia';
import { getCoordinatesForSlice } from '@/services/conrademiaService';

interface AnatomyLeaderOverlayProps {
  labels: AnatomyLabel[];
  currentSlice: number;
  selectedLabelId: string | null;
  hoveredLabelId: string | null;
  onSelectLabel: (id: string | null) => void;
  onHoverLabel: (id: string | null) => void;
  showAllAlways?: boolean;
  isEditMode?: boolean;
  onPinDrag?: (labelId: string, newX: number, newY: number) => void;
  onLabelDrag?: (labelId: string, newLabelX: number, newLabelY: number) => void;
}

type AugmentedLabel = AnatomyLabel & {
  coords: ReturnType<typeof getCoordinatesForSlice>;
};

/**
 * Calculates collision-free vertical positions for margin labels,
 * keeping each label as close as possible to the organ's vertical height (pinY).
 * This results in clean, near-horizontal leader lines matching the reference layout.
 */
function layoutSideLabels(
  items: AugmentedLabel[],
  minSpacingPct = 4.8,
  minY = 12,
  maxY = 88
): number[] {
  if (items.length === 0) return [];
  if (items.length === 1) {
    const prefY = items[0].coords.labelY ?? items[0].coords.pinY;
    return [Math.max(minY, Math.min(maxY, prefY))];
  }

  // Map with initial target positions, honoring custom labelY if set
  const nodes = items.map((item, index) => {
    const prefY = item.coords.labelY ?? item.coords.pinY;
    const clampedY = Math.max(minY, Math.min(maxY, prefY));
    return {
      index,
      targetY: clampedY,
      currentY: clampedY,
    };
  });

  // Sort ascending by target position
  nodes.sort((a, b) => a.targetY - b.targetY);

  // Iterative relaxation to resolve overlaps while staying close to targetY
  const n = nodes.length;
  for (let iter = 0; iter < 24; iter++) {
    // Forward pass
    for (let i = 1; i < n; i++) {
      if (nodes[i].currentY - nodes[i - 1].currentY < minSpacingPct) {
        nodes[i].currentY = nodes[i - 1].currentY + minSpacingPct;
      }
    }
    // Backward pass
    if (nodes[n - 1].currentY > maxY) {
      nodes[n - 1].currentY = maxY;
    }
    for (let i = n - 2; i >= 0; i--) {
      if (nodes[i + 1].currentY - nodes[i].currentY < minSpacingPct) {
        nodes[i].currentY = nodes[i + 1].currentY - minSpacingPct;
      }
    }
    // Bottom bound clamping
    if (nodes[0].currentY < minY) {
      nodes[0].currentY = minY;
      for (let i = 1; i < n; i++) {
        if (nodes[i].currentY - nodes[i - 1].currentY < minSpacingPct) {
          nodes[i].currentY = nodes[i - 1].currentY + minSpacingPct;
        }
      }
    }
  }

  // Restore to original items array order
  const result = new Array(items.length);
  nodes.forEach(node => {
    result[node.index] = Math.max(minY, Math.min(maxY, node.currentY));
  });

  return result;
}

export const AnatomyLeaderOverlay: React.FC<AnatomyLeaderOverlayProps> = ({
  labels,
  currentSlice,
  selectedLabelId,
  hoveredLabelId,
  onSelectLabel,
  onHoverLabel,
  showAllAlways = true,
  isEditMode = false,
}) => {
  // 1. Filter labels visible in current slice
  const visibleLabels = useMemo(() => {
    return labels.filter(
      l => currentSlice >= l.sliceRange[0] && currentSlice <= l.sliceRange[1]
    );
  }, [labels, currentSlice]);

  // 2. Separate into Left and Right side columns based on organ position
  // In axial CT: Left of screen = Patient Right (Liver, Gallbladder, Right Kidney, VCI, etc.)
  // Right of screen = Patient Left (Spleen, Stomach, Left Kidney, Aorta, etc.)
  const { leftLabels, rightLabels } = useMemo(() => {
    const left: AugmentedLabel[] = [];
    const right: AugmentedLabel[] = [];

    // First pass: distinct sides
    const midline: AugmentedLabel[] = [];

    visibleLabels.forEach(label => {
      const coords = getCoordinatesForSlice(label, currentSlice);
      const augmented: AugmentedLabel = { ...label, coords };
      const sideAnchor = coords.labelX ?? coords.pinX;
      if (sideAnchor < 49) {
        left.push(augmented);
      } else if (sideAnchor > 51) {
        right.push(augmented);
      } else {
        midline.push(augmented);
      }
    });

    // Balance midline structures to whichever side has fewer labels
    midline.forEach(item => {
      if (left.length <= right.length) {
        left.push(item);
      } else {
        right.push(item);
      }
    });

    // Sort by vertical coordinate (labelY or pinY)
    left.sort((a, b) => (a.coords.labelY ?? a.coords.pinY) - (b.coords.labelY ?? b.coords.pinY));
    right.sort((a, b) => (a.coords.labelY ?? a.coords.pinY) - (b.coords.labelY ?? b.coords.pinY));

    return { leftLabels: left, rightLabels: right };
  }, [visibleLabels, currentSlice]);

  // 3. Compute collision-free vertical heights for margin labels
  const leftYPositions = useMemo(() => layoutSideLabels(leftLabels), [leftLabels]);
  const rightYPositions = useMemo(() => layoutSideLabels(rightLabels), [rightLabels]);

  // Anchor X positions in canvas percentage space:
  // -7% places the left bullet cleanly outside the CT image on the left
  // 107% places the right bullet cleanly outside the CT image on the right
  const LEFT_ANCHOR_X = -7;
  const RIGHT_ANCHOR_X = 107;

  const allAugmented = useMemo(() => [...leftLabels, ...rightLabels], [leftLabels, rightLabels]);

  const anyActive = !!(selectedLabelId || hoveredLabelId);

  return (
    <div
      className="absolute inset-0 pointer-events-none select-none"
      style={{ overflow: 'visible' }}
    >
      {/* ─── Desktop Side Leader Lines & Side Columns (Hidden on mobile < md) ─── */}
      <div className="hidden md:block">
        {/* SVG Leader Lines */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ overflow: 'visible' }}
        >
          {/* Left column leader lines */}
          {leftLabels.map((label, idx) => {
            const isSelected = selectedLabelId === label.id;
            const isHovered = hoveredLabelId === label.id;
            const isActive = isSelected || isHovered;

            if (!showAllAlways && !isActive) return null;

            const labelY = leftYPositions[idx];
            const pinX = label.coords.pinX;
            const pinY = label.coords.pinY;

            const opacity = isActive ? 1 : anyActive ? 0.3 : 0.85;
            const strokeWidth = isActive ? 1.5 : 0.75;

            return (
              <g key={`leader-left-${label.id}`}>
                {/* High-contrast subtle underlay halo */}
                <line
                  x1={LEFT_ANCHOR_X}
                  y1={labelY}
                  x2={pinX}
                  y2={pinY}
                  stroke="#000000"
                  strokeWidth={strokeWidth + 1.2}
                  strokeOpacity={opacity * 0.9}
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
                {/* Thin crisp colored leader line */}
                <line
                  x1={LEFT_ANCHOR_X}
                  y1={labelY}
                  x2={pinX}
                  y2={pinY}
                  stroke={label.color}
                  strokeWidth={strokeWidth}
                  strokeOpacity={opacity}
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  className="transition-all duration-150"
                />
              </g>
            );
          })}

          {/* Right column leader lines */}
          {rightLabels.map((label, idx) => {
            const isSelected = selectedLabelId === label.id;
            const isHovered = hoveredLabelId === label.id;
            const isActive = isSelected || isHovered;

            if (!showAllAlways && !isActive) return null;

            const labelY = rightYPositions[idx];
            const pinX = label.coords.pinX;
            const pinY = label.coords.pinY;

            const opacity = isActive ? 1 : anyActive ? 0.3 : 0.85;
            const strokeWidth = isActive ? 1.5 : 0.75;

            return (
              <g key={`leader-right-${label.id}`}>
                {/* High-contrast subtle underlay halo */}
                <line
                  x1={RIGHT_ANCHOR_X}
                  y1={labelY}
                  x2={pinX}
                  y2={pinY}
                  stroke="#000000"
                  strokeWidth={strokeWidth + 1.2}
                  strokeOpacity={opacity * 0.9}
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
                {/* Thin crisp colored leader line */}
                <line
                  x1={RIGHT_ANCHOR_X}
                  y1={labelY}
                  x2={pinX}
                  y2={pinY}
                  stroke={label.color}
                  strokeWidth={strokeWidth}
                  strokeOpacity={opacity}
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  className="transition-all duration-150"
                />
              </g>
            );
          })}
        </svg>

        {/* ─── Left Side Margin Labels (Desktop) ──────────────────────────── */}
        {leftLabels.map((label, idx) => {
          const isSelected = selectedLabelId === label.id;
          const isHovered = hoveredLabelId === label.id;
          const isActive = isSelected || isHovered;

          if (!showAllAlways && !isActive) return null;

          const labelY = leftYPositions[idx];
          const opacity = isActive ? 1 : anyActive ? 0.35 : 0.9;

          return (
            <div
              key={`text-left-${label.id}`}
              className="absolute pointer-events-auto z-30 transition-opacity duration-150"
              style={{
                left: `${LEFT_ANCHOR_X}%`,
                top: `${labelY}%`,
                transform: 'translate(-100%, -50%)',
                opacity,
              }}
              onMouseEnter={() => onHoverLabel(label.id)}
              onMouseLeave={() => onHoverLabel(null)}
              onClick={(e) => {
                e.stopPropagation();
                onSelectLabel(isSelected ? null : label.id);
              }}
            >
              {/* Label Row: [Text in Portuguese] [Bullet Dot] */}
              <div
                className={`flex items-center gap-2 cursor-pointer py-0.5 px-1.5 rounded transition-all duration-150 ${
                  isActive ? 'scale-105' : 'hover:scale-102'
                }`}
              >
                {/* Organ Name in Portuguese */}
                <span
                  className={`text-[10px] sm:text-[11px] lg:text-[12px] font-medium tracking-tight whitespace-nowrap select-none transition-colors duration-150 max-w-[120px] sm:max-w-[180px] truncate ${
                    isActive ? 'text-white font-semibold' : 'text-white/85 hover:text-white'
                  }`}
                  style={{
                    textShadow: '0 1px 4px rgba(0,0,0,0.95), 0 0 8px rgba(0,0,0,0.8)',
                  }}
                >
                  {label.namePt}
                </span>

                {/* Anchor Bullet Dot */}
                <span
                  className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full shrink-0 border border-white/60 transition-transform duration-150"
                  style={{
                    backgroundColor: label.color,
                    boxShadow: isActive ? `0 0 10px ${label.color}, 0 0 4px #ffffff` : `0 0 4px ${label.color}80`,
                    transform: isActive ? 'scale(1.2)' : 'scale(1)',
                  }}
                />
              </div>

              {/* Selected Popover Card */}
              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="mt-1 p-2.5 sm:p-3 rounded-lg bg-neutral-950/95 border backdrop-blur-md shadow-2xl max-w-[200px] sm:max-w-[240px] text-left"
                    style={{ borderColor: `${label.color}60` }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between pb-1 border-b border-white/10 mb-1">
                      <span className="text-xs font-bold text-white">{label.namePt}</span>
                      <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-white/70">
                        {label.category || 'Anatomia'}
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-white/80 leading-relaxed font-sans">
                      {label.description}
                    </p>
                    <div className="mt-1.5 pt-1 border-t border-white/10 flex items-center justify-between text-[10px] text-white/50">
                      <span>Cortes: {label.sliceRange[0] + 1} - {label.sliceRange[1] + 1}</span>
                      <button
                        onClick={() => onSelectLabel(null)}
                        className="text-primary hover:underline text-[10px]"
                      >
                        Fechar
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {/* ─── Right Side Margin Labels (Desktop) ─────────────────────────── */}
        {rightLabels.map((label, idx) => {
          const isSelected = selectedLabelId === label.id;
          const isHovered = hoveredLabelId === label.id;
          const isActive = isSelected || isHovered;

          if (!showAllAlways && !isActive) return null;

          const labelY = rightYPositions[idx];
          const opacity = isActive ? 1 : anyActive ? 0.35 : 0.9;

          return (
            <div
              key={`text-right-${label.id}`}
              className="absolute pointer-events-auto z-30 transition-opacity duration-150"
              style={{
                left: `${RIGHT_ANCHOR_X}%`,
                top: `${labelY}%`,
                transform: 'translate(0, -50%)',
                opacity,
              }}
              onMouseEnter={() => onHoverLabel(label.id)}
              onMouseLeave={() => onHoverLabel(null)}
              onClick={(e) => {
                e.stopPropagation();
                onSelectLabel(isSelected ? null : label.id);
              }}
            >
              {/* Label Row: [Bullet Dot] [Text in Portuguese] */}
              <div
                className={`flex items-center gap-2 cursor-pointer py-0.5 px-1.5 rounded transition-all duration-150 ${
                  isActive ? 'scale-105' : 'hover:scale-102'
                }`}
              >
                {/* Anchor Bullet Dot */}
                <span
                  className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full shrink-0 border border-white/60 transition-transform duration-150"
                  style={{
                    backgroundColor: label.color,
                    boxShadow: isActive ? `0 0 10px ${label.color}, 0 0 4px #ffffff` : `0 0 4px ${label.color}80`,
                    transform: isActive ? 'scale(1.2)' : 'scale(1)',
                  }}
                />

                {/* Organ Name in Portuguese */}
                <span
                  className={`text-[10px] sm:text-[11px] lg:text-[12px] font-medium tracking-tight whitespace-nowrap select-none transition-colors duration-150 max-w-[120px] sm:max-w-[180px] truncate ${
                    isActive ? 'text-white font-semibold' : 'text-white/85 hover:text-white'
                  }`}
                  style={{
                    textShadow: '0 1px 4px rgba(0,0,0,0.95), 0 0 8px rgba(0,0,0,0.8)',
                  }}
                >
                  {label.namePt}
                </span>
              </div>

              {/* Selected Popover Card */}
              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="mt-1 p-3 rounded-lg bg-neutral-950/95 border backdrop-blur-md shadow-2xl max-w-[240px] text-left"
                    style={{ borderColor: `${label.color}60` }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between pb-1.5 border-b border-white/10 mb-1.5">
                      <span className="text-xs font-bold text-white">{label.namePt}</span>
                      <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-white/70">
                        {label.category || 'Anatomia'}
                      </span>
                    </div>
                    <p className="text-[11px] text-white/80 leading-relaxed font-sans">
                      {label.description}
                    </p>
                    <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px] text-white/50">
                      <span>Cortes: {label.sliceRange[0] + 1} - {label.sliceRange[1] + 1}</span>
                      <button
                        onClick={() => onSelectLabel(null)}
                        className="text-primary hover:underline text-[10px]"
                      >
                        Fechar
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* ─── Organ Pins Layer (Always visible, responsive, crisp round circles) ─── */}
      {allAugmented.map(label => {
        const isSelected = selectedLabelId === label.id;
        const isHovered = hoveredLabelId === label.id;
        const isActive = isSelected || isHovered;
        const pinX = label.coords.pinX;
        const pinY = label.coords.pinY;

        return (
          <div
            key={`pin-dot-${label.id}`}
            className="absolute pointer-events-auto z-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
            style={{
              left: `${pinX}%`,
              top: `${pinY}%`,
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectLabel(isSelected ? null : label.id);
            }}
            onMouseEnter={() => onHoverLabel(label.id)}
            onMouseLeave={() => onHoverLabel(null)}
          >
            {/* Touch expansion hit area (32px on mobile, 24px on desktop) */}
            <div className="absolute -inset-3 sm:-inset-2 rounded-full" />

            {/* Outer glowing pulsing ring when active */}
            {isActive && (
              <span
                className="absolute -inset-1.5 rounded-full animate-ping opacity-75 pointer-events-none"
                style={{ backgroundColor: label.color }}
              />
            )}

            {/* Crisp round pin dot with white border */}
            <div
              className={`rounded-full transition-all duration-150 border-2 shadow-lg ${
                isActive
                  ? 'w-4 h-4 scale-125 border-white ring-2 ring-primary ring-offset-1 ring-offset-black'
                  : 'w-3 h-3 sm:w-2.5 sm:h-2.5 border-white/90 group-hover:scale-125 group-hover:border-white'
              }`}
              style={{
                backgroundColor: label.color,
                boxShadow: `0 0 10px ${label.color}, 0 2px 6px rgba(0,0,0,0.9)`,
              }}
            />

            {/* Mobile-only Floating Name Tooltip (appears over the pin when selected or hovered) */}
            {(isActive || isSelected) && (
              <div
                className="md:hidden absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 rounded-full bg-neutral-950/95 border border-white/30 backdrop-blur-md shadow-2xl text-center whitespace-nowrap z-50 pointer-events-none flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150"
                style={{ borderColor: label.color }}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: label.color }} />
                <span className="text-[11px] font-bold text-white tracking-tight">
                  {label.namePt}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
