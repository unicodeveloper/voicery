import { NextRequest, NextResponse } from 'next/server';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY,
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const language = searchParams.get('language');
    const gender = searchParams.get('gender');
    const age = searchParams.get('age');
    const accent = searchParams.get('accent');
    
    let voices;
    
    if (category || language || gender || age || accent) {
      // Use search method with filters
      voices = await elevenlabs.voices.search({
        category: category || undefined,
        language: language || undefined,
        gender: gender || undefined,
        age: age || undefined,
        accent: accent || undefined,
      });
    } else {
      // Get all voices
      voices = await elevenlabs.voices.getAll();
    }
    
    return NextResponse.json({
      voices: voices.voices || [],
    });
  } catch (error) {
    console.error('Error fetching voices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch voices' },
      { status: 500 }
    );
  }
}