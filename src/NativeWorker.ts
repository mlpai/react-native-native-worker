import { NativeEventEmitter, NativeModules, Platform } from "react-native";

// Type definitions for the module
export interface WorkerTask {
  id: string;
  message: string;
  timestamp: number;
}

export interface WorkerResult {
  taskId: string;
  result: string;
  processingTime: number;
  timestamp: number;
  error?: string; // Present if processing failed
}

export interface NativeWorkerModule {
  /**
   * Posts a message to the native worker for background processing
   * @param message The message/data to process
   * @param taskId Optional unique task identifier for cancellation
   * @returns Promise<string> Task ID for tracking
   */
  postMessage(message: string, taskId?: string): Promise<string>;

  /**
   * Cancels a specific task by ID
   * @param taskId The task ID to cancel
   * @returns Promise<boolean> True if task was cancelled, false if not found
   */
  cancelTask(taskId: string): Promise<boolean>;

  /**
   * Cancels all pending tasks
   * @returns Promise<number> Number of tasks cancelled
   */
  cancelAllTasks(): Promise<number>;

  /**
   * Gets the current queue size
   * @returns Promise<number> Number of pending tasks
   */
  getQueueSize(): Promise<number>;

  /**
   * Checks if the worker is currently processing tasks
   * @returns Promise<boolean> True if actively processing
   */
  isProcessing(): Promise<boolean>;
}

// Get the native module
const LINKING_ERROR =
  `The package 'react-native-native-worker' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: "" }) +
  "- You rebuilt the app after installing the package\n" +
  "- You are not using Expo Go\n";

const NativeWorkerNativeModule = NativeModules.NativeWorker
  ? NativeModules.NativeWorker
  : (new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    ) as NativeWorkerModule);

/**
 * React Native Native Worker - Background Task Processing Module
 *
 * This module provides a cross-platform solution for running heavy processing tasks
 * on background threads with concurrent task queue management.
 *
 * Features:
 * - Background thread processing (HandlerThread on Android, DispatchQueue on iOS)
 * - Concurrent task queue management
 * - Task cancellation support
 * - Event-based result delivery
 * - TypeScript support
 */
class NativeWorker {
  private eventEmitter: NativeEventEmitter;
  private listeners: Map<string, any> = new Map();

  constructor() {
    this.eventEmitter = new NativeEventEmitter(NativeWorkerNativeModule);
  }

  /**
   * Posts a message to the native worker for background processing
   * @param message The message/data to process
   * @param taskId Optional unique task identifier for cancellation
   * @returns Promise<string> Task ID for tracking
   */
  async postMessage(message: string, taskId?: string): Promise<string> {
    return NativeWorkerNativeModule.postMessage(message, taskId);
  }

  /**
   * Cancels a specific task by ID
   * @param taskId The task ID to cancel
   * @returns Promise<boolean> True if task was cancelled, false if not found
   */
  async cancelTask(taskId: string): Promise<boolean> {
    return NativeWorkerNativeModule.cancelTask(taskId);
  }

  /**
   * Cancels all pending tasks
   * @returns Promise<number> Number of tasks cancelled
   */
  async cancelAllTasks(): Promise<number> {
    return NativeWorkerNativeModule.cancelAllTasks();
  }

  /**
   * Gets the current queue size
   * @returns Promise<number> Number of pending tasks
   */
  async getQueueSize(): Promise<number> {
    return NativeWorkerNativeModule.getQueueSize();
  }

  /**
   * Checks if the worker is currently processing tasks
   * @returns Promise<boolean> True if actively processing
   */
  async isProcessing(): Promise<boolean> {
    return NativeWorkerNativeModule.isProcessing();
  }

  /**
   * Adds a listener for worker result events
   * @param eventType The event type to listen for ('onWorkerMessage')
   * @param listener The callback function to handle events
   * @returns Subscription object with remove() method
   */
  addListener(
    eventType: "onWorkerMessage",
    listener: (result: WorkerResult) => void
  ) {
    const subscription = this.eventEmitter.addListener(eventType, listener);
    this.listeners.set(eventType, subscription);
    return subscription;
  }

  /**
   * Removes a specific event listener
   * @param eventType The event type to remove listener for
   */
  removeListener(eventType: "onWorkerMessage") {
    const subscription = this.listeners.get(eventType);
    if (subscription) {
      subscription.remove();
      this.listeners.delete(eventType);
    }
  }

  /**
   * Removes all event listeners
   */
  removeAllListeners() {
    this.listeners.forEach((subscription) => {
      subscription.remove();
    });
    this.listeners.clear();
  }

  /**
   * Convenience method to listen for worker results with automatic cleanup
   * @param listener The callback function to handle worker results
   * @returns Function to call for cleanup
   */
  onWorkerMessage(listener: (result: WorkerResult) => void): () => void {
    const subscription = this.addListener("onWorkerMessage", listener);
    return () => subscription.remove();
  }
}

// Export singleton instance
const nativeWorker = new NativeWorker();
export default nativeWorker;

// Also export the class for advanced usage
export { NativeWorker as NativeWorkerClass };
