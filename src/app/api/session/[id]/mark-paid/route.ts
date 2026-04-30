import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { demoStorage } from '@/lib/storage';

interface MarkPaidBody {
  participantId: string;
  status: 'unpaid' | 'pending' | 'paid' | 'confirmed';
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const body: MarkPaidBody = await request.json();

    // Use demo storage if Supabase is not configured
    if (!isSupabaseConfigured()) {
      const success = demoStorage.updatePaymentStatus(
        sessionId,
        body.participantId,
        body.status
      );

      if (!success) {
        return NextResponse.json(
          { error: 'Participant not found in this session' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        participantId: body.participantId,
        status: body.status,
      });
    }

    // Verify participant belongs to this session
    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .select('*')
      .eq('id', body.participantId)
      .eq('session_id', sessionId)
      .single();

    if (participantError || !participant) {
      return NextResponse.json(
        { error: 'Participant not found in this session' },
        { status: 404 }
      );
    }

    // Update payment status
    const { error: updateError } = await supabase
      .from('participants')
      .update({ payment_status: body.status })
      .eq('id', body.participantId);

    if (updateError) {
      console.error('Update payment status error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update payment status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      participantId: body.participantId,
      status: body.status,
    });
  } catch (error) {
    console.error('Mark paid error:', error);
    return NextResponse.json(
      { error: 'Failed to update payment status' },
      { status: 500 }
    );
  }
}
