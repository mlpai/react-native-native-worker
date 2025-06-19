# react-native-native-worker

A React Native native module for running heavy processing tasks on background threads with concurrent task queue management.

## Features

- ✅ **Background Thread Processing**: Uses `HandlerThread` on Android and `DispatchQueue.global` on iOS
- ✅ **Concurrent Task Queue**: Thread-safe task management with `ConcurrentLinkedQueue` (Android) and serial queues (iOS)
- ✅ **Task Cancellation**: Cancel individual tasks or all pending tasks
- ✅ **Event-Based Results**: Receive results via `RCTEventEmitter` with `onWorkerMessage` events
- ✅ **TypeScript Support**: Full TypeScript definitions included
- ✅ **Cross-Platform**: Works on both iOS and Android
- ✅ **Production Ready**: Clean, modular code with proper error handling
- ✅ **No Third-Party Dependencies**: Uses only React Native and native platform APIs

## Installation

### npm

```bash
npm install react-native-native-worker
```

### Yarn

```bash
yarn add react-native-native-worker
```

**Note:** This package uses peer dependencies for React and React Native, so make sure your project already has these installed. The package is compatible with React Native >= 0.60.0 and React >= 16.8.0.

### iOS Setup

```bash
cd ios && pod install && cd ..
```

#### Ensure Swift Support

Make sure your iOS project has Swift support enabled. If you're getting Swift-related errors:

1. Open `ios/YourProject.xcworkspace` in Xcode
2. Add a new Swift file to your project (File → New → File → Swift File)
3. When prompted, choose "Create Bridging Header"
4. You can delete the Swift file after this step

### Android Setup

#### Enable Kotlin Support (if needed)

Ensure your `android/build.gradle` file includes Kotlin support:

```gradle
buildscript {
    ext {
        buildToolsVersion = "33.0.0"
        minSdkVersion = 21
        compileSdkVersion = 33
        targetSdkVersion = 33
        kotlinVersion = "1.8.0"  // Add this line if not present
    }
    dependencies {
        classpath("com.android.tools.build:gradle:7.3.1")
        classpath("com.facebook.react:react-native-gradle-plugin")
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlinVersion") // Add this line if not present
    }
}
```

#### Manual Registration (React Native < 0.60 only)

If you're using React Native < 0.60, manually register the module:

```java
// MainApplication.java
import com.nativeworker.NativeWorkerPackage;

@Override
protected List<ReactPackage> getPackages() {
    return Arrays.<ReactPackage>asList(
        new MainReactPackage(),
        new NativeWorkerPackage() // Add this line
    );
}
```

## Quick Start

Here's a simple example to get you started:

```typescript
import React, { useEffect, useState } from "react";
import { View, Text, Button, Alert } from "react-native";
import NativeWorker, { WorkerResult } from "react-native-native-worker";

const App: React.FC = () => {
  const [result, setResult] = useState<string>("");

  useEffect(() => {
    // Set up event listener for worker results
    const cleanup = NativeWorker.onWorkerMessage((result: WorkerResult) => {
      if (result.error) {
        Alert.alert("Error", result.error);
      } else {
        setResult(`Result: ${result.result}\nTime: ${result.processingTime}ms`);
      }
    });

    return cleanup;
  }, []);

  const handleWork = async () => {
    try {
      const taskId = await NativeWorker.postMessage("Hello Native Worker!");
      console.log("Task queued with ID:", taskId);
    } catch (error) {
      Alert.alert("Error", `Failed to post message: ${error}`);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 18, marginBottom: 20 }}>Native Worker Demo</Text>
      <Button title="Start Background Task" onPress={handleWork} />
      <Text style={{ marginTop: 20, fontSize: 16 }}>{result}</Text>
    </View>
  );
};

export default App;
```

## Complete Example

Here's a full-featured example that demonstrates all capabilities:

