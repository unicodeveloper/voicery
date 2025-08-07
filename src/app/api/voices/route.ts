import { NextRequest, NextResponse } from 'next/server';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const language = searchParams.get('language');
    const age = searchParams.get('age');
    const accent = searchParams.get('accent');
    
    // Get all voices excluding 2 voices
    const excludedVoiceIds = [process.env.VOICE_ID_ONE, process.env.VOICE_ID_TWO];
    let result;
    
    if (category || language || age || accent) {
      // Use search method with filters
      result = await elevenlabs.voices.search({
        category: category || undefined,
        language: language || undefined,
        age: age || undefined,
        accent: accent || undefined,
      });

      result = result.voices.filter(v => !excludedVoiceIds.includes(v.voiceId));

    } else {
      
      let allVoices = await elevenlabs.voices.getAll();
      result = allVoices.voices.filter(v => !excludedVoiceIds.includes(v.voiceId));
    }
    
    return NextResponse.json({
      voices: result || [],
    });
  } catch (error) {
    console.error('Error fetching voices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch voices' },
      { status: 500 }
    );
  }
}