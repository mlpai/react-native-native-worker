import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// Note: In a real app, you would import from 'react-native-native-worker'
// We import from local source since this example is part of the same package
import NativeWorker, { WorkerResult } from "../src/NativeWorker";

interface TaskResult {
  id: string;
  input: string;
  output: string;
  processingTime: number;
  timestamp: number;
}

const App: React.FC = () => {
  const [inputText, setInputText] = useState<string>("Hello Native Worker!");
  const [results, setResults] = useState<TaskResult[]>([]);
  const [queueSize, setQueueSize] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [activeTasks, setActiveTasks] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Set up event listener for worker results
    const cleanup = NativeWorker.onWorkerMessage((result: WorkerResult) => {
      console.log("Worker result received:", result);

      if (result.error) {
        console.error("Worker error:", result.error);
        setResults((prev) => [
          ...prev,
          {
            id: result.taskId,
            input: "Error",
            output: `Error: ${result.error}`,
            processingTime: 0,
            timestamp: result.timestamp,
          },
        ]);
      } else {
        setResults((prev) => [
          ...prev,
          {
            id: result.taskId,
            input: inputText,
            output: result.result,
            processingTime: result.processingTime,
            timestamp: result.timestamp,
          },
        ]);
      }

      // Remove from active tasks
      setActiveTasks((prev) => {
        const newSet = new Set(prev);
        newSet.delete(result.taskId);
        return newSet;
      });

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

      setActiveTasks((prev) => new Set(prev).add(taskId));
      updateStatus();
    } catch (error) {
      console.error("Failed to post message:", error);
    }
  };

  const handlePostMultipleMessages = async () => {
    const messages = [
      "First message",
      "Second message",
      "Third message",
      "Fourth message",
      "Fifth message",
    ];

    try {
      const taskIds = await Promise.all(
        messages.map((message) => NativeWorker.postMessage(message))
      );

      taskIds.forEach((taskId) => {
        setActiveTasks((prev) => new Set(prev).add(taskId));
      });

      console.log("Multiple tasks posted:", taskIds);
      updateStatus();
    } catch (error) {
      console.error("Failed to post multiple messages:", error);
    }
  };

  const handleCancelAllTasks = async () => {
    try {
      const cancelledCount = await NativeWorker.cancelAllTasks();
      console.log(`Cancelled ${cancelledCount} tasks`);
      setActiveTasks(new Set());
      updateStatus();
    } catch (error) {
      console.error("Failed to cancel all tasks:", error);
    }
  };

  const handleClearResults = () => {
    setResults([]);
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={styles.scrollView}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>React Native Native Worker</Text>
          <Text style={styles.subtitle}>Background Task Processing Demo</Text>
        </View>

        {/* Status */}
        <View style={styles.statusContainer}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Queue Size:</Text>
            <Text style={styles.statusValue}>{queueSize}</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Processing:</Text>
            <Text
              style={[
                styles.statusValue,
                { color: isProcessing ? "#007AFF" : "#8E8E93" },
              ]}
            >
              {isProcessing ? "Yes" : "No"}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Active Tasks:</Text>
            <Text style={styles.statusValue}>{activeTasks.size}</Text>
          </View>
        </View>

        {/* Input Section */}
        <View style={styles.inputContainer}>
          <Text style={styles.sectionTitle}>Send Message to Worker</Text>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Enter message to process..."
            multiline
          />

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handlePostMessage}
            >
              <Text style={styles.buttonText}>Post Message</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handlePostMultipleMessages}
            >
              <Text style={styles.secondaryButtonText}>Post 5 Messages</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancelAllTasks}
          >
            <Text style={styles.cancelButtonText}>Cancel All Tasks</Text>
          </TouchableOpacity>
        </View>

        {/* Results Section */}
        <View style={styles.resultsContainer}>
          <View style={styles.resultsHeader}>
            <Text style={styles.sectionTitle}>Results ({results.length})</Text>
            <TouchableOpacity onPress={handleClearResults}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          </View>

          {results.length === 0 ? (
            <Text style={styles.noResultsText}>
              No results yet. Send a message to see background processing in
              action!
            </Text>
          ) : (
            results
              .slice()
              .reverse()
              .map((result, index) => (
                <View key={`${result.id}-${index}`} style={styles.resultItem}>
                  <View style={styles.resultHeader}>
                    <Text style={styles.resultId}>
                      Task ID: {result.id.substring(0, 8)}...
                    </Text>
                    <Text style={styles.resultTime}>
                      {formatTimestamp(result.timestamp)}
                    </Text>
                  </View>
                  <Text style={styles.resultInput}>Input: {result.input}</Text>
                  <Text style={styles.resultOutput}>
                    Output: {result.output}
                  </Text>
                  <Text style={styles.resultProcessingTime}>
                    Processing Time: {result.processingTime.toFixed(2)}ms
                  </Text>
                </View>
              ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1C1C1E",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
    marginTop: 4,
  },
  statusContainer: {
    backgroundColor: "#FFFFFF",
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 16,
    color: "#3C3C43",
    fontWeight: "500",
  },
  statusValue: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
  },
  inputContainer: {
    backgroundColor: "#FFFFFF",
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1C1C1E",
    marginBottom: 12,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#E5E5EA",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 44,
    backgroundColor: "#F2F2F7",
  },
  buttonRow: {
    flexDirection: "row",
    marginTop: 12,
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: "#F2F2F7",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    marginTop: 8,
    backgroundColor: "#FF3B30",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  resultsContainer: {
    backgroundColor: "#FFFFFF",
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  clearText: {
    color: "#FF3B30",
    fontSize: 16,
    fontWeight: "500",
  },
  noResultsText: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
    padding: 20,
    fontStyle: "italic",
  },
  resultItem: {
    backgroundColor: "#F2F2F7",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  resultId: {
    fontSize: 12,
    color: "#8E8E93",
    fontFamily: "Menlo",
  },
  resultTime: {
    fontSize: 12,
    color: "#8E8E93",
  },
  resultInput: {
    fontSize: 14,
    color: "#3C3C43",
    marginBottom: 2,
  },
  resultOutput: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "500",
    marginBottom: 2,
  },
  resultProcessingTime: {
    fontSize: 12,
    color: "#8E8E93",
  },
});

export default App;
