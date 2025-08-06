import { NextRequest, NextResponse } from 'next/server';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const targetLanguage = formData.get('target_language') as string;

    if (!audioFile || !targetLanguage) {
      return NextResponse.json(
        { error: 'Audio file and target language are required' },
        { status: 400 }
      );
    }

    console.log("Target Language", targetLanguage);
    console.log("Audio file type:", audioFile.type);
    console.log("Audio file name:", audioFile.name);

    // Create a proper file object with correct content type
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    const audioBlob = new Blob([audioBuffer], { 
      type: audioFile.type || 'audio/wav' 
    });
    
    // Create a File object with proper metadata
    const audioFileForAPI = new File([audioBlob], audioFile.name || 'audio.wav', {
      type: audioFile.type || 'audio/wav'
    });

    const audioStream = await elevenlabs.dubbing.create({
      name: `Translation_${Date.now()}`,
      file: audioFileForAPI,
      targetLang: targetLanguage,
      mode: "automatic",
      numSpeakers: 0
    });

    let dubbedFile;
    let attempts = 0;
    const maxAttempts = 24; // 2 minutes max (24 * 5 seconds)
    
    while (attempts < maxAttempts) {
      const { status } = await elevenlabs.dubbing.get(
        audioStream.dubbingId
      );

      if (status === "dubbed") {
        dubbedFile = await elevenlabs.dubbing.audio.get(
          audioStream.dubbingId,
          targetLanguage
        );
        console.log("Audio dubbing completed successfully");
        break;
      } else if (status === "failed") {
        throw new Error("Dubbing process failed");
      } else {
        console.log(`Audio is still being dubbed... (attempt ${attempts + 1}/${maxAttempts})`);
      }

      attempts++;
      
      // Wait 5 seconds between checks
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    if (!dubbedFile) {
      throw new Error("Dubbing process timed out");
    }

    console.log("Dubbed File ", dubbedFile);

    // Process the dubbed audio stream
    const chunks = [];
    for await (const chunk of dubbedFile) {
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
    console.error('Error translating audio:', error);
    return NextResponse.json(
      { error: 'Failed to translate audio' },
      { status: 500 }
    );
  }
}