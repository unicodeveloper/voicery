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
      model_id = "eleven_multilingual_v2",
      voice_settings,
      output_format = "mp3_44100_128",
      optimize_streaming_latency,
      streaming = false
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
        useSpeakerBoost: voice_settings.use_speaker_boost || false,
        speed: voice_settings.speed || 1.0
      } : undefined,
      outputFormat: output_format,
      optimizeStreamingLatency: optimize_streaming_latency
    };

    let audioStream;
    if (streaming) {
      audioStream = await elevenlabs.textToSpeech.stream(voice_id, requestOptions);
    } else {
      audioStream = await elevenlabs.textToSpeech.convert(voice_id, requestOptions);
    }

    const chunks = [];
    for await (const chunk of audioStream) {
      chunks.push(chunk);
    }

    const audioBuffer = Buffer.concat(chunks);

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error generating speech:', error);
    return NextResponse.json(
      { error: 'Failed to generate speech' },
      { status: 500 }
    );
  }
}