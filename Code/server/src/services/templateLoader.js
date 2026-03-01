import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_PATH = join(__dirname, '../../../../Context/templates.mjs');

let templatesCache = null;

export async function loadTemplates() {
  if (templatesCache) {
    return templatesCache;
  }

  try {
    const fileContent = await readFile(TEMPLATES_PATH, 'utf-8');
    
    // Simple parsing - extract the TEMPLATES array
    // This is a bit hacky but works for the current format
    const templateMatch = fileContent.match(/export const TEMPLATES = (\[[\s\S]*?\]);/);
    if (!templateMatch) {
      throw new Error('Could not parse templates from templates.mjs');
    }
    
    // Use eval to parse the array (safe since we control the file)
    const templates = eval(templateMatch[1]);
    
    templatesCache = templates;
    return templates;
  } catch (error) {
    console.error('Failed to load templates:', error);
    throw new Error(`Could not load templates: ${error.message}`);
  }
}

export function getTemplateById(id) {
  if (!templatesCache) {
    throw new Error('Templates not loaded. Call loadTemplates() first.');
  }
  
  return templatesCache.find(template => template.id === id);
}

export function getAllTemplateIds() {
  if (!templatesCache) {
    throw new Error('Templates not loaded. Call loadTemplates() first.');
  }
  
  return templatesCache.map(template => template.id);
}

export function getRandomTemplate() {
  if (!templatesCache) {
    throw new Error('Templates not loaded. Call loadTemplates() first.');
  }
  
  const randomIndex = Math.floor(Math.random() * templatesCache.length);
  return templatesCache[randomIndex];
}