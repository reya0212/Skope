import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Initialize Gemini on server
  const apiKey = process.env.GEMINI_API_KEY;
  const genAI = apiKey ? new GoogleGenAI({ apiKey }) : null;

  // Gemini Proxy Route
  app.post("/api/gemini", async (req, res) => {
    if (!genAI) {
      return res.status(500).json({ error: "GEMINI_API_KEY not configured on server" });
    }

    const { action, payload } = req.body;

    try {
      if (action === "analyzeCV") {
        const { parts, config } = payload;
        const result = await (genAI as any).models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [{ parts }],
          config
        });
        return res.json({ text: result.text });
      }

      if (action === "chat" || action === "interview") {
        const { prompt } = payload;
        const result = await (genAI as any).models.generateContent({
          model: "gemini-3-flash-preview",
          contents: prompt
        });
        return res.json({ text: result.text });
      }

      return res.status(400).json({ error: "Invalid action" });
    } catch (error: any) {
      console.error("Gemini server error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
