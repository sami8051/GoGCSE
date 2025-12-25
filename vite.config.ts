// SECURITY: Removed environment variable exposure from frontend bundle
// Frontend now ONLY communicates with backend via authenticated API calls
// Backend handles all secrets and API key management securely
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  define: {
    // Production: Use Firebase Cloud Function URL
    'import.meta.env.VITE_CLOUD_FUNCTION_URL': JSON.stringify('https://us-central1-gcse-a7ffe.cloudfunctions.net/api')
  },
  plugins: [react()],
  // SECURITY FIX: Removed 'define' block that exposed GEMINI_API_KEY to frontend bundle
  // API keys are ONLY available on the backend via environment variables or Secret Manager
  // Frontend communicates with backend Cloud Functions authenticated via ID token
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
});
