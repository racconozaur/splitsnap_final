import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { demoStorage } from '@/lib/storage';
import { nanoid } from 'nanoid';
import { ReceiptItem, PaymentInfo } from '@/types';

interface CreateSessionBody {
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

export async function POST(request: NextRequest) {
  try {
    const body: CreateSessionBody = await request.json();
    const sessionId = nanoid(10);
    const shareUrl = `${getPublicOrigin(request)}/split/${sessionId}`;

    if (!isSupabaseConfigured()) {
      demoStorage.createSession(sessionId, body);
      return NextResponse.json({ success: true, sessionId, shareUrl });
    }

    const { error: sessionError } = await supabase
      .from('sessions')
      .insert({
        id: sessionId,
        restaurant_name: body.restaurantName,
        payer_name: body.payerName,
        payer_payment_info: body.payerPaymentInfo,
        subtotal: body.subtotal,
        tax: body.tax,
        tip: body.tip,
        service_fee: body.serviceFee,
        total: body.total,
        number_of_people: body.numberOfPeople,
        is_locked: false,
      });

    if (sessionError) {
      console.error('Session creation error:', sessionError);
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }

    const itemsToInsert = body.items.map(item => ({
      id: item.id,
      session_id: sessionId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      is_shared: item.isShared,
      confidence: item.confidence || null,
    }));

    const { error: itemsError } = await supabase
      .from('items')
      .insert(itemsToInsert);

    if (itemsError) {
      console.error('Items creation error:', itemsError);
      await supabase.from('sessions').delete().eq('id', sessionId);
      return NextResponse.json(
        { error: 'Failed to create items' },
        { status: 500 }
      );
    }
    return NextResponse.json({
      success: true,
      sessionId,
      shareUrl,
    });
  } catch (error) {
    console.error('Create session error:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}

function getPublicOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  const host = forwardedHost || request.headers.get('host');

  if (host) {
    return `${forwardedProto}://${host}`;
  }

  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}
//made with Bob
