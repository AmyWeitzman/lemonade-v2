/**
 * DrawingCanvas — HTML5 canvas drawing component for the Notes section.
 * Supports pen tool, eraser, color picker, stroke size, and clear.
 */
import { useRef, useEffect, useState, useCallback } from 'react';
import {
  Box,
  IconButton,
  Tooltip,
  Slider,
  Stack,
  Paper,
} from '@mui/material';
import BrushIcon from '@mui/icons-material/Brush';
import AutoFixNormalIcon from '@mui/icons-material/AutoFixNormal';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

interface DrawingCanvasProps {
  /** Initial data URL to restore a saved drawing */
  initialDataUrl?: string;
  /** Called whenever the drawing changes, with the new data URL */
  onChange?: (dataUrl: string) => void;
  width?: number;
  height?: number;
}

type Tool = 'pen' | 'eraser';

const COLORS = [
  '#1a1a1a', '#e53935', '#1e88e5', '#43a047',
  '#fb8c00', '#8e24aa', '#00acc1', '#f06292',
];

export default function DrawingCanvas({
  initialDataUrl,
  onChange,
  width = 320,
  height = 200,
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#1a1a1a');
  const [strokeSize, setStrokeSize] = useState(3);

  // Restore saved drawing on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (initialDataUrl) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = initialDataUrl;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const getPos = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      const touch = e.touches[0];
      if (!touch) return null;
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    isDrawing.current = true;
    lastPos.current = getPos(e);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      if (!isDrawing.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const pos = getPos(e);
      if (!pos || !lastPos.current) return;

      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
      ctx.lineWidth = tool === 'eraser' ? strokeSize * 4 : strokeSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      lastPos.current = pos;
    },
    [tool, color, strokeSize], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const stopDrawing = useCallback(() => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    lastPos.current = null;

    // Notify parent of change
    const canvas = canvasRef.current;
    if (canvas && onChange) {
      onChange(canvas.toDataURL('image/png'));
    }
  }, [onChange]);

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (onChange) onChange(canvas.toDataURL('image/png'));
  };

  return (
    <Box>
      {/* Toolbar */}
      <Paper
        variant="outlined"
        sx={{ p: 0.75, mb: 1, borderRadius: 1.5, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}
      >
        {/* Tool buttons */}
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Pen">
            <IconButton
              size="small"
              onClick={() => setTool('pen')}
              color={tool === 'pen' ? 'primary' : 'default'}
              sx={{ bgcolor: tool === 'pen' ? 'primary.light' : undefined }}
            >
              <BrushIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eraser">
            <IconButton
              size="small"
              onClick={() => setTool('eraser')}
              color={tool === 'eraser' ? 'primary' : 'default'}
              sx={{ bgcolor: tool === 'eraser' ? 'primary.light' : undefined }}
            >
              <AutoFixNormalIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Clear canvas">
            <IconButton size="small" onClick={handleClear} color="error">
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>

        {/* Color swatches */}
        <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
          {COLORS.map((c) => (
            <Box
              key={c}
              onClick={() => { setColor(c); setTool('pen'); }}
              sx={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                bgcolor: c,
                cursor: 'pointer',
                border: color === c && tool === 'pen' ? '2px solid #2FB6D3' : '2px solid transparent',
                boxSizing: 'border-box',
                '&:hover': { opacity: 0.8 },
              }}
            />
          ))}
        </Stack>

        {/* Stroke size */}
        <Box sx={{ minWidth: 80, px: 1 }}>
          <Slider
            size="small"
            min={1}
            max={16}
            value={strokeSize}
            onChange={(_, v) => setStrokeSize(v as number)}
            aria-label="Stroke size"
          />
        </Box>
      </Paper>

      {/* Canvas */}
      <Box
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          overflow: 'hidden',
          cursor: tool === 'eraser' ? 'cell' : 'crosshair',
          touchAction: 'none',
          width: '100%',
        }}
      >
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          style={{ display: 'block', width: '100%', height: 'auto', background: '#fff' }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </Box>
    </Box>
  );
}
