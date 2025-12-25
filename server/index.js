
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ------------------------------------------------------------------
// Firebase Web SDK Initialization
// ------------------------------------------------------------------
const firebaseConfig = {
    apiKey: "AIzaSyCEEQBoSXPKiG0mEX_H6bA1aSn072FD_DA",
    authDomain: "gcse-a7ffe.firebaseapp.com",
    projectId: "gcse-a7ffe",
    storageBucket: "gcse-a7ffe.firebasestorage.app",
    messagingSenderId: "266952172762",
    appId: "1:266952172762:web:9ef234cf67a8ab32afb1e3"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
console.log("Firebase Web SDK initialized (Emergency Restore).");

// ------------------------------------------------------------------
// Authentication Middleware (Disabled temporarily to restore service)
// ------------------------------------------------------------------
const authenticateUser = async (req, res, next) => {
    // TEMPORARY: Skipping auth check to restore site access.
    // To enable, we need a valid Firebase Admin Service Account.
    next();
};

// ------------------------------------------------------------------
// Gemini API Key - Fetch from Firestore or fallback to env
// ------------------------------------------------------------------
let geminiApiKey = process.env.GEMINI_API_KEY || '';
let ai = null;

async function initializeGemini() {
    console.log("Attempting to load Gemini API key from Firestore...");
    try {
        const configRef = doc(db, 'systemSettings', 'config');
        console.log("Fetching document: systemSettings/config");
        const configDoc = await getDoc(configRef);
        console.log("Document exists:", configDoc.exists());

        if (configDoc.exists()) {
            const data = configDoc.data();
            console.log("Document fields:", Object.keys(data));
            if (data?.geminiApiKey) {
                geminiApiKey = data.geminiApiKey;
                console.log("✅ Gemini API key loaded from Firestore (length:", geminiApiKey.length, ")");
            } else {
                console.warn("⚠️ Document exists but geminiApiKey field is empty or missing.");
            }
        } else {
            console.warn("⚠️ No document found at systemSettings/config");
        }
    } catch (error) {
        console.error("❌ Failed to fetch API key from Firestore:");
        console.error("   Error name:", error.name);
        console.error("   Error message:", error.message);
        console.error("   Error code:", error.code);
    }

    if (!geminiApiKey) {
        console.warn("⚠️ WARNING: No Gemini API key available. Exam generation will fail.");
    }

    ai = new GoogleGenAI({ apiKey: geminiApiKey });
    console.log("GoogleGenAI initialized. Key available:", !!geminiApiKey);
}

// Initialize Gemini on startup
initializeGemini();

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

const cleanJson = (text) => {
    if (!text) return "{}";
    // Remove markdown code blocks
    let cleaned = text.replace(/```json/g, '').replace(/```/g, '');

    const firstOpen = cleaned.indexOf('{');
    const lastClose = cleaned.lastIndexOf('}');

    if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
        cleaned = cleaned.substring(firstOpen, lastClose + 1);
    }
    return cleaned.trim();
};

const generateImage = async (prompt) => {
    try {
        console.log("Generating image for prompt:", prompt);
        const searchQuery = prompt.replace(/photography style|high quality|realistic/gi, '').trim();
        const encodedQuery = encodeURIComponent(searchQuery);
        const randomSig = Math.floor(Math.random() * 10000);
        return `https://image.pollinations.ai/prompt/${encodedQuery}?width=1024&height=768&nologo=true&seed=${randomSig}`;
    } catch (error) {
        console.error("Image generation failed:", error);
        return null;
    }
};

