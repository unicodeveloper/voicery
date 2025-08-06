import { NextRequest, NextResponse } from 'next/server';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const targetVoiceId = formData.get('target_voice_id') as string;

    if (!audioFile || !targetVoiceId) {
      return NextResponse.json(
        { error: 'Audio file and target voice ID are required' },
        { status: 400 }
      );
    }

    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());

    console.log("Target voice ", targetVoiceId);
    
    const audioStream = await elevenlabs.speechToSpeech.convert(targetVoiceId, {
      audio: audioBuffer,
      modelId: "eleven_english_sts_v2",
      voiceSettings: JSON.stringify({
        stability: 0.5,
        similarityBoost: 0.8,
        style: 0.2,
        useSpeakerBoost: true
      }),
      removeBackgroundNoise: true
    });

    const chunks = [];
    for await (const chunk of audioStream) {
      chunks.push(chunk);
    }

    const resultBuffer = Buffer.concat(chunks);

    return new NextResponse(resultBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': resultBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error processing voice clone:', error);
    return NextResponse.json(
      { error: 'Failed to process voice clone' },
      { status: 500 }
    );
  }
}