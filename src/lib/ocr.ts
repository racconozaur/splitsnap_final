import { Receipt, ReceiptItem } from '@/types';
import path from 'node:path';
import { nanoid } from 'nanoid';
import { createWorker, PSM } from 'tesseract.js';

const tesseractWorkerPath = path.join(
  process.cwd(),
  'node_modules/tesseract.js/src/worker-script/node/index.js'
);
const englishDataPath = path.join(
  process.cwd(),
  'node_modules/@tesseract.js-data/eng/4.0.0'
);

let localOcrWorkerPromise: ReturnType<typeof createWorker> | null = null;
let localOcrQueue: Promise<unknown> = Promise.resolve();

interface GeminiReceiptItem {
  name: string;
  quantity: number;
  price: number;
  isShared?: boolean;
  confidence?: number;
}

interface GeminiReceipt {
  restaurant: string;
  items: GeminiReceiptItem[];
  subtotal: number;
  tax: number;
  tip: number;
  serviceFee: number;
  total: number;
}

const receiptJsonSchema = {
  type: 'object',
  properties: {
    restaurant: {
      type: 'string',
      description: 'Restaurant or merchant name. Use Unknown Restaurant if not visible.',
    },
    items: {
      type: 'array',
      description: 'Receipt line items only. Do not include subtotal, tax, tip, service fee, discounts, or total as items.',
      items: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Clean item name from the receipt.',
          },
          quantity: {
            type: 'integer',
            description: 'Quantity purchased. Use 1 if quantity is not shown.',
          },
          price: {
            type: 'number',
            description: 'Unit price for one item. If only a line total is shown, divide by quantity.',
          },
          isShared: {
            type: 'boolean',
            description: 'True only for items that are clearly meant to be shared, such as bottle, platter, nachos, bread basket.',
          },
          confidence: {
            type: 'number',
            description: 'Confidence from 0.1 to 1.0 for this extracted item.',
          },
        },
        required: ['name', 'quantity', 'price', 'isShared', 'confidence'],
      },
    },
    subtotal: {
      type: 'number',
      description: 'Subtotal before tax, tip, and service fee. If absent, sum item unit prices times quantities.',
    },
    tax: {
      type: 'number',
      description: 'Tax or VAT/MwSt amount, 0 if not shown as an added line.',
    },
    tip: {
      type: 'number',
      description: 'Tip or gratuity amount, 0 if not shown.',
    },
    serviceFee: {
      type: 'number',
      description: 'Service fee or service charge amount, 0 if not shown.',
    },
    total: {
      type: 'number',
      description: 'Final total amount due or paid.',
    },
  },
  required: ['restaurant', 'items', 'subtotal', 'tax', 'tip', 'serviceFee', 'total'],
};

const geminiReceiptPrompt = `Extract this restaurant receipt into structured JSON.

Rules:
- Return only the schema fields.
- Extract real purchased line items only.
- Do not add subtotal, total, tax, VAT/MwSt, service charge, tip, change, card payments, discounts, or receipt metadata as items.
- If the receipt has repeated identical items, combine them by increasing quantity.
- Use price as the unit price. Example: two Cokes for 10.00 total should be quantity 2 and price 5.00.
- Use CHF-style decimal numbers, but do not include currency symbols.
- If tax is included in the item prices and no separate tax amount is charged, set tax to 0.
- If unsure about an item, keep it but lower confidence.
- If the total does not exactly match, prefer the printed total and let the user edit later.`;

/**
 * Process receipt image with Gemini Vision and return structured receipt JSON.
 */
export async function extractReceiptWithGemini(
  imageBuffer: Buffer,
  mimeType: string
): Promise<Receipt> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;

  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }

  const safeMimeType = isSupportedGeminiImageMimeType(mimeType) ? mimeType : 'image/jpeg';
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: safeMimeType,
                  data: imageBuffer.toString('base64'),
                },
              },
              { text: geminiReceiptPrompt },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
          responseJsonSchema: receiptJsonSchema,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini receipt scan failed: ${errorText}`);
  }

  const data = await response.json();
  const responseText = data.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text || '')
    .join('')
    .trim();

  if (!responseText) {
    throw new Error('Gemini returned no receipt data');
  }

  const parsed = parseJsonObject<GeminiReceipt>(responseText);
  return normalizeGeminiReceipt(parsed);
}

/**
 * Process receipt image using Google Cloud Vision API
 */
export async function extractTextFromImage(imageBase64: string): Promise<string> {
  const apiKey = process.env.GOOGLE_CLOUD_API_KEY;

  if (!apiKey) {
    throw new Error('Google Cloud API key not configured');
  }

  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            image: {
              content: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
            },
            features: [
              {
                type: 'TEXT_DETECTION',
              },
            ],
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google Vision API error: ${error}`);
  }

  const data = await response.json();
  const textAnnotations = data.responses?.[0]?.textAnnotations;

  if (!textAnnotations || textAnnotations.length === 0) {
    throw new Error('No text detected in image');
  }

  // First annotation contains the full text
  return textAnnotations[0].description || '';
}

