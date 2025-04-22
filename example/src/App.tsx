import { useOfflineSync } from 'react-native-offline-sync';
import { Text, View, Button, Alert } from 'react-native';

export default function App() {
  const { isOnline, enqueueRequest, queueLength } = useOfflineSync();

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

    Alert.alert(
      isOnline ? 'Sent Immediately' : 'Queued',
      `Queue Length: ${queueLength}`
    );
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 20, marginBottom: 10 }}>
        🌐 Network: {isOnline ? 'Online ✅' : 'Offline ❌'}
      </Text>
      <Text style={{ fontSize: 16, marginBottom: 20 }}>
        📦 Queue Length: {queueLength}
      </Text>
      <Button title="Send API Request" onPress={handleSend} />
    </View>
  );
}
