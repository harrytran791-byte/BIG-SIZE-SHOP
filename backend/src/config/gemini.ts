import { GoogleGenAI } from '@google/genai';
import { config } from './env';

export const genAI = config.gemini.apiKey
  ? new GoogleGenAI({ apiKey: config.gemini.apiKey })
  : null;
