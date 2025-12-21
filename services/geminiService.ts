
const BACKEND_URL = process.env.VITE_BACKEND_URL || '';

export interface ExtractedRoutineEvent {
  title: string;
  dayOfWeek: number;
  startTime: string;
  endTime?: string;
}

export const analyzeRoutineImage = async (
  base64Image: string,
  mimeType: string,
  accessToken: string
): Promise<ExtractedRoutineEvent[]> => {
  try {
    const res = await fetch(`${BACKEND_URL}/api/gemini/routine-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base64Image, mimeType, accessToken })
    });
    if (!res.ok) throw new Error("Backend Gemini request failed");
    const data = await res.json();
    return data.events || [];
  } catch (error) {
    console.error("Gemini Backend Error:", error);
    throw new Error("Failed to analyze routine image via backend.");
  }
};
