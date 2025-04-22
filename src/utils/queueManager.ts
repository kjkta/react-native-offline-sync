import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';

const QUEUE_KEY = '@offline_request_queue';

export type QueuedRequest = AxiosRequestConfig & {
  retries?: number;
  __maxRetries?: number;
};

export const addToQueue = async (
  request: QueuedRequest,
  preventDuplicate = false
) => {
  const existing = await AsyncStorage.getItem(QUEUE_KEY);
  const queue = existing ? JSON.parse(existing) : [];

  if (preventDuplicate) {
    const isDuplicate = queue.some(
      (item: QueuedRequest) =>
        item.url === request.url &&
        item.method?.toLowerCase() === request.method?.toLowerCase() &&
        JSON.stringify(item.data) === JSON.stringify(request.data)
    );
    if (isDuplicate) {
      console.log('⚠️ Duplicate request ignored:', request.url);
      return;
    }
  }

  queue.push({ ...request, retries: 0, queuedAt: Date.now() }); // future-proofing for retries
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
      await axios(request);
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
