import { loadTemplates, getRandomTemplate } from './templateLoader.js';

export class GameSession {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.questionIndex = 0;
    this.totalQuestions = 10;
    this.ended = false;
    this.outcome = null;
    this.currentQuestionType = null;
    this.startTime = Date.now();
    this.responses = [];
  }

  async initialize() {
    // Load templates if not already loaded
    await loadTemplates();
  }

  getCurrentQuestion() {
    // For MVP, use placeholder questions since we don't have research agent yet
    const template = getRandomTemplate();
    this.currentQuestionType = template.id;
    
    // Generate placeholder dynamic content based on template
    const dynamicContent = this.generatePlaceholderQuestion(template);
    
    return {
      template,
      dynamicContent,
      questionIndex: this.questionIndex,
      totalQuestions: this.totalQuestions
    };
  }

  generatePlaceholderQuestion(template) {
    // Placeholder content until research agent is implemented
    const placeholders = {
      'rapid_fire_recall': 'quantum mechanics',
      'definition_one_sentence': 'photosynthesis', 
      'true_or_false_with_correction': 'The speed of light is constant in all reference frames.',
      'summary_30_seconds': 'the water cycle',
      'teach_a_10_year_old': 'how gravity works',
      'compare_contrast': 'mitosis and meiosis',
      'cause_and_effect': 'climate change',
      'headline_challenge': 'artificial intelligence breakthrough',
      'problem_solving_scenario': 'a website that keeps crashing',
      'spot_the_error': 'Photosynthesis converts carbon dioxide into oxygen using chloroplasts.',
      'rank_and_justify': 'Education, Healthcare, Environment, Technology'
    };

    let dynamicText = template.live_generated_q_wav;
    
    // Replace placeholders in the template
    if (placeholders[template.id]) {
      const placeholder = placeholders[template.id];
      dynamicText = dynamicText
        .replace('{TOPIC}', placeholder)
        .replace('{STATEMENT}', placeholder)
        .replace('{X}', placeholder.split(' and ')[0] || placeholder)
        .replace('{Y}', placeholder.split(' and ')[1] || 'photosynthesis')
        .replace('{FACTOR_A}', placeholder.split(', ')[0] || 'Education')
        .replace('{FACTOR_B}', placeholder.split(', ')[1] || 'Healthcare') 
        .replace('{FACTOR_C}', placeholder.split(', ')[2] || 'Environment')
        .replace('{FACTOR_D}', placeholder.split(', ')[3] || 'Technology');
    }

    return dynamicText;
  }

  processResponse(message) {
    this.responses.push({
      questionIndex: this.questionIndex,
      questionType: this.currentQuestionType,
      response: message,
      timestamp: Date.now()
    });

    // Simple evaluation - placeholder for now
    const result = this.evaluateResponse(message);
    
    // Move to next question
    this.questionIndex++;
    
    // Check if game should end
    if (this.questionIndex >= this.totalQuestions) {
      this.ended = true;
      this.outcome = this.determineOutcome();
    }

    return {
      questionResult: result,
      ended: this.ended,
      outcome: this.outcome,
      questionIndex: this.questionIndex,
      totalQuestions: this.totalQuestions
    };
  }

  evaluateResponse(message) {
    // Placeholder evaluation logic
    // In a real implementation, this would use LLM evaluation
    if (message.length < 10) {
      return 'incorrect'; // Too short
    } else if (message.length > 200) {
      return 'incorrect'; // Too long
    } else {
      return Math.random() > 0.3 ? 'correct' : 'incorrect'; // Random for demo
    }
  }

  determineOutcome() {
    const correctAnswers = this.responses.filter(r => 
      this.evaluateResponse(r.response) === 'correct'
    ).length;
    
    return correctAnswers >= 6 ? 'win' : 'lose'; // Need 60% to win
  }

  getEndGameMessages() {
    if (this.outcome === 'win') {
      return {
        title: 'TEST COMPLETE',
        body: 'Subject has demonstrated acceptable cognitive function. Releasing from observation chamber.',
        logLines: [
          '[SYSTEM] Evaluation complete.',
          `[RESULT] Score: ${this.responses.length}/10 questions answered`,
          '[ACTION] Chamber lockdown released.'
        ]
      };
    } else {
      return {
        title: 'TEST FAILED', 
        body: 'Subject has failed to meet minimum testing requirements. Initiating recycling protocol.',
        logLines: [
          '[SYSTEM] Evaluation complete.',
          `[RESULT] Score: CATASTROPHIC FAILURE`,
          '[ACTION] Initiating disposal sequence.'
        ]
      };
    }
  }
}

export class GameLogic {
  constructor() {
    this.sessions = new Map();
  }

  async getOrCreateSession(sessionId) {
    if (!this.sessions.has(sessionId)) {
      const session = new GameSession(sessionId);
      await session.initialize();
      this.sessions.set(sessionId, session);
    }
    return this.sessions.get(sessionId);
  }

  deleteSession(sessionId) {
    this.sessions.delete(sessionId);
  }

  // Clean up old sessions
  cleanup() {
    const cutoff = Date.now() - (30 * 60 * 1000); // 30 minutes
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.startTime < cutoff) {
        this.sessions.delete(sessionId);
      }
    }
  }
}

// Create singleton instance
export const gameLogic = new GameLogic();