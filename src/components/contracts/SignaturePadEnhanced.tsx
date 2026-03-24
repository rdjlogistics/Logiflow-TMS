import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RotateCcw, PenLine, Type } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SignaturePadEnhancedProps {
  onSignatureChange: (data: string | null) => void;
  signerName?: string;
  disabled?: boolean;
}

export function SignaturePadEnhanced({
  onSignatureChange,
  signerName = '',
  disabled = false,
}: SignaturePadEnhancedProps) {
  const [mode, setMode] = useState<'draw' | 'type'>('draw');
  const [typedSignature, setTypedSignature] = useState(signerName);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const typedCanvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize draw canvas
  useEffect(() => {
    if (mode === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const resizeCanvas = () => {
        const parent = canvas.parentElement;
        if (parent) {
          const dpr = window.devicePixelRatio || 1;
          const cssWidth = parent.clientWidth;
          const cssHeight = 160;
          canvas.width = cssWidth * dpr;
          canvas.height = cssHeight * dpr;
          canvas.style.width = `${cssWidth}px`;
          canvas.style.height = `${cssHeight}px`;
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      };

      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);
      return () => window.removeEventListener('resize', resizeCanvas);
    }
  }, [mode]);

  // Generate typed signature
  useEffect(() => {
    if (mode === 'type' && typedSignature) {
      const canvas = typedCanvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = 160;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Set font style for signature look
      ctx.font = 'italic 48px "Brush Script MT", "Segoe Script", cursive';
      ctx.fillStyle = '#1e293b';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      ctx.fillText(typedSignature, canvas.width / 2, canvas.height / 2);
      
      onSignatureChange(canvas.toDataURL('image/png'));
    } else if (mode === 'type') {
      onSignatureChange(null);
    }
  }, [mode, typedSignature, onSignatureChange]);

  const getCoordinates = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.TouchEvent | React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing && canvasRef.current) {
      onSignatureChange(canvasRef.current.toDataURL('image/png'));
    }
    setIsDrawing(false);
  };

  const clearDrawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onSignatureChange(null);
  };

  const handleModeChange = (newMode: string) => {
    setMode(newMode as 'draw' | 'type');
    if (newMode === 'draw') {
      clearDrawCanvas();
    } else {
      setTypedSignature(signerName);
    }
  };

  return (
    <div className="space-y-4">
      <Tabs value={mode} onValueChange={handleModeChange}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="draw" disabled={disabled}>
            <PenLine className="h-4 w-4 mr-2" />
            Tekenen
          </TabsTrigger>
          <TabsTrigger value="type" disabled={disabled}>
            <Type className="h-4 w-4 mr-2" />
            Typen
          </TabsTrigger>
        </TabsList>

        <TabsContent value="draw" className="mt-4">
          <div className="space-y-3">
            <div className={cn(
              "border-2 border-dashed rounded-xl bg-card overflow-hidden relative",
              disabled ? "opacity-50 cursor-not-allowed" : ""
            )}>
              <canvas
                ref={canvasRef}
                className={cn(
                  "w-full h-[160px] touch-none",
                  disabled ? "cursor-not-allowed" : "cursor-crosshair"
                )}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              {!hasDrawn && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-muted-foreground/40 text-lg font-medium">
                    Teken hier uw handtekening
                  </p>
                </div>
              )}
            </div>
            <div className="flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearDrawCanvas}
                disabled={!hasDrawn || disabled}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Wissen
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="type" className="mt-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="typed-signature">Typ uw naam</Label>
              <Input
                id="typed-signature"
                value={typedSignature}
                onChange={(e) => setTypedSignature(e.target.value)}
                placeholder="Volledige naam..."
                disabled={disabled}
                className="text-lg"
              />
            </div>
            <div className="border-2 border-dashed rounded-xl bg-card overflow-hidden">
              <canvas
                ref={typedCanvasRef}
                className="w-full h-[160px]"
              />
              {!typedSignature && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-muted-foreground/40 text-lg font-medium">
                    Voorbeeld handtekening
                  </p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground text-center">
        Door te ondertekenen gaat u akkoord met de voorwaarden in dit contract.
        Deze handtekening is juridisch bindend.
      </p>
    </div>
  );
}