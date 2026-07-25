import { useEffect, useRef, useState, useCallback } from 'react';
import { config } from '@/lib/config';
import { generateMockSSEReadings, generateMockSSEAlert } from '@/lib/mock-data';
import { WeatherReading, Alert } from '@/types';

interface UseSSEOptions {
  enabled?: boolean;
  onError?: (error: Error) => void;
}

export const useSSEStream = <T,>(
  endpoint: string,
  onMessage: (data: T) => void,
  options: UseSSEOptions = {}
) => {
  const { enabled = true, onError } = options;
  const eventSourceRef = useRef<EventSource | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const mockIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!enabled || config.mode !== 'production') {
      // Mock mode: generate fake data at intervals. In `production` mode
      // we always connect to the real SSE endpoint and surface errors;
      // demo + test both fall back to the synthetic generator.
      setIsConnected(true);
      mockIntervalRef.current = setInterval(() => {
        const mockData = endpoint.includes('readings') ? generateMockSSEReadings() : generateMockSSEAlert();
        onMessage(mockData as T);
      }, 2000);
      return;
    }

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('weather_station_auth_token') : null;
      const url = token ? `${config.apiUrl}${endpoint}?token=${token}` : `${config.apiUrl}${endpoint}`;
      
      const eventSource = new EventSource(url);

      eventSource.onopen = () => {
        setIsConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data as T);
        } catch (error) {
          console.error('Failed to parse SSE message:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        setIsConnected(false);
        eventSource.close();
        
        // Attempt to reconnect after delay
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 5000);

        if (onError) {
          onError(new Error('SSE connection failed'));
        }
      };

      eventSourceRef.current = eventSource;
    } catch (error) {
      console.error('Failed to establish SSE connection:', error);
      if (onError && error instanceof Error) {
        onError(error);
      }
    }
  }, [endpoint, enabled, onMessage, onError]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (mockIntervalRef.current) {
      clearInterval(mockIntervalRef.current);
      mockIntervalRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const pause = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (mockIntervalRef.current) {
      clearInterval(mockIntervalRef.current);
      mockIntervalRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const resume = useCallback(() => {
    if (!isConnected) {
      connect();
    }
  }, [isConnected, connect]);

  useEffect(() => {
    if (enabled) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    isConnected,
    disconnect,
    pause,
    resume,
  };
};

// Specific hook for live readings
export const useLiveReadings = (stationId: string, onReading: (reading: WeatherReading) => void) => {
  return useSSEStream<WeatherReading>(
    `/readings/stream?stationId=${stationId}`,
    onReading,
    { enabled: true }
  );
};

// Specific hook for live alerts
export const useLiveAlerts = (stationId: string, onAlert: (alert: Alert) => void) => {
  return useSSEStream<Alert>(
    `/alerts/stream?stationId=${stationId}`,
    onAlert,
    { enabled: true }
  );
};
