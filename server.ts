import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // SMS Verification Store (In-memory for demo/research purposes)
  const verificationCodes = new Map<string, string>();

  // SMS Routes
  app.post("/api/phone/send-code", async (req, res) => {
    const { phoneNumber } = req.body;
    if (!phoneNumber) return res.status(400).json({ error: "Phone number required" });

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    verificationCodes.set(phoneNumber, code);

    const sid = process.env.TWILIO_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

    if (sid && token && twilioPhone) {
      try {
        const { default: twilio } = await import("twilio");
        const client = twilio(sid, token);
        await client.messages.create({
          body: `Your Skope verification code is: ${code}`,
          from: twilioPhone,
          to: phoneNumber
        });
        return res.json({ success: true, message: "Verification code sent via SMS" });
      } catch (err: any) {
        console.error("Twilio error:", err);
        return res.status(500).json({ error: `Failed to send SMS: ${err.message}` });
      }
    } else {
      // Development Fallback / Mock
      console.log(`[SMS MOCK] To: ${phoneNumber}, Code: ${code}`);
      return res.json({ 
        success: true, 
        message: "Development Mode: Code sent to server logs (check terminal)",
        mock: true,
        code: process.env.NODE_ENV !== 'production' ? code : undefined // Only show in non-prod if keys missing
      });
    }
  });

  app.post("/api/phone/verify-code", async (req, res) => {
    const { phoneNumber, code } = req.body;
    const storedCode = verificationCodes.get(phoneNumber);

    if (storedCode && storedCode === code) {
      verificationCodes.delete(phoneNumber);
      return res.json({ success: true });
    }

    return res.status(400).json({ error: "Invalid or expired verification code" });
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