/**
 * Process receipt image locally with Tesseract.js.
 * This avoids paid OCR APIs and works without Google Cloud billing.
 */
export async function extractTextFromImageLocal(imageBuffer: Buffer): Promise<string> {
  const runRecognition = async () => {
    const worker = await getLocalOcrWorker();
    const result = await worker.recognize(imageBuffer);
    const text = result.data.text.trim();

    if (!text) {
      throw new Error('No text detected in image');
    }

    return text;
  };

  const queuedRecognition = localOcrQueue.then(runRecognition, runRecognition);
  localOcrQueue = queuedRecognition.catch(() => undefined);
  return queuedRecognition;
}

function getLocalOcrWorker() {
  if (!localOcrWorkerPromise) {
    localOcrWorkerPromise = createWorker('eng', 1, {
      cachePath: '/tmp/tesseract-cache',
      langPath: englishDataPath,
      workerPath: tesseractWorkerPath,
      logger: (message) => {
        if (message.status === 'recognizing text') {
          console.log(`OCR progress: ${Math.round(message.progress * 100)}%`);
        }
      },
    }).then(async (worker) => {
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SPARSE_TEXT,
        preserve_interword_spaces: '1',
      });
      return worker;
    });
  }

  return localOcrWorkerPromise;
}

export function resetLocalOcrWorker() {
  const workerPromise = localOcrWorkerPromise;
  localOcrWorkerPromise = null;

  if (workerPromise) {
    workerPromise.then((worker) => worker.terminate()).catch(() => {
      // Ignore shutdown errors; the next scan will create a fresh worker.
    });
  }
}

export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

function normalizeGeminiReceipt(receipt: GeminiReceipt): Receipt {
  const items = Array.isArray(receipt.items)
    ? receipt.items
        .filter((item) => item.name && Number.isFinite(item.price))
        .map((item) => ({
          id: nanoid(8),
          name: cleanItemName(item.name) || 'Unknown Item',
          quantity: clampInteger(item.quantity, 1, 99),
          price: roundCurrency(Math.max(0, Number(item.price) || 0)),
          isShared: Boolean(item.isShared),
          confidence: clampNumber(Number(item.confidence) || 0.8, 0.1, 1),
        }))
    : [];

  const calculatedSubtotal = roundCurrency(
    items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  );
  const subtotal = roundCurrency(Number(receipt.subtotal) || calculatedSubtotal);
  const tax = roundCurrency(Math.max(0, Number(receipt.tax) || 0));
  const tip = roundCurrency(Math.max(0, Number(receipt.tip) || 0));
  const serviceFee = roundCurrency(Math.max(0, Number(receipt.serviceFee) || 0));
  const calculatedTotal = roundCurrency(subtotal + tax + tip + serviceFee);
  const total = roundCurrency(Number(receipt.total) || calculatedTotal);

  return {
    restaurant: receipt.restaurant?.trim() || 'Unknown Restaurant',
    items,
    subtotal,
    tax,
    tip,
    serviceFee,
    total,
  };
}

function parseJsonObject<T>(text: string): T {
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  return JSON.parse(cleaned) as T;
}

