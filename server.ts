import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // Initialize Gemini AI
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY environment variable is missing.");
  }
  const ai = new GoogleGenAI({ apiKey: apiKey || "" });

  // --- API Routes ---

  app.post("/api/analyze-cv", async (req, res) => {
    try {
      const { cvText, fileData, desiredJobs } = req.body;
      const parts: any[] = [];
      
      if (cvText) parts.push({ text: `CV Text Content:\n${cvText}` });
      if (fileData) {
        parts.push({
          inlineData: {
            data: fileData.data,
            mimeType: fileData.mimeType
          }
        });
      }

      const prompt = `
          You are an expert career coach and ATS (Applicant Tracking System) specialist. 
          Perform a deep, highly tailored analysis of the provided CV.
          The user is targeting these specific roles: ${desiredJobs?.join(", ") || "General career growth"}.
          Current Year: 2026.
          Return the response in JSON format.
      `;
      parts.push({ text: prompt });

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-latest",
        contents: { parts },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              analysis: { type: Type.STRING, description: "Markdown formatted analysis" },
              atsScore: { type: Type.NUMBER, description: "ATS score from 0 to 100" },
              suggestedCourses: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    provider: { type: Type.STRING },
                    url: { type: Type.STRING },
                    relevance: { type: Type.STRING }
                  },
                  required: ["title", "provider", "url", "relevance"]
                }
              }
            },
            required: ["analysis", "atsScore", "suggestedCourses"]
          }
        }
      });

      const text = response.text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON object found in response");
      res.json(JSON.parse(jsonMatch[0]));
    } catch (error: any) {
      console.error("Analysis Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { message, context } = req.body;
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-latest",
        contents: `
          You are "Skope Buddy", a helpful career assistant. 
          Context: ${context}
          User message: ${message}
        `,
      });
      res.json({ text: response.text });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/analyze-job-match", async (req, res) => {
    try {
      const { cvText, fileData, jobTitle, jobDescription } = req.body;
      const parts: any[] = [];
      if (cvText) parts.push({ text: `CV Text Content:\n${cvText}` });
      if (fileData) {
        parts.push({ inlineData: { data: fileData.data, mimeType: fileData.mimeType } });
      }

      const prompt = `Compare the provided CV with the Job Description. Job Title: ${jobTitle}. Job Description: ${jobDescription}. Return as JSON.`;
      parts.push({ text: prompt });

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-latest",
        contents: { parts },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER },
              analysis: { type: Type.STRING },
              tips: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["score", "analysis", "tips"]
          }
        }
      });

      const text = response.text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON object found in response");
      res.json(JSON.parse(jsonMatch[0]));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/interview", async (req, res) => {
    try {
      const { history, jobTitle, jobDescription } = req.body;
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-latest",
        contents: `
          You are a professional interviewer for ${jobTitle}. Job Description: ${jobDescription}.
          History: ${history.map((h: any) => `${h.role}: ${h.text}`).join('\n')}
          Provide the next response as Interviewer.
        `,
      });
      res.json({ text: response.text });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Vite / Static Handling ---

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
