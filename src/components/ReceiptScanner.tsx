'use client';

import { useEffect, useState, useRef } from 'react';
import { Receipt } from '@/types';
import { Camera, Upload, Loader2, Image as ImageIcon } from 'lucide-react';

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
        <div className="flex flex-col items-center justify-center p-12 bg-blue-50 rounded-xl">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
          <p className="text-lg font-medium text-blue-700">Scanning receipt...</p>
          <p className="text-sm text-blue-500 mt-1">{scanMessage}</p>
          <p className="text-xs text-blue-400 mt-2">
            {scanSeconds}s elapsed. First local scan can take 30-60s.
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
          className="border-2 border-dashed border-gray-300 rounded-xl p-8 transition-colors hover:border-blue-400 hover:bg-blue-50"
        >
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <ImageIcon className="w-8 h-8 text-gray-400" />
            </div>

            <p className="text-lg font-medium text-gray-700 mb-2">
              Upload your receipt
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Take a photo or upload an image
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                <Camera className="w-5 h-5" />
                Take Photo
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:border-blue-400 hover:text-blue-600 transition-colors"
              >
                <Upload className="w-5 h-5" />
                Upload File
              </button>
            </div>

            <p className="text-xs text-gray-400 mt-4">
              Supported formats: JPG, PNG, HEIC
            </p>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mt-4 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="text-2xl">⚠️</div>
            <div className="flex-1">
              <p className="text-yellow-800 font-medium mb-1">Photo Upload Failed</p>
              <p className="text-yellow-700 text-sm">{error}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setError(null);
              setPreview(null);
            }}
            className="mt-3 text-sm text-yellow-700 font-medium underline"
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
