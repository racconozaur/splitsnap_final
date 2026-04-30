import { NextRequest, NextResponse } from 'next/server';
import {
  extractReceiptWithGemini,
  extractTextFromImageLocal,
  parseReceiptText,
  withTimeout,
} from '@/lib/ocr';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const mimeType = file.type || 'image/jpeg';

    if (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY) {
      const receipt = await withTimeout(
        extractReceiptWithGemini(buffer, mimeType),
        60000,
        'AI receipt scanning took too long. Try a clearer, closer photo of just the receipt.'
      );

      return NextResponse.json({
        success: true,
        provider: 'gemini',
        rawText: '',
        receipt,
        confidence: receipt.items.reduce((sum, i) => sum + (i.confidence || 0.8), 0) / Math.max(receipt.items.length, 1),
      });
    }

    const rawText = await withTimeout(
      extractTextFromImageLocal(buffer),
      120000,
      'Local scanning took too long. Add GEMINI_API_KEY for faster AI receipt scanning, or try a clearer photo.'
    );

    const receipt = parseReceiptText(rawText);
    return NextResponse.json({
      success: true,
      provider: 'tesseract',
      rawText,
      receipt,
      confidence: receipt.items.reduce((sum, i) => sum + (i.confidence || 0.8), 0) / Math.max(receipt.items.length, 1),
    });
  } catch (error) {
    console.error('Receipt scan error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to scan receipt' },
      { status: 500 }
    );
  }
}
//made with Bob
