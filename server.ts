import express, { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Gemini Client
  const apiKey = process.env.GEMINI_API_KEY;
  let aiClient: GoogleGenAI | null = null;

  if (apiKey) {
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  // AI Coach endpoint
  app.post('/api/chat', async (req: Request, res: Response) => {
    try {
      const { message, userProfile, workoutContext } = req.body;

      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      if (!aiClient) {
        return res.json({
          reply: `Here's my advice based on your request: "${message}". Make sure to keep your training structured, prioritize progressive overload, and maintain consistent recovery and nutrition!`
        });
      }

      const systemInstruction = `You are SR Abhishek, the elite head coach, bodybuilding specialist, and founder of INTENSIVE.
Your coaching style is direct, highly professional, motivating, evidence-based, and performance-focused.
You provide precise tactical workout, recovery, nutrition, and progressive overload advice tailored strictly to the user's details.

User Profile Context:
${JSON.stringify(userProfile || { goal: 'Build Muscle', experience: 'Intermediate' }, null, 2)}

Current Workout/Training Context:
${JSON.stringify(workoutContext || {}, null, 2)}

Strict Guidelines:
1. Speak as Coach SR Abhishek. Keep answers concise, direct, actionable, and structured (use short bullet points or numbered lists if necessary).
2. Avoid generic fluffy motivational speech or cartoonish phrases.
3. Keep fitness recommendations general and avoid making any medical diagnoses or treating injuries. Recommend seeing a physical therapist for acute pain.
4. Give concrete advice on exercise substitutions, workout adjustments, progression strategies, and nutrition macros.`;

      const response = await aiClient.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: message,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      const reply = response.text || 'Keep pushing your limits. Train smart and stay consistent.';
      return res.json({ reply });
    } catch (error: any) {
      console.error('Error in /api/chat:', error);
      return res.status(500).json({
        error: 'Failed to generate response',
        reply: "I couldn't process that right now. Stick to your core training plan and focus on progressive overload today."
      });
    }
  });

  // Serve Vite frontend in dev/prod
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    // In development mode, Vite dev server handles assets & HTML fallback automatically
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`INTENSIVE MK FITNESS server running on port ${PORT}`);
  });
}

startServer();
