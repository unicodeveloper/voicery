import { NextRequest, NextResponse } from 'next/server';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { 
      text, 
      voice_id,
      model_id = "eleven_flash_v2_5", // Use fastest model for streaming
      voice_settings,
      optimize_streaming_latency = 4
    } = await request.json();

    if (!text || !voice_id) {
      return NextResponse.json(
        { error: 'Text and voice_id are required' },
        { status: 400 }
      );
    }

    const requestOptions = {
      text: text,
      modelId: model_id,
      voiceSettings: voice_settings ? {
        stability: voice_settings.stability || 0.5,
        similarityBoost: voice_settings.similarity_boost || 0.5,
        style: voice_settings.style || 0.0,
        useSpeakerBoost: voice_settings.use_speaker_boost || false
      } : undefined,
      optimizeStreamingLatency: optimize_streaming_latency,
      outputFormat: "mp3_22050_32" // Lower quality for faster streaming
    };

    // Create a readable stream for real-time audio
    const readable = new ReadableStream({
      async start(controller) {
        try {
          const audioStream = await elevenlabs.textToSpeech.stream(voice_id, requestOptions);
          const reader = audioStream.getReader();
          
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              controller.enqueue(value);
            }
          } finally {
            reader.releaseLock();
          }
          
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      }
    });

    return new NextResponse(readable, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Transfer-Encoding': 'chunked',
      },
    });

  } catch (error) {
    console.error('Error streaming speech:', error);
    return NextResponse.json(
      { error: 'Failed to stream speech' },
      { status: 500 }
    );
  }
}