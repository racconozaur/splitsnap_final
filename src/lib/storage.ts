
import { Session, Participant, ReceiptItem, PaymentInfo, ItemSelection } from '@/types';

interface StoredSession {
  session: Session;
  participants: Participant[];
}

const sessions = new Map<string, StoredSession>();

export const demoStorage = {
  createSession: (
    id: string,
    data: {
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
    }
  ): Session => {
    const session: Session = {
      id,
      restaurantName: data.restaurantName,
      payerName: data.payerName,
      payerPaymentInfo: data.payerPaymentInfo,
      items: data.items,
      subtotal: data.subtotal,
      tax: data.tax,
      tip: data.tip,
      serviceFee: data.serviceFee,
      total: data.total,
      numberOfPeople: data.numberOfPeople,
      isLocked: false,
      createdAt: new Date().toISOString(),
    };

    sessions.set(id, { session, participants: [] });
    return session;
  },

  getSession: (id: string): (Session & { participants: Participant[] }) | null => {
    const stored = sessions.get(id);
    if (!stored) return null;
    return {
      ...stored.session,
      participants: stored.participants,
    };
  },

  updateSession: (id: string, updates: Partial<Session>): boolean => {
    const stored = sessions.get(id);
    if (!stored) return false;
    stored.session = { ...stored.session, ...updates };
    return true;
  },

  addParticipant: (sessionId: string, participantId: string, name: string): Participant | null => {
    const stored = sessions.get(sessionId);
    if (!stored) return null;

    const existing = stored.participants.find(
      p => p.name.toLowerCase() === name.toLowerCase()
    );
    if (existing) return existing;

    const participant: Participant = {
      id: participantId,
      sessionId,
      name,
      selections: [],
      amountOwed: 0,
      paymentStatus: 'unpaid',
      createdAt: new Date().toISOString(),
    };

    stored.participants.push(participant);
    return participant;
  },

  getParticipant: (sessionId: string, participantId: string): Participant | null => {
    const stored = sessions.get(sessionId);
    if (!stored) return null;
    return stored.participants.find(p => p.id === participantId) || null;
  },

  updateParticipantSelections: (
    sessionId: string,
    participantId: string,
    selections: ItemSelection[],
    amountOwed: number
  ): boolean => {
    const stored = sessions.get(sessionId);
    if (!stored) return false;

    const participant = stored.participants.find(p => p.id === participantId);
    if (!participant) return false;

    participant.selections = selections;
    participant.amountOwed = amountOwed;
    return true;
  },

  updatePaymentStatus: (
    sessionId: string,
    participantId: string,
    status: 'unpaid' | 'pending' | 'paid' | 'confirmed'
  ): boolean => {
    const stored = sessions.get(sessionId);
    if (!stored) return false;

    const participant = stored.participants.find(p => p.id === participantId);
    if (!participant) return false;

    participant.paymentStatus = status;
    return true;
  },
};
//made with Bob
