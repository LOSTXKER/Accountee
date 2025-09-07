// src/app/api/process-receipt/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

const MODEL_NAME = "gemini-1.5-flash";
const API_KEY = process.env.GEMINI_API_KEY || "";

// Function to convert file to base64
async function fileToGenerativePart(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  return {
    inlineData: { data: buffer.toString('base64'), mimeType: file.type },
  };
}


export async function POST(req: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json({ error: 'Gemini API key not found' }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('receipt') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const generationConfig = {
      temperature: 0.1,
      topK: 32,
      topP: 1,
      maxOutputTokens: 4096,
      responseMimeType: "application/json",
    };
    
    const safetySettings = [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ];
    
    const imagePart = await fileToGenerativePart(file);

    const prompt = `
      You are an expert receipt and bank transfer slip processor for a Thai accounting app.
      Analyze the provided image and extract information into a strict JSON format.

      Follow these rules VERY carefully:
      1.  **date**: Extract the transaction date. Convert it to "YYYY-MM-DD" format. Note that the year might be in the Buddhist Era (พ.ศ.); if so, convert it to the Gregorian year (AD) by subtracting 543. For example, "03 ส.ค. 2568" becomes "2025-08-03".
      2.  **description**: Create a short, useful description.
          - First, look for a "Memo" (บันทึกช่วยจำ). If it exists and is not empty, use its value.
          - If there is no memo, use the sender's name (the "From" / "จาก" field) as the description. Format it as "โอนเงินจาก [Sender's Name]".
      3.  **totalAmount**: Find the final total amount. It MUST be a valid number. VERY IMPORTANT: Correctly parse numbers with commas as thousands separators and periods as decimal separators. For example, "23,050.00" MUST be converted to the number 23050.00, NOT 2305000.
      4.  **withholdingTax**: Find the withholding tax (ภาษีหัก ณ ที่จ่าย). If it's not present or is zero, the value must be null.

      If you cannot find a value for a field, use null for that field.
    `;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [imagePart, {text: prompt}] }],
      generationConfig,
      safetySettings,
    });
    
    const responseText = result.response.text();
    const extractedData = JSON.parse(responseText);

    return NextResponse.json(extractedData);

  } catch (error) {
    console.error('Error processing receipt:', error);
    return NextResponse.json({ error: 'Failed to process receipt' }, { status: 500 });
  }
}