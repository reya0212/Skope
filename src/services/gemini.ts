import { GoogleGenAI, Type } from "@google/genai";

// Service to call the server-side Gemini proxy
export interface FileData {
  data: string; // base64
  mimeType: string;
}

async function callProxy(action: string, payload: any) {
  const response = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload })
  });
  
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Server proxy error");
  }
  
  return response.json();
}

export async function analyzeCV(cvText: string | null, fileData: FileData | null, desiredJobs: string[] = []) {
  const parts: any[] = [];
  
  if (cvText) {
    parts.push({ text: `CV Text Content:\n${cvText}` });
  }
  
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
      
      The user is targeting these specific roles: ${desiredJobs.join(", ") || "General career growth"}.
      
      CRITICAL INSTRUCTIONS:
      1. For EACH career path listed above, provide specific, tailored insights.
      2. **Skill Demand Analyzer**: Identify specific skills employers want for these roles and how the CV currently matches or misses them.
      3. **Bullet Point Optimizer**: Critique existing bullet points and provide rewritten, high-impact alternatives using strong action verbs.
      4. **ATS Compatibility Strategy**: Evaluate if the CV will pass modern ATS scanners (formatting, fonts, keywords).
      5. **Formatting & Design Critique**: Assess the visual hierarchy, professional layout, and readability.
      6. **Language, Tone & Professionalism**: Identify issues with tone, voice, or linguistic consistency.
      7. **Impact Analyzer**: Review for "Measurable Achievements". Use the 'X per Y resulting in Z' formula to suggest improvements.
      8. **Region-Specific Trends**: Mention current skill demand insights for these roles (assume globally trending unless context suggests otherwise).
      9. Reference specific sections or bullet points from the user's CV in your analysis to make it truly personalized.
      
      Current Year: 2026.
      
      Provide:
      1. A detailed Markdown analysis containing the sections above, plus strengths, weaknesses, and specific "quick wins".
      2. An ATS Score (0-100) based on industry standards for the desired roles.
      3. A list of 3-5 certified online courses (with real URLs) to bridge identified skill gaps.
      
      Return the response in JSON format.
  `;
  
  parts.push({ text: prompt });

  try {
    const result = await callProxy("analyzeCV", {
      parts,
      config: {
        responseMimeType: "application/json",
        // Using Type directly if available, else standard string
        responseSchema: {
          type: "object",
          properties: {
            analysis: { type: "string" },
            atsScore: { type: "number" },
            suggestedCourses: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  provider: { type: "string" },
                  url: { type: "string" },
                  relevance: { type: "string" }
                },
                required: ["title", "provider", "url", "relevance"]
              }
            }
          },
          required: ["analysis", "atsScore", "suggestedCourses"]
        }
      }
    });

    const text = result.text;
    if (!text) throw new Error("Empty response from proxy");
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON object found in response");
    return JSON.parse(jsonMatch[0]);
  } catch (e: any) {
    console.error("Gemini Proxy failed", e);
    return {
      analysis: `Analysis failed. Error: ${e.message || "Unknown error"}.`,
      atsScore: 0,
      suggestedCourses: []
    };
  }
}

export async function getChatResponse(message: string, context: string) {
  try {
    const prompt = `
        You are "Skope Buddy", a helpful career assistant. 
        Context about the user: ${context}
        
        User message: ${message}
        
        Provide helpful, encouraging, and professional career advice.
    `;
    const result = await callProxy("chat", { prompt });
    return result.text || "I'm sorry, I couldn't generate a response.";
  } catch (e: any) {
    console.error("Chat error", e);
    return "I'm sorry, I'm having trouble connecting to Skope Buddy right now.";
  }
}

export async function analyzeJobMatch(cvText: string | null, fileData: FileData | null, jobTitle: string, jobDescription: string) {
  const parts: any[] = [];
  
  if (cvText) {
    parts.push({ text: `CV Text Content:\n${cvText}` });
  }
  
  if (fileData) {
    parts.push({
      inlineData: {
        data: fileData.data,
        mimeType: fileData.mimeType
      }
    });
  }

  const prompt = `
      You are an expert recruiter and career consultant. Compare the provided CV with the Job Description to provide deep tailoring insights.
      
      Job Title: ${jobTitle}
      Job Description: ${jobDescription}
      
      Provide:
      1. A match score (0-100).
      2. A brief Markdown analysis of why they match and what is missing.
      3. 3 specific tips to improve the CV for THIS specific job.
      4. **CV Tailoring Strategy**: Specific advice on which sections to emphasize or reorder for this role.
      5. **Cover Letter Strategy**: Key themes and "hooks" from the user's background to include in a cover letter for this specific job.
      
      Return as JSON.
  `;
  
  parts.push({ text: prompt });

  try {
    const result = await callProxy("analyzeCV", {
      parts,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            score: { type: "number" },
            analysis: { type: "string" },
            tips: { type: "array", items: { type: "string" } },
            tailoringStrategy: { type: "string" },
            coverLetterTips: { type: "array", items: { type: "string" } }
          },
          required: ["score", "analysis", "tips", "tailoringStrategy", "coverLetterTips"]
        }
      }
    });

    const text = result.text;
    if (!text) throw new Error("Empty response from proxy");
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON object found");
    return JSON.parse(jsonMatch[0]);
  } catch (e: any) {
    console.error("Gemini Match Proxy Error", e);
    return { score: 0, analysis: `Failed to analyze match: ${e.message}`, tips: [] };
  }
}

export async function getInterviewResponse(history: {role: 'user' | 'ai', text: string}[], jobTitle: string, jobDescription: string) {
  try {
    const prompt = `
        You are a highly professional and demanding interviewer for the position of ${jobTitle}.
        Job Description: ${jobDescription}
        
        Conversation History:
        ${history.map(h => `${h.role === 'user' ? 'Candidate' : 'Interviewer'}: ${h.text}`).join('\n')}
        
        Provide the next response as the Interviewer.
    `;
    const result = await callProxy("interview", { prompt });
    return result.text || "I'm sorry, I couldn't generate a response.";
  } catch (e: any) {
    console.error("Interview proxy error", e);
    return "I'm sorry, I'm having trouble with the interview session right now.";
  }
}
