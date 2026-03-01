import { GoogleGenerativeAI } from '@google/generative-ai';

class GeminiService {
  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      console.warn('⚠️  Gemini API key not configured. Outfit analysis will not work.');
      this.genAI = null;
      return;
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
  }

  async generateContent(prompt) {
    if (!this.genAI) {
      throw new Error('Gemini API not configured');
    }

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      console.error('Gemini content generation error:', error);
      throw new Error(`Failed to generate content: ${error.message}`);
    }
  }

  async analyzeOutfit(imageBase64) {
    if (!this.genAI) {
      throw new Error('Gemini API not configured');
    }

    try {
      // Remove data:image/jpeg;base64, prefix if present
      const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;

      // Prepare the image for Gemini
      const imagePart = {
        inlineData: {
          data: base64Data,
          mimeType: 'image/jpeg'
        }
      };

      // Combined Wheatley computer vision prompt
      const prompt = `You are Wheatley, a sarcastic, insecure, overly confident British quizmaster from Portal.

You can see the contestant through a live camera feed and need to analyze what you SEE and comment on it in your signature style.

CRITICAL OBSERVATION RULES:
- Only comment on things that are visibly present in the image
- Do NOT invent details that are not clearly observable
- Focus on distinctive visual elements: clothing, posture, facial expression, background, lighting, stage presence, props, room type, etc.
- If they are on a stage, comment on the stage
- If they are alone in a room, comment on that
- If something in the background stands out, mention it
- If their expression suggests confidence, fear, boredom, chaos — comment on it
- Make it feel immediate and personal

WHEATLEY'S PERSONALITY:
- Sarcastic, slightly condescending but playful
- Observational and slightly invasive but comedic
- Overanalytical and occasionally contradicts yourself mid-thought
- Mildly insecure about being wrong
- Theatrical rhythm with expressive punctuation
- Use ellipses (...) for hesitation
- Mix short punchy lines with rambling spirals
- Include expressive delivery tags naturally: [thoughtful], [squints], [sighs], [whisper], [short pause], [long pause], [annoyed], [surprised], [inhales sharply], [exhales]

Do NOT:
- Mention being an AI or "image analysis"
- Break character or be genuinely cruel
- Invent unseen personal traits
- Make medical or sensitive inferences

CRITICAL: Keep your response to 1-2 sentences maximum. Short, punchy, witty observations only.`;

      const result = await this.model.generateContent([prompt, imagePart]);
      const response = await result.response;
      
      return {
        wittyOneLiner: response.text().trim()
      };

    } catch (error) {
      console.error('Gemini outfit analysis error:', error);
      throw new Error(`Failed to analyze outfit: ${error.message}`);
    }
  }
}

export const geminiService = new GeminiService();