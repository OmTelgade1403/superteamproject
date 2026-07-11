import { NextRequest } from 'next/server';
import { generateEvent } from '@/lib/matchEngine';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const playersParam = searchParams.get('players') || '';
  const draftedPlayerIds = playersParam ? playersParam.split(',') : [];

  const encoder = new TextEncoder();
  let intervalId: NodeJS.Timeout;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connect signal
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'CONNECTED', description: '🔗 Connected to TxLINE Real-time Data Stream.' })}\n\n`));

      // Stream a new sports match event every 2.5 seconds
      intervalId = setInterval(() => {
        try {
          const event = generateEvent(draftedPlayerIds);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch (e) {
          console.error('Error generating streaming event', e);
        }
      }, 2500);
    },
    cancel() {
      if (intervalId) {
        clearInterval(intervalId);
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