```typescript
// NativeWorkerExample.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import NativeWorker, { WorkerResult } from "react-native-native-worker";

interface TaskResult {
  id: string;
  input: string;
  output: string;
  processingTime: number;
  timestamp: number;
}

const NativeWorkerExample: React.FC = () => {
  const [inputText, setInputText] = useState<string>("Hello Native Worker!");
  const [results, setResults] = useState<TaskResult[]>([]);
  const [queueSize, setQueueSize] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  useEffect(() => {
    // Set up event listener for worker results
    const cleanup = NativeWorker.onWorkerMessage((result: WorkerResult) => {
      console.log("Worker result received:", result);

      if (result.error) {
        console.error("Worker error:", result.error);
        Alert.alert("Processing Error", result.error);
      } else {
        setResults((prev) => [
          {
            id: result.taskId,
            input: inputText,
            output: result.result,
            processingTime: result.processingTime,
            timestamp: result.timestamp,
          },
          ...prev,
        ]);
      }

      updateStatus();
    });

    updateStatus();
    return cleanup;
  }, []);

  const updateStatus = async () => {
    try {
      const [queue, processing] = await Promise.all([
        NativeWorker.getQueueSize(),
        NativeWorker.isProcessing(),
      ]);
      setQueueSize(queue);
      setIsProcessing(processing);
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const handlePostMessage = async () => {
    if (!inputText.trim()) return;

    try {
      const taskId = await NativeWorker.postMessage(inputText);
      console.log("Task posted with ID:", taskId);
      updateStatus();
    } catch (error) {
      console.error("Failed to post message:", error);
      Alert.alert("Error", `Failed to post message: ${error}`);
    }
  };

  const handlePostMultipleMessages = async () => {
    const messages = ["Task 1", "Task 2", "Task 3", "Task 4", "Task 5"];

    try {
      await Promise.all(
        messages.map((message) => NativeWorker.postMessage(message))
      );
      console.log("Multiple tasks posted");
      updateStatus();
    } catch (error) {
      console.error("Failed to post multiple messages:", error);
    }
  };

  const handleCancelAllTasks = async () => {
    try {
      const cancelledCount = await NativeWorker.cancelAllTasks();
      console.log(`Cancelled ${cancelledCount} tasks`);
      updateStatus();
    } catch (error) {
      console.error("Failed to cancel all tasks:", error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Native Worker Example</Text>

      {/* Status */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>Queue Size: {queueSize}</Text>
        <Text style={styles.statusText}>
          Processing: {isProcessing ? "Yes" : "No"}
        </Text>
      </View>

      {/* Input */}
      <TextInput
        style={styles.textInput}
        value={inputText}
        onChangeText={setInputText}
        placeholder="Enter message to process..."
      />

      {/* Buttons */}
      <TouchableOpacity style={styles.button} onPress={handlePostMessage}>
        <Text style={styles.buttonText}>Post Message</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={handlePostMultipleMessages}
      >
        <Text style={styles.buttonText}>Post 5 Messages</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={handleCancelAllTasks}
      >
        <Text style={styles.buttonText}>Cancel All Tasks</Text>
      </TouchableOpacity>

      {/* Results */}
      <Text style={styles.resultsTitle}>Results ({results.length})</Text>
      {results.map((result, index) => (
        <View key={index} style={styles.resultItem}>
          <Text style={styles.resultText}>Input: {result.input}</Text>
          <Text style={styles.resultText}>Output: {result.output}</Text>
          <Text style={styles.resultText}>
            Time: {result.processingTime.toFixed(2)}ms
          </Text>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  statusContainer: {
    backgroundColor: "#f0f0f0",
    padding: 10,
    borderRadius: 5,
    marginBottom: 20,
  },
  statusText: {
    fontSize: 16,
    marginBottom: 5,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 5,
    marginBottom: 10,
  },
  cancelButton: {
    backgroundColor: "#FF3B30",
    padding: 15,
    borderRadius: 5,
    marginBottom: 20,
  },

  buttonText: {
    color: "white",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "bold",
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  resultItem: {
    backgroundColor: "#f9f9f9",
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  resultText: {
    fontSize: 14,
    marginBottom: 2,
  },
});

export default NativeWorkerExample;
```

## Custom Hook

Create a reusable hook for the Native Worker:

```typescript
// useNativeWorker.ts
import { useEffect, useState } from "react";
import NativeWorker, { WorkerResult } from "react-native-native-worker";

export const useNativeWorker = () => {
  const [results, setResults] = useState<WorkerResult[]>([]);
  const [queueSize, setQueueSize] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const cleanup = NativeWorker.onWorkerMessage((result) => {
      setResults((prev) => [result, ...prev]);
      updateStatus();
    });

    updateStatus();
    return cleanup;
  }, []);

  const updateStatus = async () => {
    const [queue, processing] = await Promise.all([
      NativeWorker.getQueueSize(),
      NativeWorker.isProcessing(),
    ]);
    setQueueSize(queue);
    setIsProcessing(processing);
  };

  const postMessage = async (message: string) => {
    const taskId = await NativeWorker.postMessage(message);
    updateStatus();
    return taskId;
  };

  return {
    results,
    queueSize,
    isProcessing,
    postMessage,
    cancelAllTasks: NativeWorker.cancelAllTasks,
    updateStatus,
  };
};
```

## API Reference