function isSupportedGeminiImageMimeType(mimeType: string): boolean {
  return ['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif'].includes(mimeType);
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Parse extracted OCR text into structured receipt data
 * Uses pattern matching and heuristics
 */
export function parseReceiptText(ocrText: string): Receipt {
  const lines = ocrText.split('\n').map(l => l.trim()).filter(l => l);

  const items: ReceiptItem[] = [];
  let subtotal = 0;
  let tax = 0;
  let tip = 0;
  let serviceFee = 0;
  let total = 0;
  let restaurant = '';

  // Try to detect restaurant name (usually first line or two)
  if (lines.length > 0) {
    restaurant = lines[0];
    // If second line doesn't look like a price line, it might be part of name
    if (lines.length > 1 && !containsPrice(lines[1])) {
      restaurant = `${lines[0]} ${lines[1]}`;
    }
  }

  // Common patterns for receipt parsing
  const pricePattern = /(\d+[.,]\d{2})/g;
  const quantityPattern = /^(\d+)\s*[xX×]\s*/;
  const totalKeywords = ['total', 'summe', 'gesamt', 'amount', 'zu zahlen', 'grand total'];
  const subtotalKeywords = ['subtotal', 'zwischensumme', 'net', 'netto'];
  const taxKeywords = ['tax', 'mwst', 'vat', 'steuer', 'tva'];
  const tipKeywords = ['tip', 'trinkgeld', 'gratuity', 'pourboire'];
  const serviceKeywords = ['service', 'bedienung', 'service charge'];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineLower = line.toLowerCase();
    const prices = line.match(pricePattern);

    if (!prices || prices.length === 0) continue;

    // Parse the price (last number on line is usually the price)
    const priceStr = prices[prices.length - 1].replace(',', '.');
    const price = parseFloat(priceStr);

    if (isNaN(price)) continue;

    // Check for special lines
    if (totalKeywords.some(k => lineLower.includes(k))) {
      total = price;
      continue;
    }

    if (subtotalKeywords.some(k => lineLower.includes(k))) {
      subtotal = price;
      continue;
    }

    if (taxKeywords.some(k => lineLower.includes(k))) {
      tax = price;
      continue;
    }

    if (tipKeywords.some(k => lineLower.includes(k))) {
      tip = price;
      continue;
    }

    if (serviceKeywords.some(k => lineLower.includes(k))) {
      serviceFee = price;
      continue;
    }

    // This is likely an item line
    // Extract item name (everything before the price)
    let itemName = line.replace(pricePattern, '').trim();

    // Check for quantity prefix
    let quantity = 1;
    const qtyMatch = itemName.match(quantityPattern);
    if (qtyMatch) {
      quantity = parseInt(qtyMatch[1], 10);
      itemName = itemName.replace(quantityPattern, '').trim();
    }

    // Check for quantity at end (e.g., "Pizza x2")
    const qtyEndMatch = itemName.match(/\s*[xX×]\s*(\d+)\s*$/);
    if (qtyEndMatch) {
      quantity = parseInt(qtyEndMatch[1], 10);
      itemName = itemName.replace(/\s*[xX×]\s*\d+\s*$/, '').trim();
    }

    // Clean up item name
    itemName = cleanItemName(itemName);

    if (itemName.length > 0 && price > 0) {
      // Calculate confidence based on various factors
      const confidence = calculateItemConfidence(itemName, price, line);

      items.push({
        id: nanoid(8),
        name: itemName,
        quantity,
        price,
        isShared: false,
        confidence,
      });
    }
  }

  // If subtotal not found, calculate from items
  if (subtotal === 0 && items.length > 0) {
    subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  // If total not found, calculate it
  if (total === 0) {
    total = subtotal + tax + tip + serviceFee;
  }

  return {
    restaurant: restaurant || 'Unknown Restaurant',
    items,
    subtotal: Math.round(subtotal * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    tip: Math.round(tip * 100) / 100,
    serviceFee: Math.round(serviceFee * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

function containsPrice(line: string): boolean {
  return /\d+[.,]\d{2}/.test(line);
}

function cleanItemName(name: string): string {
  // Remove common noise characters
  return name
    .replace(/[*#@$%^&(){}[\]|\\/<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function calculateItemConfidence(name: string, price: number, originalLine: string): number {
  let confidence = 0.8; // Base confidence

  // Reduce confidence for very short names
  if (name.length < 3) confidence -= 0.2;

  // Reduce confidence for names with unusual characters
  if (/[0-9]{3,}/.test(name)) confidence -= 0.15;

  // Reduce confidence for very high or low prices
  if (price < 0.50 || price > 500) confidence -= 0.1;

  // Increase confidence for common food words
  const foodWords = ['pizza', 'burger', 'salad', 'soup', 'pasta', 'coffee', 'tea', 'beer', 'wine', 'water', 'cola', 'juice'];
  if (foodWords.some(w => name.toLowerCase().includes(w))) confidence += 0.1;

  // Reduce confidence if original line had OCR artifacts
  if (/[|1l]{2,}|[0O]{2,}/.test(originalLine)) confidence -= 0.15;

  return Math.max(0.1, Math.min(1.0, confidence));
}

/**
 * Use AI to parse receipt text into structured data (fallback/enhancement)
 * This can be used with OpenAI or other LLM APIs for better parsing
 */
export async function parseReceiptWithAI(ocrText: string): Promise<Receipt> {
  // For hackathon MVP, we'll use the rule-based parser
  // This function can be enhanced to use GPT or Claude for better parsing
  return parseReceiptText(ocrText);
}
