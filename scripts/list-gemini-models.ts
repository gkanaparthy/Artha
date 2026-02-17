import 'dotenv/config';
import { GoogleGenAI } from "@google/genai";

async function test() {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        console.error("API key missing");
        return;
    }

    const client = new GoogleGenAI({ apiKey });
    try {
        console.log("Listing models...");
        const response = await (client as any).models.list();
        console.log("Models:", JSON.stringify(response, null, 2));
    } catch (error: any) {
        console.error("Error listing models:", error.message);
    }
}

test();
