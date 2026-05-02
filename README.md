# 🎤 OmniShadow AI - Multi-Language Voice Shadowing Studio

**Global TPRS + Voice Shadowing Studio** powered by ElevenLabs AI for premium language learning experiences.

## ✨ Features

- **Multi-Language Support**: 15+ languages with intelligent voice matching (English, Spanish, French, German, Japanese, Korean, Chinese, Vietnamese, Arabic, Portuguese, Italian, Dutch, Turkish, and more)
- **Dual-Speaker Dialogue Mode**: Seamless A/B speaker dialogue generation and playback
- **Advanced Audio Player**: Professional shadowing player with A/B looping, playback control, and waveform visualization
- **TPRS Tools**: Quick-insert formatting for pauses and emphasis
- **Voice Tuning**: Fine-tune stability, clarity, and style for each generation
- **Direct ElevenLabs Integration**: Real-time voice fetching and audio generation
- **Export & Download**: Download generated audio as MP3 files
- **Beautiful UI**: Modern dark theme with gradient effects and smooth animations

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ and npm/pnpm
- ElevenLabs API Key ([Get one here](https://elevenlabs.io/app/api-keys))

### Installation

1. **Navigate to the project directory**
```bash
cd "C1 Vietnamese/Continuing Vietnamese/New folder"
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
Create a `.env.local` file and add your API key:
```env
VITE_ELEVENLABS_API_KEY=your_api_key_here
```

Or paste your API key directly into the app UI (it's stored locally in your browser).

### Development Server

Start the dev server (automatically opens in browser):
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## 📚 How to Use

### 1. **Add Your API Key**
Paste your ElevenLabs API key in the top section. The key is stored locally in your browser.

### 2. **Select Language & Voices**
- Choose your target language from the dropdown
- Voices automatically rank based on language matching
- Use "Auto-pick voices" for quick selection
- Voice A = Tutor/Narrator, Voice B = Student/Character

### 3. **Write Your Script**
Format your lesson using A/B dialogue format:
```
A: Welcome to OmniShadow AI. Let's practice today.

B: I'm ready to learn!

A: Great! Repeat after me slowly.
```

Or use single speaker mode by toggling "Dialogue Off".

### 4. **Customize Voice Settings** (Optional)
- **Stability**: 0-100 (Higher = more steady delivery)
- **Clarity/Similarity Boost**: 0-100 (Higher = clearer articulation)
- **Style Exaggeration**: 0-100 (Higher = more emotion)

### 5. **Generate & Play**
Click "Generate and Play Lesson" to create audio and start playback.

### 6. **Use Playback Controls**
- **Play/Pause**: Control playback
- **Set A/B Loop Points**: Set loop boundaries during playback
- **Jump to Point**: Skip between loop points
- **Download MP3**: Export the generated audio file

## 🛠️ Build for Production

```bash
npm run build
```

Output will be in the `dist/` folder. Deploy to Vercel, Netlify, GitHub Pages, or any static host.

## 📁 Project Structure

```
.
├── index.html              # HTML entry point
├── src/
│   ├── main.jsx           # React entry point
│   ├── App.jsx            # Main application component
│   └── index.css          # Global styles (Tailwind CSS)
├── package.json           # Dependencies
├── vite.config.js         # Vite configuration
├── tailwind.config.js     # Tailwind CSS configuration
├── postcss.config.js      # PostCSS configuration
└── .env.example           # Environment variables template
```

## 🔧 Technology Stack

- **React 18**: UI framework
- **Vite 4**: Build tool & dev server
- **TailwindCSS 3**: Styling
- **lucide-react**: Modern icons
- **ElevenLabs API**: AI voice generation & retrieval

## 📝 API Integration

The app integrates with:

1. **ElevenLabs Voice Fetch** (`GET /v1/voices`)
   - Retrieves available voices based on your API key

2. **ElevenLabs Text-to-Speech** (`POST /v1/text-to-speech/{voice_id}`)
   - Generates MP3 audio from text with advanced voice settings

3. **Optional Backend Merge** (`POST /api/merge-audio`)
   - If you have a backend, implement this endpoint for true MP3 stitching of dialogue segments

## 🎯 Use Cases

- **Language Teachers**: Create interactive TPRS lessons with authentic dialogues
- **EdTech Platforms**: Premium voice shadowing practice tool
- **Content Creators**: Generate multilingual educational content
- **Language Learners**: Practice shadowing with professional voices

## 📄 Environment Variables

Create a `.env.local` file:

```env
# Your ElevenLabs API key from https://elevenlabs.io/app/api-keys
VITE_ELEVENLABS_API_KEY=xi-xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## 🎨 Customization

- **Colors**: Edit `tailwind.config.js` to modify the theme
- **Voices**: Language matching logic is in `scoreVoiceForLanguage()`
- **Supported Languages**: Add more to `LANGUAGE_OPTIONS` constant
- **UI Layout**: Modify components in `src/App.jsx`

## ⚠️ Notes

- API key is never sent to any server except ElevenLabs
- Audio files are generated on-demand (not cached on a server)
- Loop points and playback state are stored in browser memory only
- For production use, consider implementing backend audio stitching for dialogue exports

## 📞 Support

For ElevenLabs API help: https://elevenlabs.io/docs
For Vite documentation: https://vitejs.dev
For React documentation: https://react.dev

## 📜 License

This project is provided as-is for educational and commercial use.

---

**Made with ❤️ for language learners and educators worldwide.**
