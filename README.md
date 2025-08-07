# 🎤 Voicery

**Say anything. Sound like anyone. Speak any language. Clone your Vibe 🔉**

Voicery is a modern web application that harnesses the power of ElevenLabs AI to provide comprehensive voice synthesis capabilities. Transform text into natural-sounding speech, clone voices, translate audio across 32+ languages, generate custom voices, and create realistic sound effects.


![Voicery](https://pub-1bf330673fe24fad8ce300e6adbe20d7.r2.dev/Screenshot%202025-08-07%20at%2011.04.14.png)

## ✨ Features

- **🗣️ Text-to-Speech**: Convert any text to natural-sounding speech with 100+ premium voices
- **🎭 Voice Cloning**: Record your voice and transform it into any of the listed voices. 
- **🌍 Audio Translation**: Translate recorded audio into 32+ languages while preserving voice characteristics  
- **🎯 Voice Generation**: Create custom voices from detailed text descriptions
- **🎵 Sound Effects**: Generate realistic sound effects from text descriptions

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- ElevenLabs API key ([Get one here](https://elevenlabs.io/))

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd frontendai
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   ELEVENLABS_API_KEY=your_api_key_here
   ```

4. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🛠️ Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build the application for production
- `npm run start` - Start the production server
- `npm run lint` - Run ESLint for code quality

## 🏗️ Tech Stack

- **Framework**: Next.js 15.4.5 with App Router
- **Frontend**: React 19.1.0, TypeScript 5
- **Styling**: Tailwind CSS 4
- **AI Integration**: ElevenLabs API via @elevenlabs/elevenlabs-js
- **Runtime**: Node.js with Turbopack for fast development

## 📱 Usage

### Text-to-Speech
1. Select the **Text-to-Speech** tab
2. Enter your text (minimum 100 characters for voice generation)
3. Choose from 100+ available voices with advanced filtering
4. Adjust voice settings (stability, similarity boost, style, speed)
5. Click **Generate Voice** to create audio

### Voice Cloning
1. Go to **Voice Cloning** tab
2. Record your voice (up to 3 minutes)
3. Select a target ElevenLabs voice
4. Process the cloning to hear your voice transformed

### Audio Translation
1. Navigate to **Audio Translation**
2. Record audio in any language
3. Choose target language from 32+ options
4. Get translated audio maintaining voice characteristics

### Voice Generation
1. Open **Voice Generation** tab
2. Describe the voice you want in detail
3. Provide sample text (100+ characters)
4. Generate custom voice previews

### Sound Effects
1. Select **Sound Effects** tab
2. Describe the sound effect you want
3. Set duration (1-22 seconds)
4. Generate realistic audio effects

## 🔧 API Endpoints

The application includes several API routes:

- `/api/text-to-speech` - Convert text to speech
- `/api/streaming-tts` - Real-time text-to-speech streaming
- `/api/voice-clone` - Voice cloning functionality
- `/api/translate-audio` - Audio translation service
- `/api/voice-generation` - Custom voice generation
- `/api/sound-effects` - Sound effect generation
- `/api/voices` - Fetch available voices with filtering

## 🎨 Features Highlights

- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Real-time Validation**: Input validation with visual feedback
- **Audio Controls**: Built-in audio players with download functionality
- **Advanced Filtering**: Filter voices by category, language, and gender
- **Progress Tracking**: Visual indicators for processing status
- **Modern UI**: Glassmorphism design with smooth animations

## 📄 License

This project is licensed under the MIT License.

## 💡 Credits

Made with ❤️ by [unicodeveloper](https://x.com/unicodeveloper) • Powered by [ElevenLabs](https://elevenlabs.io/)

---

**Ready to transform your voice experience? Get started with Voicery today!** 🚀
