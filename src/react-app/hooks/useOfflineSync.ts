import { useState, useEffect, useCallback, useRef } from 'react';

interface QueuedUpdate {
  id: string;
  updates: any;
  timestamp: number;
  retries: number;
}

interface UseOfflineSyncOptions {
  gameCode: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useOfflineSync({ gameCode, onSuccess, onError }: UseOfflineSyncOptions) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingUpdates, setPendingUpdates] = useState<QueuedUpdate[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const queueRef = useRef<QueuedUpdate[]>([]);

  // Update ref when state changes
  useEffect(() => {
    queueRef.current = pendingUpdates;
  }, [pendingUpdates]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      console.log('Connection restored - syncing pending updates');
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.log('Connection lost - queuing updates locally');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Process queue when coming back online
  useEffect(() => {
    if (isOnline && pendingUpdates.length > 0 && !isSyncing) {
      processQueue();
    }
  }, [isOnline, pendingUpdates.length]);

  const processQueue = async () => {
    if (queueRef.current.length === 0 || isSyncing) return;

    setIsSyncing(true);
    const queue = [...queueRef.current];

    // Process updates in order
    for (const item of queue) {
      try {
        await fetch(`/api/games/${gameCode}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...item.updates,
            client_timestamp: item.timestamp,
          }),
        });

        // Remove successfully synced update
        setPendingUpdates(prev => prev.filter(u => u.id !== item.id));
        onSuccess?.();
      } catch (error) {
        console.error('Failed to sync update:', error);
        
        // Retry logic
        if (item.retries < 3) {
          setPendingUpdates(prev =>
            prev.map(u =>
              u.id === item.id ? { ...u, retries: u.retries + 1 } : u
            )
          );
        } else {
          // Max retries reached, remove from queue
          console.error('Max retries reached, dropping update:', item);
          setPendingUpdates(prev => prev.filter(u => u.id !== item.id));
          onError?.(new Error('Failed to sync update after multiple retries'));
        }
      }
    }

    setIsSyncing(false);
  };

  const queueUpdate = useCallback((updates: any) => {
    const queuedUpdate: QueuedUpdate = {
      id: `${Date.now()}-${Math.random()}`,
      updates,
      timestamp: Date.now(),
      retries: 0,
    };

    setPendingUpdates(prev => [...prev, queuedUpdate]);
  }, []);

  const updateGame = useCallback(async (updates: any) => {
    const timestamp = Date.now();

    // Always try to send immediately
    try {
      const response = await fetch(`/api/games/${gameCode}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...updates,
          client_timestamp: timestamp,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update');
      }

      onSuccess?.();
      return await response.json();
    } catch (error) {
      console.log('Update failed, queuing locally:', error);
      // Queue for later sync
      queueUpdate(updates);
      onError?.(error as Error);
      
      // Return optimistic update (caller can still update UI)
      return null;
    }
  }, [gameCode, queueUpdate, onSuccess, onError]);

  return {
    updateGame,
    isOnline,
    pendingCount: pendingUpdates.length,
    isSyncing,
  };
}