const EDEXCEL_MARKING_GRIDS = `
NO MARKING SHOULD BE DONE WITHOUT REFERENCE TO THESE GRIDS.

AO1 (Reading) - Retrieval & Interpretation (Levels 1-2 typically for Q1/Q2)
- Mark based on accuracy: 1 mark for each correct point/quote.

AO2 (Reading) - Language & Structure (Level 1-4 for Q3/Q6-P2)
- Level 1 (1-3 marks): Limited comment on language/structure; simple assertion.
- Level 2 (4-6 marks): Some comment on writer's methods; relevant textual reference.
- Level 3 (7-9 marks): Clear/relevant explanation of effects; accurate terminology.
- Level 4 (10-12 marks): Perceptive analysis of language/structure; discerning references.

AO3 (Reading) - Comparison (Level 1-4 for Q7a/Q7b-P2)
- Level 1: Description of ideas; no true comparison.
- Level 2: Obvious links/similarities/differences.
- Level 3: Clear comparison of ideas and perspectives.
- Level 4: Perceptive, detailed comparison of writers' ideas and perspectives.

AO4 (Reading) - Evaluation (Level 1-4 for Q4/Q6-P2)
- Level 1 (1-3 marks): Description of content; uncritical; limited support.
- Level 2 (4-7 marks): Comment on the statement; some visual/textual support.
- Level 3 (8-11 marks): Clear evaluation; convincing response; focused references.
- Level 4 (12-15 marks): Perceptive/critical evaluation; detailed/discriminating support.

AO5 (Writing) - Content & Organization (Level 1-5)
- Level 1 (1-4 marks): Basic expression; repetitive; little awareness of audience.
- Level 2 (5-8 marks): Clear expression; acceptable structure; some control.
- Level 3 (9-12 marks): Effective tone; clear organization; cohesive.
- Level 4 (13-16 marks): Compelling, manipulating audience; sophisticated structure.
- Level 5 (17-24 marks): Subtle/sophisticated; fully realised; effortless cohesion.

AO6 (Writing) - Technical Accuracy (Level 1-5)
- Level 1 (1-3 marks): Frequent errors; hinders meaning.
- Level 2 (4-6 marks): Some accurate punctuation/spelling; meaning clear.
- Level 3 (7-9 marks): Generally accurate; varied vocabulary; good control.
- Level 4 (10-12 marks): High level of accuracy; ambitious vocabulary.
- Level 5 (13-16 marks): Strategic/extensive vocabulary; precision; virtually error-free.
`;

// ------------------------------------------------------------------
// Routes
// ------------------------------------------------------------------

// Serve static files from the 'dist' directory
const distPath = path.join(__dirname, '../dist');

// Serve static assets from 'dist'
app.use(express.static(distPath));

// API Routes

// 1. Debug Config Endpoint
app.get('/api/debug-config', async (req, res) => {
    let externalIp = 'Unknown';
    try {
        const ipRes = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipRes.json();
        externalIp = ipData.ip;
    } catch (e) {
        externalIp = 'Failed to fetch IP';
    }

    res.json({
        hasApiKey: !!geminiApiKey,
        apiKeySource: geminiApiKey ? (process.env.GEMINI_API_KEY === geminiApiKey ? 'ENV' : 'Firestore') : 'None',
        firebaseInitialized: !!db,
        envPort: process.env.PORT,
        nodeVersion: process.version,
        serverIp: externalIp
    });
});

