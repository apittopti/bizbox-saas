'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { PlatformMetrics, SystemHealth, SystemAlert } from '@/types/admin';

interface RealtimeData {
  metrics?: PlatformMetrics;
  systemHealth?: SystemHealth;
  alerts?: SystemAlert[];
  timestamp: Date;
}

interface WebSocketMessage {
  type: 'metrics' | 'system_health' | 'alert' | 'ping' | 'error';
  data?: any;
  timestamp: string;
}

export function useRealtimeMetrics() {
  const [data, setData] = useState<RealtimeData | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionStatus('connecting');
    setError(null);

    // Determine WebSocket URL based on current location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/super-admin/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WebSocket] Connected to super admin metrics stream');
        setConnectionStatus('connected');
        setError(null);
        reconnectAttemptsRef.current = 0;
        
        // Send authentication if needed
        ws.send(JSON.stringify({
          type: 'auth',
          token: 'admin-token', // TODO: Get from auth context
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          switch (message.type) {
            case 'metrics':
              setData(prev => ({
                ...prev,
                metrics: message.data,
                timestamp: new Date(message.timestamp),
              }));
              break;
              
            case 'system_health':
              setData(prev => ({
                ...prev,
                systemHealth: message.data,
                timestamp: new Date(message.timestamp),
              }));
              break;
              
            case 'alert':
              setData(prev => ({
                ...prev,
                alerts: prev?.alerts ? [...prev.alerts, message.data] : [message.data],
                timestamp: new Date(message.timestamp),
              }));
              break;
              
            case 'ping':
              // Send pong response
              ws.send(JSON.stringify({ type: 'pong' }));
              break;
              
            case 'error':
              console.error('[WebSocket] Server error:', message.data);
              setError(message.data?.message || 'Server error');
              break;
              
            default:
              console.warn('[WebSocket] Unknown message type:', message.type);
          }
        } catch (error) {
          console.error('[WebSocket] Failed to parse message:', error);
          setError('Failed to parse server message');
        }
      };

      ws.onclose = (event) => {
        console.log('[WebSocket] Connection closed:', event.code, event.reason);
        setConnectionStatus('disconnected');
        wsRef.current = null;
        
        // Attempt to reconnect unless it was a clean close
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.pow(2, reconnectAttemptsRef.current) * 1000; // Exponential backoff
          console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setError('Maximum reconnection attempts reached');
          setConnectionStatus('error');
        }
      };

      ws.onerror = (event) => {
        console.error('[WebSocket] Connection error:', event);
        setConnectionStatus('error');
        setError('WebSocket connection error');
      };
      
    } catch (error) {
      console.error('[WebSocket] Failed to create connection:', error);
      setConnectionStatus('error');
      setError(`Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Disconnecting');
      wsRef.current = null;
    }
    
    setConnectionStatus('disconnected');
    reconnectAttemptsRef.current = 0;
  }, []);

  const retry = useCallback(() => {
    disconnect();
    reconnectAttemptsRef.current = 0;
    setTimeout(connect, 1000);
  }, [connect, disconnect]);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return {
    data,
    connectionStatus,
    error,
    retry,
    connect,
    disconnect,
  };
}

export function useSystemAlerts() {
  const { data } = useRealtimeMetrics();
  
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState<Set<string>>(new Set());
  
  const acknowledgeAlert = useCallback(async (alertId: string) => {
    try {
      // TODO: Call API to acknowledge alert
      console.log(`Acknowledging alert ${alertId}`);
      
      setAcknowledgedAlerts(prev => new Set([...prev, alertId]));
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  }, []);
  
  const unacknowledgedAlerts = data?.alerts?.filter(
    alert => !acknowledgedAlerts.has(alert.id) && !alert.acknowledged
  ) || [];
  
  return {
    alerts: data?.alerts || [],
    unacknowledgedAlerts,
    acknowledgeAlert,
  };
}

export function usePlatformMetrics() {
  const { data, connectionStatus } = useRealtimeMetrics();
  
  const [previousMetrics, setPreviousMetrics] = useState<PlatformMetrics | null>(null);
  
  useEffect(() => {
    if (data?.metrics && data.metrics !== previousMetrics) {
      setPreviousMetrics(data.metrics);
    }
  }, [data?.metrics, previousMetrics]);
  
  return {
    metrics: data?.metrics,
    previousMetrics,
    isConnected: connectionStatus === 'connected',
    lastUpdated: data?.timestamp,
  };
}

export function useSystemHealth() {
  const { data, connectionStatus } = useRealtimeMetrics();
  
  return {
    systemHealth: data?.systemHealth,
    isConnected: connectionStatus === 'connected',
    lastUpdated: data?.timestamp,
  };
}