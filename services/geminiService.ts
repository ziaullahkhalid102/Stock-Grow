
import { GoogleGenAI } from "@google/genai";

// Initialize Gemini
// NOTE: Make sure to set API_KEY in your Vercel Environment Variables
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getMarketInsights = async (
  totalUsers: number, 
  totalVolume: number, 
  topPlans: {name: string, count: number}[]
): Promise<string> => {
  
  try {
    const prompt = `
      Act as a financial market expert for the StockGrow app in Pakistan.
      
      Current Data:
      - Active Users: ${totalUsers}
      - Total Volume: Rs. ${totalVolume}
      - Top Plans: ${topPlans.map(p => p.name).join(', ')}

      Write a short, exciting, and professional 1-sentence market insight/tip for investors.
      Use emojis. Tone should be encouraging and bullish.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text.trim();
  } catch (error) {
    console.error("AI Error:", error);
    // Fallback if key is missing or quota exceeded
    const messages = [
        "Market volume is reaching new highs! Invest now to secure your profit.",
        "Bulls are in control. Liquidity is high across all sectors. 🚀",
        "Stable growth detected. Consistent returns observed in Gold and Diamond plans.",
        "High demand for short-term plans. Don't miss the opportunity! 📈"
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }
};