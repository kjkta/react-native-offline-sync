import AsyncStorage from '@react-native-async-storage/async-storage';

import { QUEUE_KEY } from '../constants';

type CallbackFunction = (response: Response, retries: number) => void;

export type QueuedRequest = RequestInit & {
  url: string;
  callback?: CallbackFunction;
  retries?: number;
  __maxRetries?: number;
};

export const addToQueue = async (
  request: QueuedRequest,
  callback?: CallbackFunction,
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

    const { url, callback, ...fetchOptions } = request;

    try {
      const response = await fetch(url, fetchOptions);
      if (response.ok) {
        if (callback) callback(response, retries + 1);
      } else {
        throw response;
      }
    } catch (err: any) {
      console.log(`Retry #${retries + 1} failed for ${request.url}`);

      if (callback) callback(err, retries + 1);
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
  callback?: CallbackFunction;
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
    if (req.ok) {
      if (callback) callback(req, 0);
      return req;
    } else {
      throw req;
    }
  } catch (err: any) {
    console.log('Failed to send request, queueing it:', err);

    if (callback) callback(err, 0);

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
