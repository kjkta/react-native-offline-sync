import React from 'react';
import { Text, View, Button } from 'react-native';
import { useOfflineSync, enqueueRequest } from 'react-native-offline-sync';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  const storageKey = useOfflineSync();
  const [queueLength, setQueueLength] = React.useState(0);

  const handleSend = () => {
    const request = {
      url: 'https://jsonplaceholder.typicode.com/posts',
      method: 'POST',
      data: {
        title: 'Offline Test',
        body: 'This is a test for retry and queue',
      },
    };

    enqueueRequest({
      request,
      options: {
        preventDuplicate: true,
        maxRetries: 5,
      },
    });
  };

  React.useEffect(() => {
    const getQueueLength = async () => {
      const queue = await AsyncStorage.getItem(storageKey);
      const queueLengthInt = queue ? JSON.parse(queue).length : 0;
      setQueueLength(queueLengthInt);
    };

    getQueueLength();
  }, [storageKey]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 16, marginBottom: 20 }}>
        📦 Queue Length: {queueLength}
      </Text>
      <Button title="Send API Request" onPress={handleSend} />
    </View>
  );
}
