import { GoogleGenerativeAI } from "@google/generative-ai";
import { Activity, FoodIntake, SleepRecord, Goal } from "../types";

// This pulls the key you added to Vercel
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

export async function generateDailyInsight(activities: Activity[], food: FoodIntake[], sleep: SleepRecord[], goals: Goal[]) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Analyze the following fitness data for today and provide a concise daily insight (max 3 sentences). 
    Activities: ${JSON.stringify(activities)} 
    Food Intake: ${JSON.stringify(food)} 
    Sleep: ${JSON.stringify(sleep)} 
    Goals: ${JSON.stringify(goals)}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Keep up the good work! (AI insights currently unavailable)";
  }
}

export async function generateAdvancedRecommendations(activities: Activity[], food: FoodIntake[], sleep: SleepRecord[], goals: Goal[]) {
  try {
    const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: { responseMimeType: "application/json" }
    });
    
    const prompt = `Act as an advanced AI health coach. Provide personalized recommendations in JSON format:
    {"exercise": "string", "nutrition": "string", "sleep": "string", "analysis": "string"}
    Data: ${JSON.stringify({activities, food, sleep, goals})}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return JSON.parse(response.text());
  } catch (error) {
    console.error("Gemini Error:", error);
    return null;
  }
}

export async function analyzeNutrition(foodDescription: string) {
  try {
    const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: { responseMimeType: "application/json" }
    });
    
    const prompt = `Analyze this food: "${foodDescription}". 
    Return JSON: {"name": "string", "calories": number, "protein": number, "carbs": number, "fat": number}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return JSON.parse(response.text());
  } catch (error) {
    console.error("Error analyzing nutrition:", error);
    return null;
  }
}
