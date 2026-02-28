'use client';

import { useRef, useState } from 'react';
import { Eraser, PenTool } from 'lucide-react';

interface SignaturePadProps {
  onSign: (signatureData: string) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function SignaturePad({
  onSign,
  onCancel,
  isSubmitting = false,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  const startDrawing = (
    e:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x =
      'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y =
      'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasSigned(true);
  };

  const draw = (
    e:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x =
      'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y =
      'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.strokeStyle = '#1e3a8a'; // brand blue
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
  };

  const handleSign = () => {
    if (!hasSigned) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // In a real app we might want to get the data url
    // const dataUrl = canvas.toDataURL('image/png');
    // For now we just pass a string flag
    onSign('SIGNED_DATA');
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="relative border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50 overflow-hidden group">
        {!hasSigned && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 pointer-events-none group-hover:text-gray-500 transition-colors">
            <span className="flex items-center gap-2">
              <PenTool className="w-5 h-5" />
              Draw your signature here
            </span>
          </div>
        )}
        <canvas
          ref={canvasRef}
          width={500}
          height={200}
          className="w-full touch-none cursor-crosshair bg-transparent relative z-10"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {hasSigned && (
          <button
            type="button"
            onClick={clearSignature}
            className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-sm text-gray-500 hover:text-red-500 transition-colors z-20"
            title="Clear signature"
          >
            <Eraser className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-4 justify-end pt-4">
        <button
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSign}
          disabled={!hasSigned || isSubmitting}
          className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-brand-blue hover:bg-blue-700 shadow-md shadow-brand-blue/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Signing...' : 'Sign Agreement'}
        </button>
      </div>
    </div>
  );
}
