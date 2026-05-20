/**
 * AI Service Configuration
 * Manages different AI providers and fallback options
 */

export interface AIServiceConfig {
  provider: 'google' | 'fallback' | 'local';
  model: string;
  apiKey?: string;
  maxRetries: number;
  timeout: number;
}

export interface RateLimitSettings {
  requestsPerMinute: number;
  requestsPerHour: number;
  burstLimit: number;
}

// Rate limiting configuration based on Google AI API quotas
export const GOOGLE_AI_RATE_LIMITS: RateLimitSettings = {
  requestsPerMinute: 15,  // Conservative limit
  requestsPerHour: 900,   // Conservative limit
  burstLimit: 5
};

// Fallback configuration when Google AI is unavailable
export const FALLBACK_AI_CONFIG: AIServiceConfig = {
  provider: 'fallback',
  model: 'local-rule-based',
  maxRetries: 0,
  timeout: 1000
};

// Google AI configuration
export const GOOGLE_AI_CONFIG: AIServiceConfig = {
  provider: 'google',
  model: 'gemini-2.0-flash',
  maxRetries: 3,
  timeout: 30000
};

// Environment-based configuration
export function getAIConfig(): AIServiceConfig {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY;
  const useFallback = process.env.USE_AI_FALLBACK === 'true';
  
  if (useFallback || !apiKey) {
    console.log('Using fallback AI configuration');
    return FALLBACK_AI_CONFIG;
  }
  
  return GOOGLE_AI_CONFIG;
}

// Check if AI service is available
export function isAIServiceAvailable(): boolean {
  const config = getAIConfig();
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY;
  return config.provider === 'google' && !!apiKey;
}

// Get current rate limit status
export function getRateLimitStatus() {
  const config = getAIConfig();
  if (config.provider === 'google') {
    return {
      provider: 'Google AI',
      model: config.model,
      rateLimits: GOOGLE_AI_RATE_LIMITS,
      isAvailable: true
    };
  }
  
  return {
    provider: 'Fallback',
    model: 'Local Rule-based',
    rateLimits: { requestsPerMinute: 1000, requestsPerHour: 100000, burstLimit: 100 },
    isAvailable: true
  };
}
