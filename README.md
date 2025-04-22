# react-native-offline-sync

[![npm version](https://img.shields.io/npm/v/@keithj/react-native-offline-sync)](https://www.npmjs.com/package/@keithj/react-native-offline-sync)

**A lightweight React Native library to queue API requests when offline and automatically sync them when the device is back online.**

## 🚀 Features

- 📡 Detects network status using `@react-native-community/netinfo`
- 📦 Queues failed or offline API requests
- 🔁 Automatically retries requests when online
- 🔄 Retry logic with max retry limit
- 🧠 Real-time queue size tracking
- 🧪 Hook-based API — no Redux required!

---

## 📦 Installation

```sh
npm install @keithj/react-native-offline-sync
```

Or with Yarn:

```sh
yarn add @keithj/react-native-offline-sync
```

You also need to install these peer dependencies:

```sh
yarn add @react-native-async-storage/async-storage @react-native-community/netinfo axios
```

---

## 🧠 Usage

```tsx
import React from 'react';
import { View, Text, Button } from 'react-native';
import { useOfflineSync } from '@keithj/react-native-offline-sync';

export default function App() {
  const { isOnline, enqueueRequest, queueLength } = useOfflineSync();

  const handleSend = () => {
    enqueueRequest({
      request: {
        url: 'https://jsonplaceholder.typicode.com/posts',
        method: 'POST',
        data: {
          title: 'Offline Test',
          body: 'This request will be queued if offline.',
        },
      },
      options: {
        maxRetries: 5,
        preventDuplicate: true, // Optional: avoid enqueueing the same request again
      },
    });
  };

  return (
    <View>
      <Text>Network: {isOnline ? 'Online ✅' : 'Offline ❌'}</Text>
      <Text>Queue Length: {queueLength}</Text>
      <Button title="Send Request" onPress={handleSend} />
    </View>
  );
}
```

> 🔁 By default, the library will retry each request up to **3 times**.  
> You can override this by passing `maxRetries` in the `options` object.

---

## 📌 Roadmap

- [x] Retry with max attempts
- [x] Queue length tracking
- [ ] Pause/resume queue
- [ ] Exponential backoff strategy
- [ ] Devtools panel (debug view)
- [ ] Configurable storage adapter

---

## 🧑‍💻 Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and development workflow.

---

## 📄 License

MIT © [Ketan Jingar](https://github.com/keith212005/react-native-offline-sync)

---

GitHub: [keithj/react-native-offline-sync](https://github.com/keith212005/react-native-offline-sync)

---

> Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