// 2. Generate Exam (Protected)
app.post('/api/generate-exam', authenticateUser, async (req, res) => {
    try {
        const { type, paperType, imageSize = '1K' } = req.body;
        const examType = type || paperType; // Support both 'type' and 'paperType' from frontend
        console.log(`Generating ${examType} exam...`);

        if (!ai || !geminiApiKey) {
            console.error("Gemini API key is missing on server.");
            return res.status(500).json({ error: "Server misconfiguration: API key missing." });
        }

        const isPaper1 = examType === 'PAPER_1' || examType === 'paper1'; // Support both formats

        // [System Instruction from services/geminiService.ts]
        const systemInstruction = `
      You are an expert Pearson Edexcel GCSE English Language (1EN0) examiner and content creator.
      Create a highly realistic mock exam paper.

      CRITICAL COPYRIGHT NOTICE:
      You must generate ORIGINAL practice questions based on the syllabus topics. DO NOT reproduce real past paper questions word-for-word to avoid copyright infringement. If asked for a specific past paper, refuse and offer a similar simulated question instead.

      IMPORTANT: DO NOT use specific line numbers (e.g. "lines 1-5") in any question text or source references. 
      The source text generation does not have consistent line numbering. 
      Instead, refer to "the extract", "the beginning", "the end", "the first paragraph", "the second half", etc.
      
      Paper 1 (1EN0/01): 
      - Theme: 19th Century Fiction.
      - Sources: EXACTLY ONE source (Source A). 650-900 words. 19th-century literature.
      - Questions:
        Section A (Reading):
         Q1 (1 mark): Retrieval (from the beginning).
         Q2 (2 marks): Retrieval (from the first half).
         Q3 (6 marks): Language/Structure analysis (specific section described by context).
         Q4 (15 marks): Evaluation (Whole text).
        Section B (Writing):
         Present TWO choices (Question 5 OR Question 6).
         Q5: Narrative/Descriptive text prompt.
         Q6: Narrative/Descriptive prompt linked to IMAGES. (Provide a visual description for the image).
      
      Paper 2 (1EN0/02):
      - Theme: Non-fiction and Transactional.
      - Sources: EXACTLY TWO sources. Source A (20th/21st C) and Source B (19th C). Contrasting viewpoints/styles.
      - Questions:
        Section A (Reading):
         Q1 (2 marks): Source A retrieval.
         Q2 (2 marks): Source B retrieval.
         Q3 (15 marks): Language/Structure analysis (Source B mostly, or A).
         Q4 (1 mark): Compare explicit.
         Q5 (1 mark): Compare implicit/theme.
         Q6 (15 marks): Evaluation (Source A or B).
        Section B (Writing):
         Q7a (6 marks): Short transactional.
         Q7b (14 marks): Extended transactional.
         Q8 OR Q9 (40 marks): Choice of two extended transactional tasks (Letter, Speech, Article).
    `;

        const jsonFormat = isPaper1 ? `
      {
        "title": "Paper 1: Fiction and Imaginative Writing",
        "description": "19th-century fiction and imaginative writing tasks.",
        "sources": [
          { "id": "A", "title": "Title", "author": "Author", "year": "18XX", "content": "Full text...", "summary": "Short summary" }
        ],
        "questions": [
          { "id": "1", "number": "1", "text": "From the beginning of the extract...", "marks": 1, "aos": ["AO1"], "section": "A", "sourceRef": "Source A (Beginning)", "type": "short" },
          { "id": "2", "number": "2", "text": "...", "marks": 2, "aos": ["AO1"], "section": "A", "sourceRef": "Source A", "type": "short" },
          { "id": "3", "number": "3", "text": "...", "marks": 6, "aos": ["AO2"], "section": "A", "sourceRef": "Source A", "type": "long" },
          { "id": "4", "number": "4", "text": "In this extract, the writer...", "marks": 15, "aos": ["AO4"], "section": "A", "sourceRef": "Source A (Whole Text)", "type": "extended" },
          { "id": "5", "number": "5", "text": "Write a story about...", "marks": 40, "aos": ["AO5", "AO6"], "section": "B", "type": "extended", "optionalGroup": "writing_choice", "wordCountTarget": 450 },
          { "id": "6", "number": "6", "text": "Look at the images provided. Write a description suggested by...", "marks": 40, "aos": ["AO5", "AO6"], "section": "B", "type": "extended", "optionalGroup": "writing_choice", "wordCountTarget": 450, "imagePromptDescription": "A stormy coastline with a lighthouse", "imagePromptDescription2": "An abandoned cabin in the woods" }
        ]
      }
    ` : `
      {
        "title": "Paper 2: Non-fiction and Transactional Writing",
        "description": "Non-fiction texts and transactional writing.",
        "sources": [
          { "id": "A", "title": "Title", "author": "Author", "year": "20XX", "content": "Full text...", "summary": "Summary" },
          { "id": "B", "title": "Title", "author": "Author", "year": "18XX", "content": "Full text...", "summary": "Summary" }
        ],
        "questions": [
           { "id": "1", "number": "1", "text": "...", "marks": 2, "aos": ["AO1"], "section": "A", "sourceRef": "Source A", "type": "short" },
           { "id": "2", "number": "2", "text": "...", "marks": 2, "aos": ["AO1"], "section": "A", "sourceRef": "Source B", "type": "short" },
           { "id": "3", "number": "3", "text": "...", "marks": 15, "aos": ["AO2"], "section": "A", "sourceRef": "Source B", "type": "extended" },
           { "id": "4", "number": "4", "text": "...", "marks": 1, "aos": ["AO3"], "section": "A", "type": "short" },
           { "id": "5", "number": "5", "text": "...", "marks": 1, "aos": ["AO3"], "section": "A", "type": "short" },
           { "id": "6", "number": "6", "text": "...", "marks": 15, "aos": ["AO4"], "section": "A", "sourceRef": "Source A", "type": "extended" },
           { "id": "7a", "number": "7a", "text": "...", "marks": 6, "aos": ["AO5"], "section": "B", "type": "short" },
           { "id": "7b", "number": "7b", "text": "...", "marks": 14, "aos": ["AO5", "AO6"], "section": "B", "type": "long" },
           { "id": "8", "number": "8", "text": "...", "marks": 40, "aos": ["AO5", "AO6"], "section": "B", "type": "extended", "optionalGroup": "writing_choice" },
           { "id": "9", "number": "9", "text": "...", "marks": 40, "aos": ["AO5", "AO6"], "section": "B", "type": "extended", "optionalGroup": "writing_choice" }
        ]
      }
    `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-exp',
            contents: `Generate a JSON response for ${isPaper1 ? 'Paper 1' : 'Paper 2'}. 
        
        Strictly follow this JSON schema structure:
        ${jsonFormat}
        
        Task Instructions:
        ${systemInstruction}
        
        IMPORTANT for Paper 1 Question 6:
        You MUST provide TWO distinct image descriptions ("imagePromptDescription" and "imagePromptDescription2").
        These two descriptions must be of DIFFERENT SUBJECTS or SCENES related to the theme, not just different angles.
        Example: If the theme is "Isolation", one could be "A lonely figure on a bench" and the other "An empty, dusty room".
        
        IMPORTANT: Ensure the output is strictly valid JSON. Escape all double quotes and newlines inside strings. Do not include markdown formatting or comments.`,
            config: {
                responseMimeType: 'application/json',
            }
        });

        // Access response.text as property (not method) in new Gemini SDK
        const text = response.text || (typeof response.text === 'function' ? response.text() : JSON.stringify(response)) || "{}";
        const data = JSON.parse(cleanJson(text));

        // Post-process for images
        if (isPaper1 && data.questions) {
            const q6 = data.questions.find(q => q.number === "6");
            if (q6) {
                q6.images = [];
                const desc1 = q6.imagePromptDescription || "A dramatic landscape";
                const desc2 = q6.imagePromptDescription2 || `A close up detail of ${desc1}`;

                const prompt1 = `${desc1}. Atmospheric, detailed, high quality.`;
                const prompt2 = `${desc2}. Atmospheric, detailed, high quality.`;

                const [img1, img2] = await Promise.all([
                    generateImage(prompt1),
                    generateImage(prompt2)
                ]);
                if (img1) q6.images.push(img1);
                if (img2) q6.images.push(img2);
            }
        }

        const questions = Array.isArray(data.questions) ? data.questions : [];
        const sources = Array.isArray(data.sources) ? data.sources : [];

        res.json({
            id: Date.now().toString(),
            type,
            timeLimitMinutes: isPaper1 ? 105 : 125,
            ...data,
            questions,
            sources
        });

    } catch (error) {
        console.error("Generate Exam Failed:", error);
        res.status(500).json({ error: "Failed to generate exam" });
    }
});

