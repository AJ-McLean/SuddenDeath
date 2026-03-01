import express from 'express';
import { gameLogic } from '../services/gameLogic.js';
import { elevenLabs } from '../services/elevenlabs.js';

const router = express.Router();

// POST /api/chat - Main chat endpoint
router.post('/', async (req, res) => {
  try {
    const { sessionId, message, clientMeta } = req.body;
    
    if (!sessionId || !message) {
      return res.status(400).json({
        error: 'sessionId and message are required'
      });
    }

    // Get or create game session
    const session = await gameLogic.getOrCreateSession(sessionId);
    
    // Check if this is the very first interaction (start of quiz)
    const isFirstInteraction = session.questionIndex === 0 && session.responses.length === 0;
    
    let result;
    if (isFirstInteraction) {
      // For the first message, don't process it as an answer but start the quiz
      result = {
        questionResult: 'pending',
        ended: false,
        outcome: null,
        questionIndex: 0,
        totalQuestions: session.totalQuestions
      };
    } else {
      // Process the user's response to the current question
      result = session.processResponse(message);
    }
    
    if (result.ended) {
      // Game is over
      const endMessages = session.getEndGameMessages();
      
      return res.json({
        assistantMessage: result.outcome === 'win' ? 
          "Well... I'll be honest, I didn't see that coming." :
          "Oh dear. Oh no. Well, actually, yes — I saw this coming from the very beginning.",
        sessionId,
        ended: true,
        outcome: result.outcome,
        title: endMessages.title,
        body: endMessages.body,
        logLines: endMessages.logLines,
        assistantState: 'idle',
        questionResult: result.questionResult,
        questionIndex: result.questionIndex,
        totalQuestions: result.totalQuestions
      });
    } else {
      // Get the current question (either first question or next question after processing response)
      const questionData = session.getCurrentQuestion();
      
      // DO NOT generate TTS here - violates latency masking invariant
      // Store the text for generation when /api/audio/start is called
      session.pendingDynamicText = questionData.dynamicContent;
      session.currentQuestionTemplateId = questionData.template.id;
      
      const response = {
        assistantMessage: questionData.template.pre_recorded_pre_q_wav + " " + questionData.dynamicContent,
        sessionId,
        ended: false,
        assistantState: 'thinking', // Will change when audio starts
        questionResult: result.questionResult,
        questionIndex: result.questionIndex !== undefined ? result.questionIndex : questionData.questionIndex,
        totalQuestions: questionData.totalQuestions,
        preUrl: `/api/audio/static/pre/${questionData.template.id}`,
        postUrl: `/api/audio/static/post/${questionData.template.id}`,
        startAudioEndpoint: `/api/audio/start`
      };

      return res.json(response);
    }

  } catch (error) {
    console.error('Chat endpoint error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// POST /api/chat/start - Trigger dynamic TTS generation (called when pre audio starts)
router.post('/start', async (req, res) => {
  try {
    const { sessionId, jobId } = req.body;
    
    if (!jobId) {
      return res.status(400).json({
        error: 'jobId is required'
      });
    }

    // This endpoint is called when pre-audio starts playing
    // The TTS generation should already be in progress
    // Just return the current job status
    const jobStatus = elevenLabs.getJobStatus(jobId);
    
    if (!jobStatus) {
      return res.status(404).json({
        error: 'Job not found'
      });
    }

    res.json(jobStatus);
    
  } catch (error) {
    console.error('Chat start endpoint error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

export default router;