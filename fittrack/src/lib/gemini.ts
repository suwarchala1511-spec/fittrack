import { GoogleGenAI, Type } from "@google/genai";
import { Activity, FoodIntake, SleepRecord, Goal } from "../types";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    // Try Vite's preferred way first, then fallback to global define
    const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    
    if (!apiKey || apiKey === '') {
      throw new Error("GEMINI_API_KEY is not defined. Please check that your .env file contains VITE_GEMINI_API_KEY=your_key and that you have run 'npm run build' after creating it.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export async function generateDailyInsight(
  activities: Activity[],
  food: FoodIntake[],
  sleep: SleepRecord[],
  goals: Goal[]
) {
  try {
    const ai = getAI();
    const prompt = `
      Analyze the following fitness data for today and provide a concise daily insight (max 3 sentences).
      Activities: ${JSON.stringify(activities)}
      Food Intake: ${JSON.stringify(food)}
      Sleep: ${JSON.stringify(sleep)}
      Goals: ${JSON.stringify(goals)}
      
      Focus on progress, areas for improvement, and a motivational tip.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Keep up the good work! (AI insights currently unavailable)";
  }
}

export async function generateAdvancedRecommendations(
  activities: Activity[],
  food: FoodIntake[],
  sleep: SleepRecord[],
  goals: Goal[]
) {
  try {
    const ai = getAI();
    const prompt = `
      Act as an advanced AI health coach for FitTrack. Analyze the user's data and provide personalized recommendations for exercise, nutrition, and sleep adjustments to optimize health and goal achievement.
      
      User Data:
      - Activities (last 7 days): ${JSON.stringify(activities)}
      - Food Intake (last 7 days): ${JSON.stringify(food)}
      - Sleep Records (last 7 days): ${JSON.stringify(sleep)}
      - Goals: ${JSON.stringify(goals)}
      
      Provide your response in JSON format with the following structure:
      {
        "exercise": "Specific exercise recommendation",
        "nutrition": "Specific nutrition adjustment",
        "sleep": "Specific sleep improvement tip",
        "analysis": "Brief overall analysis of current status"
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            exercise: { type: Type.STRING },
            nutrition: { type: Type.STRING },
            sleep: { type: Type.STRING },
            analysis: { type: Type.STRING },
          },
          required: ["exercise", "nutrition", "sleep", "analysis"],
        },
      },
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Gemini Error:", error);
    return null;
  }
}

export async function analyzeNutrition(foodDescription: string): Promise<{
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
} | null> {
  try {
    const ai = getAI();
    const prompt = `Analyze the following food description and provide estimated nutritional values (calories, protein, carbs, fat in grams). 
    Food description: "${foodDescription}"
    
    Return the result as a JSON object with the following structure:
    {
      "name": "Clean name of the food",
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number
    }
    
    If the description is not a food item, return null.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            calories: { type: Type.NUMBER },
            protein: { type: Type.NUMBER },
            carbs: { type: Type.NUMBER },
            fat: { type: Type.NUMBER }
          },
          required: ["name", "calories", "protein", "carbs", "fat"]
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.error("Error analyzing nutrition:", error);
    return null;
  }
}