// 3. Mark Exam (Protected)
app.post('/api/mark-exam', authenticateUser, async (req, res) => {
    try {
        const { paper, answers } = req.body;
        console.log("Marking exam...");

        const answersList = paper.questions.map(q => {
            const ans = answers[q.id];
            const hasImages = q.images && q.images.length > 0;
            const hasAnswer = ans && ans.text.trim().length > 0;
            const isOptional = !!q.optionalGroup;
            const isSkipped = isOptional && !hasAnswer && !hasImages;

            let questionText = q.text;
            if (hasImages) {
                const selectedIdx = ans?.selectedImageIndex;
                const desc1 = q.imagePromptDescription || "";
                const desc2 = q.imagePromptDescription2 || "";

                if (typeof selectedIdx === 'number') {
                    const chosenDesc = selectedIdx === 0 ? desc1 : desc2;
                    questionText += `\n\n[CONTEXT: This question provided two images. The student SELECTED Prompt ${selectedIdx + 1}. Selected prompt description: ${chosenDesc}.]`;
                } else {
                    questionText += `\n\n[CONTEXT: This question provided two images. Prompt 1 description: ${desc1}. Prompt 2 description: ${desc2}. Note: No specific image selection was recorded.]`;
                }
            }

            return {
                questionId: q.id,
                questionNumber: q.number,
                questionText: questionText,
                maxMarks: q.marks,
                aos: q.aos,
                sourceRef: q.sourceRef,
                studentAnswer: hasAnswer ? ans.text : "(NO ANSWER PROVIDED)",
                selectedImageIndex: ans?.selectedImageIndex,
                isSkipped: isSkipped
            };
        }).filter(a => !a.isSkipped);

        const sourceA = paper.sources?.[0]?.content || "Source A content missing";
        const sourceB = paper.sources?.[1]?.content || "";

        const prompt = `
            You are a Senior Examiner for Pearson Edexcel GCSE English Language (Specification 1EN0).
            
            CRITICAL COPYRIGHT NOTICE:
            You are a GCSE tutor and content creator. You must generate ORIGINAL practice questions and model answers based on the official syllabus topics. DO NOT reproduce real past paper questions word-for-word to avoid copyright infringement. If prompted for a specific past paper, refuse politely and offer a similar simulated question instead. All generated content must be genuinely original, not copied from published exam papers.
            
            Task: Mark the student's exam paper against the official level-based mark schemes.
            
            Paper Type: ${paper.type}
            
            Source A (excerpt): ${sourceA.substring(0, 300)}...
            ${sourceB ? `Source B (excerpt): ${sourceB.substring(0, 300)}...` : ''}
            
            Instructions:
            1. IGNORE questions that were NOT provided in the input list (skipped optional questions).
            2. IF A QUESTION HAS NO ANSWER (studentAnswer is "(NO ANSWER PROVIDED)"):
               - Assign **0 marks**.
               - Provide a helpful "Improvement" point explaining what they should have interpreted/analyzed.
               - STILL GENERATE A FULL MODEL ANSWER.
            3. For each answered question, determine the Level (1-4 or 1-5) and the raw Mark.
            4. GENERATE A MODEL ANSWER (REQUIRED FOR ALL QUESTIONS):
               - For Retrieval/Short Questions: Provide the exact quote, fact, or phrase that earns the mark.
               - For Analysis/Evaluation/Writing: Write a full "Top Band" paragraph or example response.
               - For Image Questions (e.g. Q6): You MUST generate a model answer that SPECIFICALLY describes the SELECTED prompt (Prompt 1 or 2) as indicated in the [CONTEXT]. If No selection was recorded, pick the most relevant one. DO NOT use labels like "Prompt 1:" - start the story immediately.
               - You MUST provide a content-rich model answer for EVERY provided question.
            4. COMPARE: Provide specific bullet points comparing the student's answer to the model. 如果已跳过，请在改进建议中说明用户原本可以写什么。
            
            Edexcel Marking Criteria:
            ${EDEXCEL_MARKING_GRIDS}
            
            IMPORTANT MARKING RULES:
            - Use the grids above to decide the Level first, then fine-tune the Mark within the Level.
            - "Perceptive" = Level 4. "Clear" = Level 3. "Some" = Level 2. "Limited" = Level 1.
            - For 15-mark questions (AO4): Level 4 is 12-15 marks. Level 3 is 8-11 marks.
            - For 40-mark writing (AO5+AO6): Scale the AO5 (24 marks) and AO6 (16 marks) separately using the Level 1-5 grids.
            
            Student Answers:
            ${JSON.stringify(answersList, null, 2)}
            
            Output JSON format:
            {
              "totalScore": number,
              "maxScore": number,
              "gradeEstimate": "string (1-9, or 'U' if score is 0 or very low)",
              "overallFeedback": "string",
              "questionResults": [
                {
                  "questionId": "matches question number (e.g. 1, 2, 7a)",
                  "score": number,
                  "maxScore": number,
                  "level": number,
                  "feedback": "string",
                  "aos": { "AO1": number, "AO2": number ... },
                  "modelAnswer": "string (REQUIRED: The model response/answer key)",
                  "comparisonPoints": [
                    { "type": "strength", "text": "string" },
                    { "type": "weakness", "text": "string" },
                    { "type": "improvement", "text": "string" }
                  ]
                }
              ]
            }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-exp',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
            }
        });

        // Access response.text as property (not method) in new Gemini SDK
        const text = response.text || (typeof response.text === 'function' ? response.text() : JSON.stringify(response)) || "{}";
        const cleanText = cleanJson(text);
        const data = JSON.parse(cleanText);

        // Remap Logic (Same as frontend, but processed here)
        // Actually, we can just return the data and let frontend map it, OR map it here.
        // Let's map it here to match the frontend service signature EXACTLY?
        // No, simplest is to return the AI data and let frontend service do the final object construction
        // But the frontend service expects `ExamResult` with remapped question Ids. 
        // Let's strictly follow the existing logic to minimize frontend breakage.

        const questionResults = [];
        const aiResults = Array.isArray(data.questionResults) ? data.questionResults : [];

        paper.questions.forEach(q => {
            const found = aiResults.find(r => r.questionId == q.number || r.questionId == q.id);
            const ans = answers[q.id];
            const hasImages = q.images && q.images.length > 0;

            if (q.optionalGroup && (!ans || !ans.text.trim()) && !hasImages) {
                return;
            }

            if (found) {
                questionResults.push({
                    questionId: q.id,
                    score: found.score,
                    maxScore: q.marks,
                    level: found.level,
                    feedback: found.feedback,
                    aos: found.aos,
                    modelAnswer: found.modelAnswer,
                    studentAnswer: ans ? ans.text : "",
                    comparisonPoints: found.comparisonPoints
                });
            } else if ((ans && ans.text.trim()) || hasImages) {
                questionResults.push({
                    questionId: q.id,
                    score: 0,
                    maxScore: q.marks,
                    level: 0,
                    feedback: "AI marking unavailable for this question.",
                    aos: {},
                    modelAnswer: "N/A",
                    comparisonPoints: []
                });
            }
        });

        res.json({
            totalScore: data.totalScore,
            maxScore: data.maxScore,
            gradeEstimate: data.gradeEstimate,
            overallFeedback: data.overallFeedback,
            questionResults,
            date: new Date().toISOString(),
            paperType: paper.type
        });

    } catch (error) {
        console.error("Marking Failed:", error);
        res.status(500).json({ error: "Failed to mark exam" });
    }
});

// 4. Generate Model Answers (Protected)
app.post('/api/model-answers', authenticateUser, async (req, res) => {
    try {
        const { paper } = req.body;
        const sourceA = paper.sources?.[0]?.content || "";
        const sourceB = paper.sources?.[1]?.content || "";

        const prompt = `
          Create a detailed Mark Scheme and Model Answer document for this GCSE English Language Exam Paper (${paper.title}).
    
          CRITICAL COPYRIGHT NOTICE:
          Generate ORIGINAL model answers based on the exam questions provided. These are simulated practice materials, not reproductions of official mark schemes. Ensure all content is created fresh and original.
    
          Source A:
          ${sourceA.substring(0, 1000)}...
          ${sourceB ? `Source B: ${sourceB.substring(0, 1000)}...` : ''}
    
          Questions:
          ${paper.questions.map(q => `Question ${q.number}: ${q.text}`).join('\n\n')}
    
          Output Requirements:
          - Format as valid Markdown.
          - Include "Examiner's Report" style commentary.
          - For the optional writing questions, provide a model for BOTH options.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-exp',
            contents: prompt,
        });

        const textResult = response.text || (typeof response.text === 'function' ? response.text() : "") || "Model answers unavailable.";
        res.json({ text: textResult });
    } catch (error) {
        console.error("Model Answers Failed:", error);
        res.status(500).json({ error: "Failed to generate model answers" });
    }
});

