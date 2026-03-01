import express from 'express';
import { geminiService } from '../services/gemini.js';
import { loadTemplates } from '../services/templateLoader.js';
import { elevenLabs } from '../services/elevenlabs.js';

const router = express.Router();

// POST /api/generate-questions - Generate 15 questions based on topic
router.post('/generate-questions', async (req, res) => {
  try {
    const { topic } = req.body;
    
    if (!topic) {
      return res.status(400).json({
        error: 'Topic is required'
      });
    }

    console.log(`Generating 15 questions for topic: ${topic}`);

    // Load question templates
    const templates = await loadTemplates();
    
    // Create prompt for Gemini to generate 15 questions
    const prompt = `You are Wheatley from Portal 2, creating a comprehensive quiz about "${topic}".

Generate exactly 15 questions: 5 easy, 5 medium, 5 hard difficulty levels.

Use these question types from the templates:
${templates.map(t => `- ${t.id}: ${t.title}`).join('\n')}

For each question, provide:
1. template_id (from the list above)
2. difficulty (easy/medium/hard)  
3. filled_question (with {TOPIC}, {STATEMENT}, {X}, {Y}, etc. replaced with actual content)
4. expected_answer_type (brief/detailed/true_false/comparison/etc.)

Guidelines:
- Easy: Basic recall, definitions, simple facts
- Medium: Application, analysis, comparisons  
- Hard: Complex scenarios, critical thinking, problem-solving
- Mix different question types
- Make questions specific to "${topic}"
- Keep Wheatley's sarcastic, testing personality

Return as JSON array with this structure:
[
  {
    "template_id": "rapid_fire_recall",
    "difficulty": "easy", 
    "filled_question": "List the key facts about [specific aspect of ${topic}]",
    "expected_answer_type": "brief_facts"
  },
  ...
]

Generate all 15 questions now:`;

    // Send to Gemini
    const response = await geminiService.generateContent(prompt);
    
    // Parse JSON response
    let questions;
    try {
      // Extract JSON from response (in case it's wrapped in markdown)
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      const jsonText = jsonMatch ? jsonMatch[0] : response;
      questions = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Failed to parse questions JSON:', parseError);
      return res.status(500).json({
        error: 'Failed to parse generated questions',
        raw_response: response
      });
    }

    // Validate questions structure
    if (!Array.isArray(questions) || questions.length !== 15) {
      return res.status(500).json({
        error: 'Invalid questions format - expected array of 15 questions',
        received_count: questions?.length || 0
      });
    }

    // Validate each question has required fields
    const validatedQuestions = questions.map((q, index) => {
      if (!q.template_id || !q.difficulty || !q.filled_question) {
        console.warn(`Question ${index + 1} missing required fields:`, q);
      }
      
      return {
        id: index + 1,
        template_id: q.template_id || 'rapid_fire_recall',
        difficulty: q.difficulty || 'medium',
        filled_question: q.filled_question || `Question about ${topic}`,
        expected_answer_type: q.expected_answer_type || 'brief',
        topic: topic
      };
    });

    // Group by difficulty for verification
    const easy = validatedQuestions.filter(q => q.difficulty === 'easy');
    const medium = validatedQuestions.filter(q => q.difficulty === 'medium'); 
    const hard = validatedQuestions.filter(q => q.difficulty === 'hard');

    console.log(`Generated questions - Easy: ${easy.length}, Medium: ${medium.length}, Hard: ${hard.length}`);

    // Get the first question and generate TTS immediately
    const firstQuestion = validatedQuestions[0];
    const template = templates.find(t => t.id === firstQuestion.template_id);
    
    if (!template) {
      return res.status(500).json({
        error: 'Template not found for first question',
        template_id: firstQuestion.template_id
      });
    }

    // Start TTS generation for the first question's live part (don't await - return immediately)
    const ttsResult = await elevenLabs.generateSpeech(firstQuestion.filled_question);
    
    res.json({
      topic: topic,
      questions: validatedQuestions,
      firstQuestion: {
        ...firstQuestion,
        template: {
          id: template.id,
          title: template.title,
          pre_audio_url: `/api/audio/static/pre/${template.id}`,
          post_audio_url: `/api/audio/static/post/${template.id}`,
          live_tts: ttsResult
        }
      },
      summary: {
        total: validatedQuestions.length,
        easy: easy.length,
        medium: medium.length,
        hard: hard.length,
        templates_used: [...new Set(validatedQuestions.map(q => q.template_id))].length
      }
    });

  } catch (error) {
    console.error('Question generation error:', error);
    res.status(500).json({
      error: 'Failed to generate questions',
      message: error.message
    });
  }
});

// GET /api/question-templates - Get available question templates
router.get('/question-templates', async (req, res) => {
  try {
    const templates = await loadTemplates();
    
    res.json({
      templates: templates.map(t => ({
        id: t.id,
        title: t.title,
        has_placeholders: {
          topic: t.live_generated_q_wav.includes('{TOPIC}'),
          statement: t.live_generated_q_wav.includes('{STATEMENT}'),
          comparison: t.live_generated_q_wav.includes('{X}') && t.live_generated_q_wav.includes('{Y}'),
          factors: t.live_generated_q_wav.includes('{FACTOR_A}')
        }
      }))
    });
  } catch (error) {
    console.error('Template loading error:', error);
    res.status(500).json({
      error: 'Failed to load templates',
      message: error.message
    });
  }
});

export default router;