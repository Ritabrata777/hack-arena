// Google AI Service Status Checker
export interface AIServiceStatus {
  isAvailable: boolean;
  lastCheck: Date;
  errorCount: number;
  status: 'healthy' | 'degraded' | 'unavailable';
}

class AIServiceMonitor {
  private status: AIServiceStatus = {
    isAvailable: true,
    lastCheck: new Date(),
    errorCount: 0,
    status: 'healthy'
  };

  private readonly maxErrors = 3;
  private readonly checkInterval = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // Start monitoring
    this.startMonitoring();
  }

  private startMonitoring() {
    setInterval(() => {
      this.checkServiceHealth();
    }, this.checkInterval);
  }

  private async checkServiceHealth() {
    try {
      // Simple health check - you can implement a more sophisticated check here
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        this.updateStatus(true, 'healthy');
      } else {
        this.updateStatus(false, 'degraded');
      }
    } catch (error) {
      this.updateStatus(false, 'unavailable');
    }
  }

  private updateStatus(isAvailable: boolean, newStatus: AIServiceStatus['status']) {
    this.status.isAvailable = isAvailable;
    this.status.lastCheck = new Date();
    this.status.status = newStatus;
    
    if (!isAvailable) {
      this.status.errorCount++;
    } else {
      this.status.errorCount = 0;
    }

    console.log(`AI Service Status: ${newStatus} (${this.status.errorCount} errors)`);
  }

  public getStatus(): AIServiceStatus {
    return { ...this.status };
  }

  public recordError() {
    this.status.errorCount++;
    if (this.status.errorCount >= this.maxErrors) {
      this.status.status = 'unavailable';
      this.status.isAvailable = false;
    } else if (this.status.errorCount >= 1) {
      this.status.status = 'degraded';
    }
  }

  public shouldUseFallback(): boolean {
    return this.status.status === 'unavailable' || this.status.errorCount >= this.maxErrors;
  }
}

// Export singleton instance
export const aiServiceMonitor = new AIServiceMonitor();

// Helper function to check if fallback should be used
export const shouldUseAIFallback = (): boolean => {
  return aiServiceMonitor.shouldUseFallback();
};
