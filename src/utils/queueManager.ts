import AsyncStorage from '@react-native-async-storage/async-storage';

import { QUEUE_KEY } from '../constants';

export type QueuedRequest = RequestInit & {
  url: string;
  callback?: (response: Response) => void;
  retries?: number;
  __maxRetries?: number;
};

export const addToQueue = async (
  request: QueuedRequest,
  callback?: (response: Response) => void,
  preventDuplicate = false
) => {
  const existing = await AsyncStorage.getItem(QUEUE_KEY);
  const queue = existing ? JSON.parse(existing) : [];

  if (preventDuplicate) {
    const isDuplicate = queue.some(
      (item: QueuedRequest) =>
        item.url === request.url &&
        item.method?.toLowerCase() === request.method?.toLowerCase() &&
        JSON.stringify(item.body) === JSON.stringify(request.body)
    );
    if (isDuplicate) {
      console.log('⚠️ Duplicate request ignored:', request.url);
      return;
    }
  }

  queue.push({ ...request, callback, retries: 0, queuedAt: Date.now() }); // future-proofing for retries
  console.log('📥 Queuing request:', request);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
};

export const getQueue = async (): Promise<QueuedRequest[]> => {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
};

export const setQueue = async (queue: QueuedRequest[]) => {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
};

export const processQueue = async (maxRetries: number = 0): Promise<void> => {
  const queue = await getQueue();
  const remainingQueue: QueuedRequest[] = [];

  for (const request of queue) {
    const retries = request.retries ?? 0;
    const requestMaxRetries = request.__maxRetries ?? maxRetries;
    console.log(
      `🔁 Processing request to ${request.url}, retry #${retries + 1}/${requestMaxRetries}`
    );

    try {
      const { url, callback, ...fetchOptions } = request;
      const response = await fetch(url, fetchOptions);
      if (callback) callback(response);
    } catch (err) {
      console.log(`Retry #${retries + 1} failed for ${request.url}`);

      if (retries + 1 < requestMaxRetries) {
        remainingQueue.push({
          ...request,
          retries: retries + 1,
        });
      } else {
        console.log('❌ Dropping request after max retries:', request.url);
      }
    }
  }

  await setQueue(remainingQueue);
};

export const enqueueRequest = async ({
  request,
  callback,
  options = {},
}: {
  request: QueuedRequest;
  callback?: (response: Response) => void;
  options?: {
    maxRetries?: number;
    preventDuplicate?: boolean;
  };
}): Promise<Response> => {
  const maxRetries = options.maxRetries ?? 3;
  const preventDuplicate = options.preventDuplicate ?? false;

  // Attempt to send the request immediately, queue if it fails
  try {
    const { url, ...fetchOptions } = request;
    const req = await fetch(url, fetchOptions);
    if (callback) callback(req);
    if (req.ok) {
      return req;
    } else {
      throw req;
    }
  } catch (err) {
    console.log('Failed to send request, queueing it:', err);
    await addToQueue(
      { ...request, __maxRetries: maxRetries },
      callback,
      preventDuplicate
    );
    return {
      ok: false,
    } as Response;
  }
};
