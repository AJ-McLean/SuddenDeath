import crypto from 'crypto';

export function createHash(text, voice, model, format) {
  const content = JSON.stringify({ text, voice, model, format });
  return crypto.createHash('sha256').update(content).digest('hex');
}

export function generateJobId() {
  return crypto.randomBytes(16).toString('hex');
}