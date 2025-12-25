<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Go GCSE - English Language Exam Simulator

An AI-powered GCSE English Language mock exam platform. Generate authentic Edexcel-style exams, get AI marking with detailed feedback, and track your progress.

## Features

- 📝 **AI-Generated Exams** - Paper 1 (Fiction) and Paper 2 (Non-fiction) with realistic sources
- ✅ **AI Marking** - Level-based grading with model answers and comparison points
- 📊 **Dashboard** - Track exam history, scores, and study time
- 🎨 **Image Generation** - AI-generated images for creative writing prompts
- 📄 **PDF Reports** - Download detailed exam reports
- 👤 **User Management** - Admin approval system for new users

---

## 🖥️ Local Development

### Prerequisites
- Node.js v18+ (v22 recommended)
- npm

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/sami8051/GoGCSE.git
cd GoGCSE

# 2. Install dependencies
npm install

# 3. Run development server
npm run dev
```

The app will open at `http://localhost:5173`

---

## 🚀 Server Deployment (Production)

### Prerequisites

- **Node.js v22+** on the server
- **Git** for pulling updates
- **Firebase Project** with Firestore database
- **Gemini API Key** from [Google AI Studio](https://aistudio.google.com/)

### Step 1: Clone Repository on Server

```bash
cd ~/public_html  # or your web root
git clone https://github.com/sami8051/GoGCSE.git .
npm install
```

### Step 2: Configure Firebase

The app uses Firebase for:
- **Authentication** (Google Sign-in)
- **Firestore** (user data, exam results, settings)
- **Storage** (PDF reports, profile pictures)

Firebase credentials are in:
- `services/firebase.ts` (frontend)
- `server/index.js` (backend)

### Step 3: Add Gemini API Key to Firestore

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project → Firestore Database
3. Create document: `systemSettings/config`
4. Add field: `geminiApiKey` (string) = your API key

> ⚠️ **Never put API keys in code.** The server fetches from Firestore at startup.

### Step 4: Build Frontend

```bash
npm run build
```

This creates the `dist/` folder with production files.

### Step 5: Start the Server

```bash
# Simple start
node server/index.js

# Background with logs (recommended)
nohup node server/index.js > server.log 2>&1 &

# Check if running
ps aux | grep node
```

The server runs on port **3001** by default.

### Step 6: Configure Reverse Proxy (Optional)

For domain access, configure Nginx/Apache to proxy to port 3001:

**Nginx example:**
```nginx
location / {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
}
```

---

## 🔧 Configuration

### Environment Variables (Optional)

Create `.env` file for local development:

```env
GEMINI_API_KEY=your_api_key_here
PORT=3001
```

> Production uses Firestore for the API key, not environment variables.

### Admin Users

Edit `services/firebase.ts` to add admin emails:

```typescript
export const ADMIN_EMAILS = [
    "admin@example.com",
    "your-email@gmail.com"
];
```

### Customizing AI Prompts

All prompts are in `server/prompts/`:

| File | Purpose |
|------|---------|
| `exam-generation-system.js` | Exam structure instructions |
| `marking-prompt.js` | Grading criteria and format |
| `marking-grids.js` | Edexcel AO1-AO6 level descriptors |
| `model-answers-prompt.js` | Model answer generation |
| `analyze-text-prompt.js` | Language Lab text analysis |
| `evaluate-writing-prompt.js` | Writing feedback |

---

## 📋 Hostinger-Specific Deployment

### Using Hostinger VPS/Cloud

```bash
# SSH into server
ssh user@your-server-ip

# Navigate to web root
cd ~/domains/yourdomain.com/public_html

# Clone and setup
git clone https://github.com/sami8051/GoGCSE.git .
npm install
npm run build

# Start with Node.js 22
nohup /opt/alt/alt-nodejs22/root/usr/bin/node server/index.js > server.log 2>&1 &
```

### Updating the App

```bash
cd ~/domains/yourdomain.com/public_html
git pull
npm install
npm run build
pkill -f node
nohup /opt/alt/alt-nodejs22/root/usr/bin/node server/index.js > server.log 2>&1 &
```

### Checking Logs

```bash
# View recent logs
cat server.log | tail -50

# Watch logs in real-time
tail -f server.log
```

---

## 🔒 Security

### API Key Protection

- **Gemini API Key**: Stored in Firestore, never in code
- **Firebase Keys**: Client-side keys (safe to expose, secured by Firestore rules)

### Restrict Gemini API Key (Recommended)

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Edit your Gemini API key
3. Add IP restriction with your server's IP
4. Check server IP: `curl https://api.ipify.org`

### Files in .gitignore

```
.env
.env.local
test_*.js
*-firebase-adminsdk*.json
serviceAccountKey.json
```

---

## 🛠️ Troubleshooting

### Server won't start

```bash
# Check if port is in use
lsof -i :3001

# Kill existing process
pkill -f node
```

### API key not loading

```bash
# Check debug endpoint
curl https://yourdomain.com/api/debug-config
```

Should return:
```json
{"hasApiKey": true, "apiKeySource": "Firestore", "firebaseInitialized": true}
```

### Exam generation fails

1. Check `server.log` for errors
2. Verify API key is valid in [Google AI Studio](https://aistudio.google.com/)
3. Check Firestore rules allow reading `systemSettings/config`

---

## 📁 Project Structure

```
├── components/          # React components
│   ├── admin/          # Admin panel components
│   ├── Dashboard.tsx   # User dashboard
│   ├── Landing.tsx     # Home page
│   └── ...
├── server/
│   ├── index.js        # Express server & API routes
│   └── prompts/        # AI prompt templates
├── services/
│   ├── firebase.ts     # Firebase configuration
│   └── geminiService.ts # API client
├── dist/               # Production build (generated)
└── package.json
```

---

## 📄 License

MIT License - See [LICENSE](LICENSE) for details.

---

## 🤝 Support

For issues or questions, open a GitHub issue or contact the maintainer.

Use this command to restart:

cd ~/domains/gogcse.com/public_html
git pull
pkill -f node
nohup /opt/alt/alt-nodejs22/root/usr/bin/node server/index.js > server.log 2>&1 &