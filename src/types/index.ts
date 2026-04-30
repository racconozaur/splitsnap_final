export interface ReceiptItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  isShared: boolean;
  confidence?: number;
}

export interface Receipt {
  restaurant: string;
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  tip: number;
  serviceFee: number;
  total: number;
}

export interface Session {
  id: string;
  restaurantName: string;
  payerName: string;
  payerPaymentInfo: PaymentInfo;
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  tip: number;
  serviceFee: number;
  total: number;
  numberOfPeople: number;
  isLocked: boolean;
  createdAt: string;
}

export interface PaymentInfo {
  twintPhone?: string;
  revolutTag?: string;
  iban?: string;
  preferredMethod: 'twint' | 'revolut' | 'iban' | 'cash';
}

export interface Participant {
  id: string;
  sessionId: string;
  name: string;
  selections: ItemSelection[];
  amountOwed: number;
  paymentStatus: 'unpaid' | 'pending' | 'paid' | 'confirmed';
  createdAt: string;
}

export interface ItemSelection {
  itemId: string;
  share: number;
}

export interface CalculatedAmount {
  itemsTotal: number;
  taxShare: number;
  tipShare: number;
  serviceFeeShare: number;
  total: number;
}

export interface SessionSummary {
  totalBill: number;
  totalClaimed: number;
  totalUnclaimed: number;
  participants: ParticipantSummary[];
  taxSplitMethod: 'proportional';
  tipSplitMethod: 'proportional';
}

export interface ParticipantSummary {
  id: string;
  name: string;
  itemsSelected: string[];
  amountOwed: number;
  paymentStatus: 'unpaid' | 'pending' | 'paid' | 'confirmed';
}

export interface OCRResult {
  rawText: string;
  receipt: Receipt;
  confidence: number;
}
//made with Bob
