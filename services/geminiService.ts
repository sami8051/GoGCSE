import { PaperType, ExamPaper, StudentAnswer, ExamResult, MarkResult, ImageSize } from '../types';

export class GeminiService {

  constructor() {
    console.log("GeminiService initialized (Backend Mode)");
  }

  // Helper to handle API requests
  private async post(endpoint: string, body: any) {
    try {
      // Fetch current auth token
      const { auth } = await import('./firebase');
      const user = auth.currentUser;

      let headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (user) {
        const token = await user.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        console.warn(`Attempting to call ${endpoint} without a user. This may fail if the endpoint is protected.`);
      }

      // In development: Vite proxies /api to localhost:3001
      // In production: Use Firebase Cloud Function URL from env
      // FORCE LOCAL API IF ON LOCALHOST (Fixes 500 error when running locally but build mode thinks it's prod)
      // FORCE LOCAL API IF ON LOCALHOST (Fixes 500 error when running locally but build mode thinks it's prod)
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      console.log(`[GeminiService Mode Check] Hostname: ${window.location.hostname}, isLocalhost: ${isLocalhost}, ImportMetaProd: ${import.meta.env.PROD}`);

      const isProduction = import.meta.env.PROD && !isLocalhost;

      const apiBaseUrl = isProduction
        ? (import.meta.env.VITE_CLOUD_FUNCTION_URL || 'https://us-central1-gcse-a7ffe.cloudfunctions.net/api')
        : '/api';

      const url = `${apiBaseUrl}/${endpoint}`;
      console.log(`[GeminiService] Calling ${isProduction ? 'PRODUCTION' : 'DEV'} API: ${url}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body),
      });

      if (response.status === 401 || response.status === 403) {
        throw new Error(`Authentication Error: ${response.statusText}. Please log in.`);
      }

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Failed to call ${endpoint}:`, error);
      throw error;
    }
  }

  async generateExam(type: PaperType, imageSize: ImageSize = '1K'): Promise<ExamPaper> {
    return this.post('generate-exam', { type, imageSize });
  }

  async markExam(paper: ExamPaper, answers: Record<string, StudentAnswer>): Promise<ExamResult> {
    return this.post('mark-exam', { paper, answers });
  }

  async generateModelAnswers(paper: ExamPaper): Promise<string> {
    const result = await this.post('model-answers', { paper });
    return result.text;
  }

  async analyzeTextForMethods(text: string): Promise<any> {
    return this.post('analyze-text', { text });
  }

  async evaluateWritingPractice(text: string, targetMethod: string): Promise<any> {
    return this.post('evaluate-writing', { text, targetMethod });
  }

  async generatePracticeSet(topic: string, difficulty: string, numQuestions: number): Promise<any> {
    return this.post('generate-practice-set', { topic, difficulty, numQuestions });
  }

  async markAssignment(assignmentId: string, studentAnswers: string[]): Promise<any> {
    return this.post('mark-assignment', { assignmentId, studentAnswers });
  }
}