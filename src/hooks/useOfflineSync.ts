import { useEffect, useRef, useState, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import axios from 'axios';
import { addToQueue, processQueue, getQueue } from '../utils/queueManager';
import type { QueuedRequest } from '../utils/queueManager';

const DEFAULT_MAX_RETRIES = 3;

export const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [queueLength, setQueueLength] = useState(0);
  const syncing = useRef(false);

  const processQueueIfNotSyncing = useCallback(
    async (maxRetries = DEFAULT_MAX_RETRIES) => {
      if (syncing.current) return;
      syncing.current = true;
      await processQueue(maxRetries);
      await refreshQueueLength();
      syncing.current = false;
    },
    []
  );

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = Boolean(state.isConnected && state.isInternetReachable);
      setIsOnline(online);
      if (online) processQueueIfNotSyncing();
    });
    return () => unsubscribe();
  }, [processQueueIfNotSyncing]);

  const refreshQueueLength = async () => {
    const queue = await getQueue();
    setQueueLength(queue.length);
  };

  const enqueueRequest = async ({
    request,
    options = {},
  }: {
    request: QueuedRequest;
    options?: {
      maxRetries?: number;
      preventDuplicate?: boolean;
    };
  }) => {
    const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    const preventDuplicate = options.preventDuplicate ?? false;

    if (isOnline) {
      try {
        await axios(request);
      } catch (err) {
        console.log('Failed to send request, queueing it:', err);
        await addToQueue(
          { ...request, __maxRetries: maxRetries },
          preventDuplicate
        );
      }
    } else {
      await addToQueue(
        { ...request, __maxRetries: maxRetries },
        preventDuplicate
      );
    }

    await refreshQueueLength();
  };

  return {
    isOnline,
    enqueueRequest,
    queueLength,
  };
};