### Methods

#### `postMessage(message: string, taskId?: string): Promise<string>`

Posts a message to the native worker for background processing.

**Parameters:**

- `message`: The message/data to process
- `taskId` (optional): Unique task identifier for cancellation

**Returns:** Promise that resolves to the task ID

#### `cancelTask(taskId: string): Promise<boolean>`

Cancels a specific task by ID.

**Parameters:**

- `taskId`: The task ID to cancel

**Returns:** Promise that resolves to `true` if task was cancelled, `false` if not found

#### `cancelAllTasks(): Promise<number>`

Cancels all pending tasks.

**Returns:** Promise that resolves to the number of tasks cancelled

#### `getQueueSize(): Promise<number>`

Gets the current queue size.

**Returns:** Promise that resolves to the number of pending tasks

#### `isProcessing(): Promise<boolean>`

Checks if the worker is currently processing tasks.

**Returns:** Promise that resolves to `true` if actively processing

#### `onWorkerMessage(listener: (result: WorkerResult) => void): () => void`

Convenience method to listen for worker results with automatic cleanup.

**Parameters:**

- `listener`: Callback function to handle worker results

**Returns:** Function to call for cleanup

### Types

#### `WorkerResult`

```typescript
interface WorkerResult {
  taskId: string;
  result: string;
  processingTime: number;
  timestamp: number;
  error?: string; // Present if processing failed
}
```

#### `WorkerTask`

```typescript
interface WorkerTask {
  id: string;
  message: string;
  timestamp: number;
}
```

### Events

#### `onWorkerMessage`

Emitted when a background task completes (successfully or with error).

**Event Data:** `WorkerResult` object

## Platform Implementation Details

### Android (Kotlin)

- Uses `HandlerThread` for background processing
- `ConcurrentLinkedQueue` for thread-safe task management
- Continuous polling loop with configurable delay
- Atomic variables for thread-safe state management

### iOS (Swift)

- Uses `DispatchQueue.global(qos: .userInitiated)` for background processing
- Serial `DispatchQueue` for thread-safe access to shared resources
- Timer-based processing loop
- Proper memory management with weak references

## Performance Considerations

- **Task Processing**: Each task includes a simulated 100ms processing delay
- **Queue Polling**: 10ms polling interval to balance responsiveness and CPU usage
- **Memory Management**: Automatic cleanup of completed and cancelled tasks
- **Thread Safety**: All shared resources are properly synchronized

## Build and Test

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

The test suite includes comprehensive unit tests covering:

- All native module methods and error scenarios
- Event handling and cleanup
- Integration workflows and batch operations
- TypeScript interface validation
- Edge cases and performance scenarios

Current test coverage: 70%+ statements, 27 test cases.

See `__tests__/README.md` for detailed test documentation.

### Clean and Rebuild

```bash
# Clean the project
npx react-native clean

# For iOS
cd ios
rm -rf build
pod install
cd ..
npx react-native run-ios

# For Android
cd android
./gradlew clean
cd ..
npx react-native run-android
```

## Troubleshooting

### Common Issues

#### 1. "Native module not found" error

**Solution:**

- Ensure you've run `pod install` for iOS
- Clean and rebuild your project
- Check that autolinking is working (React Native >= 0.60)

#### 2. Swift compilation errors on iOS

**Solution:**

- Make sure your project has Swift support enabled
- Add an empty Swift file to your project to create a bridging header
- Verify Xcode is up to date

#### 3. Kotlin compilation errors on Android

**Solution:**

- Add Kotlin support to your `android/build.gradle`
- Clean and rebuild the Android project
- Check that your Android SDK is up to date

#### 4. "Unable to load script" errors

**Solution:**

- Run `npx react-native start --reset-cache`
- Clear Metro cache: `npx react-native start --reset-cache`

### Performance Issues

- Monitor queue size to avoid excessive task accumulation
- Cancel unnecessary tasks to free up processing resources
- Consider implementing task prioritization for your use case

## Example Integration

To add the Native Worker to your existing React Native app:

```typescript
import NativeWorker from "react-native-native-worker";

// In your component
const handleHeavyWork = async () => {
  const taskId = await NativeWorker.postMessage("Heavy computation data");
  console.log("Task queued:", taskId);
};

// Listen for results
useEffect(() => {
  const cleanup = NativeWorker.onWorkerMessage((result) => {
    console.log("Work completed:", result.result);
  });
  return cleanup;
}, []);
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Changelog

### 1.0.0

- Initial release
- Cross-platform background task processing
- Task cancellation support
- TypeScript definitions
- Complete documentation and examples
