/**
 * Test setup file for react-native-native-worker
 *
 * This file configures the testing environment for the native module.
 */

// Mock React Native modules
jest.mock("react-native", () => ({
  NativeModules: {
    NativeWorker: {
      postMessage: jest.fn(),
      cancelTask: jest.fn(),
      cancelAllTasks: jest.fn(),
      getQueueSize: jest.fn(),
      isProcessing: jest.fn(),
    },
  },
  NativeEventEmitter: jest.fn(() => ({
    addListener: jest.fn(() => ({
      remove: jest.fn(),
    })),
    removeAllListeners: jest.fn(),
  })),
  Platform: {
    OS: "ios",
    select: jest.fn((options) => options.ios || options.default),
  },
}));

// Global test timeout
jest.setTimeout(10000);

// Suppress console warnings during tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};
