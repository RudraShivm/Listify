import express from "express";
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import { ROUTINE_PROMPT, GEMINI_MODEL_ROUTINE } from '../constants.js';

const router = express.Router();



const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

router.post("/routine-image", async (req, res) => {
    const { base64Image, mimeType, accessToken } = req.body;

    if (!base64Image || !mimeType || !accessToken) {
        return res.status(400).json({ error: "Missing required fields." });
    }

    // Verify access token using getUser
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
        console.error("Auth error:", error);
        return res.status(401).json({
            error: "Invalid or expired access token.",
            details: error?.message
        });
    }
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
        res.json({
            events: json.events || [],
            success: true
        });
    } catch (err) {
        console.error("Gemini Analysis Error:", err);
        res.status(500).json({
            error: "Failed to analyze routine image.",
            details: err instanceof Error ? err.message : String(err)
        });
    }
});

export default router;