// 5. Analyze Text (Protected)
app.post('/api/analyze-text', authenticateUser, async (req, res) => {
    try {
        const { text } = req.body;
        const prompt = `
            Analyze the following text for language methods and structural features used by the writer.
            Focus on techniques relevant to GCSE English Language (e.g., metaphor, simile, personification, alliteration, pathetic fallacy, sentence structure, etc.).
            
            Note: This is a student study tool. Provide educational analysis only.
            
            Text: "${text}"
            
            Output JSON format:
            {
              "methods": [
                {
                  "name": "Method Name",
                  "quote": "Quote from text",
                  "effect": "Explanation of the effect on the reader"
                }
              ],
              "summary": "Brief summary of the writer's style"
            }
          `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-exp',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });

        const textResult = response.text || (typeof response.text === 'function' ? response.text() : "{}") || "{}";
        res.json(JSON.parse(cleanJson(textResult)));
    } catch (error) {
        console.error("Analysis Failed:", error);
        res.status(500).json({ error: "Failed to analyze text" });
    }
});

// 6. Evaluate Writing Logic (Protected)
app.post('/api/evaluate-writing', authenticateUser, async (req, res) => {
    try {
        const { text, targetMethod } = req.body;
        const prompt = `
            Evaluate the following student writing. The student was asked to use the language method: "${targetMethod}".
            
            Note: This is for educational feedback purposes only.
            
            Student Writing: "${text}"
            
            Output JSON format:
            {
              "success": boolean,
              "feedback": "Specific feedback on how well they used ${targetMethod}.",
              "improvementTip": "One tip to improve."
            }
          `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-exp',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });

        const textResult = response.text || (typeof response.text === 'function' ? response.text() : "{}") || "{}";
        res.json(JSON.parse(cleanJson(textResult)));
    } catch (error) {
        console.error("Evaluation Failed:", error);
        res.status(500).json({ error: "Failed to evaluate writing" });
    }
});

