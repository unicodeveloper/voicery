import { NextRequest, NextResponse } from 'next/server';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { 
      text, 
      duration_seconds = 10, 
      prompt_influence = 0.3 
    } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: 'Text description is required' },
        { status: 400 }
      );
    }

    // Generate sound effects from text description
    const audioStream = await elevenlabs.textToSoundEffects.convert({
      text: text,
      durationSeconds: duration_seconds,
      promptInfluence: prompt_influence,
    });

    const chunks = [];
    const reader = audioStream.getReader();
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }

    const audioBuffer = Buffer.concat(chunks);

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Error generating sound effects:', error);
    return NextResponse.json(
      { error: 'Failed to generate sound effects' },
      { status: 500 }
    );
  }
}