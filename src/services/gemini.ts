export interface FileData {
  data: string; // base64
  mimeType: string;
}

export async function analyzeCV(cvText: string | null, fileData: FileData | null, desiredJobs: string[] = []) {
  try {
    const response = await fetch("/api/analyze-cv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cvText, fileData, desiredJobs }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to analyze CV");
    }
    return await response.json();
  } catch (e: any) {
    console.error("Analysis failed", e);
    return {
      analysis: `Analysis failed. ${e.message}. Please try again later.`,
      atsScore: 0,
      suggestedCourses: []
    };
  }
}

export async function getChatResponse(message: string, context: string) {
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, context }),
    });
    const data = await response.json();
    return data.text || "I'm sorry, I couldn't generate a response.";
  } catch (e) {
    return "I'm sorry, I couldn't generate a response due to a connection error.";
  }
}

export async function analyzeJobMatch(cvText: string | null, fileData: FileData | null, jobTitle: string, jobDescription: string) {
  try {
    const response = await fetch("/api/analyze-job-match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cvText, fileData, jobTitle, jobDescription }),
    });
    if (!response.ok) return { score: 0, analysis: "Failed to analyze match.", tips: [] };
    return await response.json();
  } catch (e) {
    return { score: 0, analysis: "Failed to analyze match due to connection error.", tips: [] };
  }
}

export async function getInterviewResponse(history: {role: 'user' | 'ai', text: string}[], jobTitle: string, jobDescription: string) {
  try {
    const response = await fetch("/api/interview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ history, jobTitle, jobDescription }),
    });
    const data = await response.json();
    return data.text || "I'm sorry, I couldn't generate a response.";
  } catch (e) {
    return "I'm sorry, I couldn't generate a response due to a connection error.";
  }
}
