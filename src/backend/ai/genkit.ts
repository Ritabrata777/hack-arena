import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {getAIConfig, isAIServiceAvailable} from './config';

// Create genkit instance with error handling
export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.0-flash'
  // Error handling and retry logic should be implemented outside of GenkitOptions if needed
});

// Check if AI service is available before making calls
export function isAIReady(): boolean {
  return isAIServiceAvailable();
}

// Get AI configuration for debugging
export function getAIStatus() {
  return {
    isReady: isAIReady(),
    config: getAIConfig(),
    timestamp: new Date().toISOString()
  };
}
