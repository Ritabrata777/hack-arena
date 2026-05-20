import { NextResponse } from 'next/server';
import { getAIStatus } from '@/backend/ai/genkit';
import { aiRateLimiter } from '@/backend/ai/rate-limiter';

export async function GET() {
  try {
    const aiStatus = getAIStatus();
    const rateLimitStatus = aiRateLimiter.getStatus();
    
    const response = {
      timestamp: new Date().toISOString(),
      ai: aiStatus,
      rateLimiting: rateLimitStatus,
      recommendations: []
    };

    // Add recommendations based on current status
    if (rateLimitStatus.tokensRemainingMinute < 3) {
      response.recommendations.push('Rate limit nearly reached. Consider reducing AI requests.');
    }
    
    if (rateLimitStatus.queueLength > 5) {
      response.recommendations.push('High request queue. Consider implementing request batching.');
    }
    
    if (!aiStatus.isReady) {
      response.recommendations.push('AI service not available. Check API key and quota limits.');
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error checking AI status:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check AI status',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
