import { NextResponse } from 'next/server';
import { medicalTriageChat } from '@/backend/ai/flows/medical-triage-chat';
import { isAIReady } from '@/backend/ai/genkit';

export async function POST(request) {
  try {
    if (!isAIReady()) {
      return NextResponse.json(
        { ok: false, error: 'Gemini is not configured' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    const history = Array.isArray(body?.history) ? body.history : [];

    if (!message) {
      return NextResponse.json(
        { ok: false, error: 'Message is required' },
        { status: 400 }
      );
    }

    const cleanedHistory = history
      .filter((item) => item && (item.sender === 'user' || item.sender === 'bot') && typeof item.text === 'string')
      .slice(-12)
      .map((item) => ({
        sender: item.sender,
        text: item.text.slice(0, 3000),
      }));

    const result = await medicalTriageChat({
      message: message.slice(0, 2000),
      history: cleanedHistory,
    });

    return NextResponse.json({ ok: true, reply: result.reply });
  } catch (error) {
    console.error('Gemini medical triage error:', error);
    const message = String(error?.message || '');
    const isQuotaError =
      error?.status === 429 ||
      message.includes('429') ||
      message.toLowerCase().includes('quota') ||
      message.includes('Too Many Requests');

    return NextResponse.json(
      {
        ok: false,
        error: isQuotaError
          ? 'Gemini quota exceeded. Local fallback should be used.'
          : 'Gemini medical triage failed',
      },
      { status: isQuotaError ? 503 : 500 }
    );
  }
}