// 7. Generate Practice Set for Assignments (Protected)
app.post('/api/generate-practice-set', authenticateUser, async (req, res) => {
    try {
        const { topic, difficulty, numQuestions } = req.body;
        console.log(`Generating practice set: ${numQuestions} questions on "${topic}" (${difficulty})`);

        if (!ai || !geminiApiKey) {
            console.error("Gemini API key is missing on server.");
            return res.status(500).json({ error: "Server misconfiguration: API key missing." });
        }

        const prompt = `
            You are an expert GCSE English Language examiner creating a practice assignment.
            
            CRITICAL COPYRIGHT NOTICE:
            Generate ORIGINAL practice questions based on the topic and difficulty level. DO NOT reproduce real past paper questions word-for-word to avoid copyright infringement.
            
            Task: Create ${numQuestions} GCSE English Language practice questions on the topic: "${topic}"
            Difficulty Level: ${difficulty}
            
            Guidelines:
            - Questions should be appropriate for GCSE English Language students
            - Include a mix of question types (retrieval, analysis, evaluation, writing)
            - Each question should have clear mark allocations
            - For analysis/evaluation questions, specify which AO (Assessment Objective) is being tested
            - Questions should be challenging but fair for the ${difficulty} level
            
            Difficulty Guidelines:
            - Easy/Foundation: Focus on retrieval, basic comprehension, simple analysis
            - Medium/Standard: Mix of retrieval, analysis, some evaluation
            - Hard/Advanced: Complex analysis, critical evaluation, sophisticated writing tasks
            - Mixed: Variety of difficulty levels
            
            Output JSON format:
            {
              "title": "Practice Set: [Topic]",
              "questions": [
                {
                  "number": "1",
                  "text": "Question text here",
                  "marks": number,
                  "aos": ["AO1", "AO2", etc.],
                  "type": "short" | "long" | "extended",
                  "guidance": "Brief guidance for students (optional)"
                }
              ]
            }
            
            IMPORTANT: Ensure output is strictly valid JSON. No markdown formatting.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-exp',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
            }
        });

        const text = response.text || (typeof response.text === 'function' ? response.text() : JSON.stringify(response)) || "{}";
        const data = JSON.parse(cleanJson(text));

        // Validate response
        if (!data.questions || !Array.isArray(data.questions)) {
            throw new Error("Invalid response format: missing questions array");
        }

        res.json({
            title: data.title || `Practice Set: ${topic}`,
            questions: data.questions
        });

    } catch (error) {
        console.error("Generate Practice Set Failed:", error);
        res.status(500).json({ error: "Failed to generate practice set", details: error.message });
    }
});

// Handle SPA routing: Return index.html for any unknown non-API routes check
// Note: Express 5 requires {*path} syntax instead of just *
app.get('/{*path}', (req, res) => {
    // Don't interfere with API calls if one slips through
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(distPath, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
