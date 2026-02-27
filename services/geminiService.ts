
import { GoogleGenAI, Type } from "@google/genai";
import { Theme, Announcement, Event } from "../types";

export const rewriteAnnouncement = async (draft: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-3-flash-preview';
    const prompt = `Rewrite the following raw announcement text to be professional yet engaging for a digital signage display. Keep it concise (under 25 words). Raw Text: "${draft}"`;
    const response = await ai.models.generateContent({ model, contents: prompt });
    return response.text?.trim() || draft;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return draft;
  }
};

export const generateTheme = async (description: string): Promise<Theme> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-3-flash-preview';
    const prompt = `Create a UI color theme for a digital signage display based on this description: "${description}". The theme should be dark-mode (high contrast). Return JSON with fields: name, gradientStart, gradientEnd, accentColor, textColor.`;
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            gradientStart: { type: Type.STRING },
            gradientEnd: { type: Type.STRING },
            accentColor: { type: Type.STRING },
            textColor: { type: Type.STRING }
          }
        }
      }
    });
    const result = JSON.parse(response.text || '{}');
    return { id: Date.now().toString(), ...result };
  } catch (error) {
    console.error("Gemini Theme Error", error);
    return { id: Date.now().toString(), name: 'Error Fallback', gradientStart: '#000000', gradientEnd: '#333333', accentColor: '#ffffff', textColor: '#ffffff' };
  }
};

interface ExtractedContent {
    announcements: Partial<Announcement>[];
    events: Partial<Event>[];
}

/**
 * Analyzes newsletter text. Note: Standard GenAI SDK doesn't natively support 
 * AbortSignal in all environments yet, so timeout handling is managed at the component level.
 */
export const analyzeNewsletter = async (text: string): Promise<ExtractedContent> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const model = 'gemini-3-flash-preview'; // Switched to flash-preview for faster response
        const prompt = `
            Extract EVENTS and ANNOUNCEMENTS from the following text.
            1. For EVENTS: Look for dates, times, and locations. Format date as ISO string. Category: Academic, Sports, Arts, General.
            2. For ANNOUNCEMENTS: Create a title and short summary (under 30 words).
            Return JSON with 'events' and 'announcements'.
            TEXT: ${text.substring(0, 12000)}
        `;

        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        events: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING },
                                    time: { type: Type.STRING },
                                    location: { type: Type.STRING },
                                    date: { type: Type.STRING },
                                    category: { type: Type.STRING }
                                }
                            }
                        },
                        announcements: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING },
                                    content: { type: Type.STRING },
                                    priority: { type: Type.STRING }
                                }
                            }
                        }
                    }
                }
            }
        });
        
        const result = JSON.parse(response.text || '{}');
        return {
            events: (result.events || []).slice(0, 20), // Sanity limit
            announcements: (result.announcements || []).slice(0, 15) // Sanity limit
        };
    } catch (error) {
        console.error("Gemini Analysis Error", error);
        throw error;
    }
}

export const fetchLiveNews = async () => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: 'List 6 current US academic news headlines. Format: Title - Source.',
            config: { tools: [{ googleSearch: {} }] },
        });
        const text = response.text || '';
        const lines = text.split('\n').filter(l => l.trim().length > 10);
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const sourceUrls = groundingChunks.map(chunk => chunk.web?.uri).filter((uri): uri is string => !!uri);
        return lines.map((line, index) => {
            const cleanLine = line.replace(/^\d+[\.\)]\s*/, '').trim();
            const [title, ...sourceParts] = cleanLine.split(' - ');
            return { title: title.trim(), source: (sourceParts.join(' - ') || 'News').trim(), url: sourceUrls[index] || '#' };
        });
    } catch (error) {
        console.error("News Fetch Error:", error);
        return [];
    }
};
