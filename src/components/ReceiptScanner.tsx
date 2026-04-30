'use client';

import { useEffect, useState, useRef } from 'react';
import { Receipt } from '@/types';
import { Camera, Upload, Loader2, Image as ImageIcon } from 'lucide-react';
import { ui } from '@/lib/ui';

interface ReceiptScannerProps {
  onScanComplete: (receipt: Receipt) => void;
}

export default function ReceiptScanner({ onScanComplete }: ReceiptScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanSeconds, setScanSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isScanning) return;

    const timer = window.setInterval(() => {
      setScanSeconds((seconds) => seconds + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isScanning]);

  const processImage = async (file: File) => {
    setIsScanning(true);
    setError(null);
    setScanSeconds(0);

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    try {
      const optimizedFile = await optimizeImageForOcr(file);
      const formData = new FormData();
      formData.append('image', optimizedFile);
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 125000);

      const response = await fetch('/api/receipt/scan', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      }).finally(() => window.clearTimeout(timeoutId));

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to scan receipt');
      }

      const data = await response.json();
      onScanComplete(data.receipt);
    } catch (err) {
      const errorMessage = err instanceof DOMException && err.name === 'AbortError'
        ? 'Scanning timed out. Try cropping closer to the receipt or use the demo receipt.'
        : err instanceof Error ? err.message : 'Failed to scan receipt';

      setError(errorMessage);
      console.error('Scan error:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processImage(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      processImage(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const scanMessage = getScanMessage(scanSeconds);

  return (
    <div className="w-full">
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      {isScanning ? (
        /* Scanning state */
        <div className={`${ui.panel} flex flex-col items-center justify-center p-8 text-center sm:p-12`}>
          <Loader2 className="mb-4 h-12 w-12 animate-spin text-[#0f766e]" />
          <p className="text-lg font-semibold text-[#171717]">Scanning receipt</p>
          <p className="mt-1 text-sm text-[#5d5d53]">{scanMessage}</p>
          <p className="mt-2 text-xs text-[#77776c]">
            {scanSeconds}s elapsed. AI scans usually finish faster than local fallback.
          </p>
          {preview && (
            <img
              src={preview}
              alt="Receipt preview"
              className="mt-4 max-h-48 rounded-lg shadow-md opacity-50"
            />
          )}
        </div>
      ) : (
        /* Upload zone */
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="rounded-xl border-2 border-dashed border-[#d8d8ce] bg-white p-6 transition-colors hover:border-[#171717] sm:p-8"
        >
          <div className="flex flex-col items-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#f0f5ef]">
              <ImageIcon className="h-8 w-8 text-[#0f766e]" />
            </div>

            <p className="mb-2 text-lg font-semibold text-[#171717]">
              Upload your receipt
            </p>
            <p className="mb-6 text-sm text-[#5d5d53]">
              Take a photo or upload an image
            </p>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <button
                onClick={() => cameraInputRef.current?.click()}
                className={ui.primaryButton}
              >
                <Camera className="w-5 h-5" />
                Take Photo
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className={ui.secondaryButton}
              >
                <Upload className="w-5 h-5" />
                Upload File
              </button>
            </div>

            <p className="mt-4 text-xs text-[#77776c]">
              Supported formats: JPG, PNG, HEIC
            </p>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mt-4 rounded-lg border border-[#f2d37b] bg-[#fff8df] p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">⚠️</div>
            <div className="flex-1">
              <p className="mb-1 font-semibold text-[#5b4213]">Photo Upload Failed</p>
              <p className="text-sm text-[#6f561f]">{error}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setError(null);
              setPreview(null);
            }}
            className="mt-3 text-sm font-semibold text-[#5b4213] underline"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

function getScanMessage(seconds: number): string {
  if (seconds < 3) return 'Preparing photo for OCR';
  if (seconds < 15) return 'AI is reading the receipt';
  if (seconds < 40) return 'Extracting items, quantities, and totals';
  if (seconds < 75) return 'Still working. Local fallback OCR can be slower if AI is not configured';
  return 'Almost there, or try a closer/cropped photo if this keeps running';
}

async function optimizeImageForOcr(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;

  try {
    const imageUrl = URL.createObjectURL(file);
    const image = await loadImage(imageUrl);
    URL.revokeObjectURL(imageUrl);

    const maxSide = 1600;
    const scale = Math.min(1, maxSide / Math.max(image.width, image.height));

    if (scale === 1 && file.size < 900000) {
      return file;
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));

    const context = canvas.getContext('2d');
    if (!context) return file;

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.85);
    });

    if (!blob) return file;

    const fileName = file.name.replace(/\.[^.]+$/, '') || 'receipt';
    return new File([blob], `${fileName}-ocr.jpg`, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}
