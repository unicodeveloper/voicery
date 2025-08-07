import { NextRequest, NextResponse } from 'next/server';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { voice_description, text } = await request.json();

    if (!voice_description) {
      return NextResponse.json(
        { error: 'Voice description is required' },
        { status: 400 }
      );
    }

    // Generate voice previews from description
    const voicePreviews = await elevenlabs.textToVoice.design({
      voiceDescription: voice_description,
      text: text || "Hello, this is a preview of the generated voice.",
    });

    // Return preview data and generated voices
    return NextResponse.json({
      previews: voicePreviews.previews || []
    });

  } catch (error) {
    console.error('Error generating voice:', error);
    return NextResponse.json(
      { error: 'Failed to generate voice' },
      { status: 500 }
    );
  }
}

// Create a finalized voice from previews
export async function PUT(request: NextRequest) {
  try {
    const { voiceName, voiceDescription, generatedVoiceId } = await request.json();

    if (!voiceName || !generatedVoiceId) {
      return NextResponse.json(
        { error: 'Voice name and generated_voice_id are required' },
        { status: 400 }
      );
    }

    const createdVoice = await elevenlabs.textToVoice.create({
      voiceName,
      voiceDescription,
      generatedVoiceId
    });

    return NextResponse.json({
      voice: createdVoice,
    });

  } catch (error) {
    console.error('Error creating voice:', error);
    return NextResponse.json(
      { error: 'Failed to create voice' },
      { status: 500 }
    );
  }
}