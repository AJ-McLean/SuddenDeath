import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Load response templates
const responses_short = JSON.parse(fs.readFileSync(join(__dirname, '../../../../Context/responses_short.json'), 'utf-8'));
const responses_long = JSON.parse(fs.readFileSync(join(__dirname, '../../../../Context/responses_long.json'), 'utf-8'));

router.post('/evaluate-answer', async (req, res) => {
  try {
    const { question, userAnswer, expectedKeywords } = req.body;

    if (!question || !userAnswer) {
      return res.status(400).json({ error: 'Question and userAnswer are required' });
    }

    console.log(`🎯 Evaluating answer: "${userAnswer}" for question: "${question}"`);

    // Use Gemini to evaluate the answer
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    
    const evaluationPrompt = `
You are evaluating a quiz answer. Please respond with ONLY "RIGHT" or "WRONG" - no explanation, no context, just one word.

Question: "${question}"
Expected concepts/keywords: ${expectedKeywords ? JSON.stringify(expectedKeywords) : 'Not specified'}
User's answer: "${userAnswer}"

Is this answer correct? Remember: respond with only "RIGHT" or "WRONG".
    `;

    const result = await model.generateContent(evaluationPrompt);
    const evaluation = result.response.text().trim().toUpperCase();
    
    console.log(`📊 Gemini evaluation: ${evaluation}`);

    // Determine if answer is right or wrong
    const isCorrect = evaluation.includes('RIGHT');
    
    // Determine answer length (short = under 10 words, long = 10+ words)
    const wordCount = userAnswer.split(' ').length;
    const isShortAnswer = wordCount < 10;
    
    console.log(`📝 Answer length: ${wordCount} words (${isShortAnswer ? 'short' : 'long'})`);

    // Select appropriate response pool
    let responsePool;
    if (isCorrect) {
      responsePool = isShortAnswer ? responses_long.right_answer_long : responses_short.right_answer;
    } else {
      responsePool = isShortAnswer ? responses_long.wrong_answer_long : responses_short.wrong_answer;
    }

    // Pick random response from appropriate pool
    const randomResponse = responsePool[Math.floor(Math.random() * responsePool.length)];
    
    console.log(`🎭 Selected response: "${randomResponse}"`);

    // If wrong, get context/explanation from Gemini
    let explanation = null;
    if (!isCorrect) {
      console.log('❌ Answer was wrong, generating explanation...');
      
      const contextPrompt = `
The user got this question wrong:
Question: "${question}"
User's answer: "${userAnswer}"
Expected concepts: ${expectedKeywords ? JSON.stringify(expectedKeywords) : 'Not specified'}

Provide a brief, educational explanation of the correct answer in Wheatley's sarcastic Portal style. Keep it under 50 words.
      `;
      
      const contextResult = await model.generateContent(contextPrompt);
      explanation = contextResult.response.text().trim();
      console.log(`💡 Generated explanation: "${explanation}"`);
    }

    res.json({
      isCorrect,
      evaluation,
      preRecordedResponse: randomResponse,
      liveExplanation: explanation,
      answerLength: isShortAnswer ? 'short' : 'long',
      wordCount
    });

  } catch (error) {
    console.error('Error evaluating answer:', error);
    res.status(500).json({ error: 'Failed to evaluate answer' });
  }
});

// Endpoint for "thinking too long" responses
router.get('/thinking-too-long', (req, res) => {
  try {
    const responses = responses_short.thinking_for_too_long;
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    console.log(`⏰ Thinking too long response: "${randomResponse}"`);
    
    res.json({
      response: randomResponse
    });
  } catch (error) {
    console.error('Error getting thinking response:', error);
    res.status(500).json({ error: 'Failed to get thinking response' });
  }
});

export default router;