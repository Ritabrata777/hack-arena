/**
 * Rate limiter utility for Google AI API calls
 * Implements token bucket algorithm with exponential backoff
 */

export interface RateLimitConfig {
  maxRequestsPerMinute: number;
  maxRequestsPerHour: number;
  retryAttempts: number;
  baseDelay: number;
  maxDelay: number;
}

export class AIRateLimiter {
  private tokensPerMinute: number;
  private tokensPerHour: number;
  private lastRefillMinute: number;
  private lastRefillHour: number;
  private currentTokensMinute: number;
  private currentTokensHour: number;
  private retryAttempts: number;
  private baseDelay: number;
  private maxDelay: number;
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessing = false;

  constructor(config: RateLimitConfig) {
    this.tokensPerMinute = config.maxRequestsPerMinute;
    this.tokensPerHour = config.maxRequestsPerHour;
    this.retryAttempts = config.retryAttempts;
    this.baseDelay = config.baseDelay;
    this.maxDelay = config.maxDelay;
    
    this.lastRefillMinute = Date.now();
    this.lastRefillHour = Date.now();
    this.currentTokensMinute = this.tokensPerMinute;
    this.currentTokensHour = this.tokensPerHour;
    
    // Refill tokens every minute and hour
    setInterval(() => this.refillTokens(), 60000); // Every minute
    setInterval(() => this.refillHourlyTokens(), 3600000); // Every hour
  }

  private refillTokens(): void {
    const now = Date.now();
    const timePassed = now - this.lastRefillMinute;
    const tokensToAdd = Math.floor(timePassed / 60000) * this.tokensPerMinute;
    
    this.currentTokensMinute = Math.min(this.tokensPerMinute, this.currentTokensMinute + tokensToAdd);
    this.lastRefillMinute = now;
  }

  private refillHourlyTokens(): void {
    const now = Date.now();
    const timePassed = now - this.lastRefillHour;
    const tokensToAdd = Math.floor(timePassed / 3600000) * this.tokensPerHour;
    
    this.currentTokensHour = Math.min(this.tokensPerHour, this.currentTokensHour + tokensToAdd);
    this.lastRefillHour = now;
  }

  private async waitForTokens(): Promise<void> {
    while (this.currentTokensMinute <= 0 || this.currentTokensHour <= 0) {
      const delay = Math.min(
        this.maxDelay,
        this.baseDelay * Math.pow(2, Math.min(this.retryAttempts, 5))
      );
      await new Promise(resolve => setTimeout(resolve, delay));
      this.refillTokens();
      this.refillHourlyTokens();
    }
  }

  private consumeTokens(): void {
    this.currentTokensMinute--;
    this.currentTokensHour--;
  }

  public async executeWithRateLimit<T>(
    operation: () => Promise<T>,
    operationName: string = 'AI operation'
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          await this.waitForTokens();
          this.consumeTokens();
          
          console.log(`Executing ${operationName} - Tokens remaining: ${this.currentTokensMinute}/min, ${this.currentTokensHour}/hour`);
          
          const result = await operation();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    
    while (this.requestQueue.length > 0) {
      const operation = this.requestQueue.shift();
      if (operation) {
        try {
          await operation();
        } catch (error) {
          console.error('Error in rate-limited operation:', error);
        }
      }
    }
    
    this.isProcessing = false;
  }

  public getStatus() {
    return {
      tokensRemainingMinute: this.currentTokensMinute,
      tokensRemainingHour: this.currentTokensHour,
      queueLength: this.requestQueue.length,
      isProcessing: this.isProcessing
    };
  }
}

// Default configuration for Google AI API
export const defaultRateLimitConfig: RateLimitConfig = {
  maxRequestsPerMinute: 15, // Conservative limit to stay well under quota
  maxRequestsPerHour: 900,  // Conservative hourly limit
  retryAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000  // 30 seconds
};

// Export singleton instance
export const aiRateLimiter = new AIRateLimiter(defaultRateLimitConfig);
