import { GoogleGenAI, Type } from "@google/genai";
import { ROUTINE_PROMPT, GEMINI_MODEL_ROUTINE } from '../constants';

export interface ExtractedRoutineEvent {
  title: string;
  dayOfWeek: number;
  startTime: string;
  endTime?: string;
}

export const analyzeRoutineImage = async (base64Image: string, mimeType: string): Promise<ExtractedRoutineEvent[]> => {
  // Always use a fresh instance to ensure up-to-date API keys as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL_ROUTINE,
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType,
            },
          },
          {
            text: ROUTINE_PROMPT,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            events: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  dayOfWeek: { type: Type.INTEGER, description: "0 for Sunday, 1 for Monday, etc." },
                  startTime: { type: Type.STRING, description: "HH:MM 24-hour format" },
                  endTime: { type: Type.STRING, description: "HH:MM 24-hour format, optional" }
                },
                required: ["title", "dayOfWeek", "startTime"]
              }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];

    const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const json = JSON.parse(jsonString);
    return json.events || [];
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Failed to analyze routine image. Please check your API key and image format.");
  }
};
