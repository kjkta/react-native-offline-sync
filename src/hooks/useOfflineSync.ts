import { useEffect, useRef, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { processQueue } from '../utils/queueManager';
import { DEFAULT_MAX_RETRIES, QUEUE_KEY } from '../constants';

export const useOfflineSync = () => {
  const syncing = useRef(false);

  const processQueueIfNotSyncing = useCallback(
    async (maxRetries = DEFAULT_MAX_RETRIES) => {
      if (syncing.current) return;
      syncing.current = true;
      await processQueue(maxRetries);
      syncing.current = false;
    },
    []
  );

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(async (state) => {
      // Refresh queue length on any connectivity change
      const online = Boolean(state.isConnected && state.isInternetReachable);
      if (online) processQueueIfNotSyncing();
    });
    return () => unsubscribe();
  }, [processQueueIfNotSyncing]);

  return QUEUE_KEY;
};
