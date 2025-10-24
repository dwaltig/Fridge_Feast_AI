// FIX: Add missing import for React type.
import type React from 'react';
import { GoogleGenAI, Type, Chat } from "@google/genai";
import type { Meal, ChatMessage } from '../types';

// FIX: Initialize GoogleGenAI once at the module level for efficiency and to align with guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

async function fileToGenerativePart(file: File) {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
}

export async function analyzeImageForIngredients(imageFile: File): Promise<string> {
    const imagePart = await fileToGenerativePart(imageFile);
    const prompt = "Analyze this image of a refrigerator and pantry. Identify all the edible food items and ingredients visible. List them as a single, comma-separated string. For example: 'eggs, milk, cheese, bread, lettuce, tomatoes'. If no food is identifiable, return an empty string.";

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, { text: prompt }] },
    });

    return response.text.trim();
}

const getMealsSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      name: {
        type: Type.STRING,
        description: 'The name of the meal or recipe.',
      },
      description: {
        type: Type.STRING,
        description: 'A short, appealing description of the meal.',
      },
      ingredients: {
        type: Type.ARRAY,
        description: 'A list of ingredients from the provided list that are required for this meal.',
        items: {
          type: Type.STRING,
        },
      },
    },
    required: ['name', 'description', 'ingredients'],
  },
};

export async function getMealSuggestions(ingredients: string): Promise<Meal[]> {
    if (!ingredients.trim()) {
        return [];
    }
    const prompt = `Given the following ingredients: ${ingredients}, suggest 3-5 meal ideas. Focus on simple, creative recipes that primarily use these ingredients.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: getMealsSchema,
        },
    });

    try {
        // FIX: Trim whitespace from JSON response before parsing for added robustness.
        const jsonText = response.text.trim();
        const meals = JSON.parse(jsonText);
        return Array.isArray(meals) ? meals : [];
    } catch (e) {
        console.error("Failed to parse meal suggestions JSON:", e);
        return [];
    }
}

export async function getChatResponse(chatRef: React.MutableRefObject<Chat | null>, history: ChatMessage[]): Promise<string> {
    if (!chatRef.current) {
        const formattedHistory = history.slice(0, -1).map(msg => ({
            role: msg.role,
            parts: [{ text: msg.content }]
        }));

        chatRef.current = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: "You are a helpful culinary assistant and chatbot named 'Chef Gemini'. You can answer questions about recipes, cooking techniques, or anything else food-related. Keep your answers concise and friendly.",
            },
            history: formattedHistory,
        });
    }

    const lastMessage = history[history.length - 1];
    const result = await chatRef.current.sendMessage({ message: lastMessage.content });

    return result.text;
}

export async function generateImage(prompt: string): Promise<string> {
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '1:1',
        },
    });

    const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
    return `data:image/jpeg;base64,${base64ImageBytes}`;
}
