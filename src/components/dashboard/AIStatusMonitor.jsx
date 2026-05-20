'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, Clock, RefreshCw } from 'lucide-react';

export default function AIStatusMonitor() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/ai-status');
      if (!response.ok) {
        throw new Error('Failed to fetch AI status');
      }
      const data = await response.json();
      setStatus(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (isHealthy) => {
    return isHealthy ? (
      <CheckCircle className="h-5 w-5 text-primary" />
    ) : (
      <AlertCircle className="h-5 w-5 text-destructive" />
    );
  };

  const getStatusColor = (isHealthy) => {
    return isHealthy ? 'bg-primary/15 text-primary' : 'bg-destructive/15 text-destructive';
  };

  if (error) {
    return (
      <div className="ai-theme">
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              AI Service Monitor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive mb-4">Error: {error}</p>
            <Button onClick={fetchStatus} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="ai-theme">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-accent" />
            AI Service Monitor
          </CardTitle>
          <CardDescription>
            Real-time status of AI services and rate limiting
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-primary" />
              Loading status...
            </div>
          ) : status ? (
            <>
              {/* AI Service Status */}
              <div className="space-y-2">
                <h4 className="font-medium">AI Service Status</h4>
                <div className="flex items-center gap-2">
                  {getStatusIcon(status.ai.isReady)}
                  <Badge className={getStatusColor(status.ai.isReady)}>
                    {status.ai.isReady ? 'Available' : 'Unavailable'}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Provider: {status.ai.config.provider}
                  </span>
                </div>
              </div>

              {/* Rate Limiting Status */}
              <div className="space-y-2">
                <h4 className="font-medium">Rate Limiting</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-accent" />
                      <span className="text-sm">Per Minute</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">
                        {status.rateLimiting.tokensRemainingMinute}
                      </span>
                      <span className="text-sm text-muted-foreground">/ 15</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <span className="text-sm">Per Hour</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">
                        {status.rateLimiting.tokensRemainingHour}
                      </span>
                      <span className="text-sm text-muted-foreground">/ 900</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Queue Status */}
              <div className="space-y-2">
                <h4 className="font-medium">Request Queue</h4>
                <div className="flex items-center gap-2">
                  <span className="text-sm">Queue Length:</span>
                  <Badge variant={status.rateLimiting.queueLength > 0 ? 'secondary' : 'outline'}>
                    {status.rateLimiting.queueLength}
                  </Badge>
                  {status.rateLimiting.isProcessing && (
                    <Badge variant="default">Processing</Badge>
                  )}
                </div>
              </div>

              {/* Recommendations */}
              {status.recommendations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Recommendations</h4>
                  <div className="space-y-1">
                    {status.recommendations.map((rec, index) => (
                      <div key={index} className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Last Updated */}
              <div className="text-xs text-muted-foreground pt-2 border-t">
                Last updated: {new Date(status.timestamp).toLocaleTimeString()}
              </div>
            </>
          ) : (
            <div className="text-center text-muted-foreground py-4">
              No status information available
            </div>
          )}

          <Button 
            onClick={fetchStatus} 
            variant="outline" 
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh Status
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
