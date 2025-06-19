/**
 * Unit tests for react-native-native-worker
 */

import { NativeModules } from "react-native";

// Mock the native modules before importing NativeWorker
const mockNativeWorker = {
  postMessage: jest.fn(),
  cancelTask: jest.fn(),
  cancelAllTasks: jest.fn(),
  getQueueSize: jest.fn(),
  isProcessing: jest.fn(),
};

// Set up the mock
(NativeModules as any).NativeWorker = mockNativeWorker;

// Now import NativeWorker after setting up the mock
import NativeWorker, { WorkerResult } from "../src/NativeWorker";

describe("NativeWorker", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("postMessage", () => {
    it("should post a message and return a task ID", async () => {
      const expectedTaskId = "test-task-id";
      mockNativeWorker.postMessage.mockResolvedValue(expectedTaskId);

      const result = await NativeWorker.postMessage("test message");

      expect(mockNativeWorker.postMessage).toHaveBeenCalledWith(
        "test message",
        undefined
      );
      expect(result).toBe(expectedTaskId);
    });

    it("should post a message with custom task ID", async () => {
      const customTaskId = "custom-task-id";
      mockNativeWorker.postMessage.mockResolvedValue(customTaskId);

      const result = await NativeWorker.postMessage(
        "test message",
        customTaskId
      );

      expect(mockNativeWorker.postMessage).toHaveBeenCalledWith(
        "test message",
        customTaskId
      );
      expect(result).toBe(customTaskId);
    });

    it("should handle errors when posting message fails", async () => {
      const errorMessage = "Failed to post message";
      mockNativeWorker.postMessage.mockRejectedValue(new Error(errorMessage));

      await expect(NativeWorker.postMessage("test message")).rejects.toThrow(
        errorMessage
      );
    });

    it("should handle empty message", async () => {
      const expectedTaskId = "empty-task-id";
      mockNativeWorker.postMessage.mockResolvedValue(expectedTaskId);

      const result = await NativeWorker.postMessage("");

      expect(mockNativeWorker.postMessage).toHaveBeenCalledWith("", undefined);
      expect(result).toBe(expectedTaskId);
    });
  });

  describe("cancelTask", () => {
    it("should cancel a task successfully", async () => {
      mockNativeWorker.cancelTask.mockResolvedValue(true);

      const result = await NativeWorker.cancelTask("task-id");

      expect(mockNativeWorker.cancelTask).toHaveBeenCalledWith("task-id");
      expect(result).toBe(true);
    });

    it("should return false when task not found", async () => {
      mockNativeWorker.cancelTask.mockResolvedValue(false);

      const result = await NativeWorker.cancelTask("non-existent-task");

      expect(mockNativeWorker.cancelTask).toHaveBeenCalledWith(
        "non-existent-task"
      );
      expect(result).toBe(false);
    });

    it("should handle errors when canceling task fails", async () => {
      const errorMessage = "Failed to cancel task";
      mockNativeWorker.cancelTask.mockRejectedValue(new Error(errorMessage));

      await expect(NativeWorker.cancelTask("task-id")).rejects.toThrow(
        errorMessage
      );
    });

    it("should handle empty task ID", async () => {
      mockNativeWorker.cancelTask.mockResolvedValue(false);

      const result = await NativeWorker.cancelTask("");

      expect(mockNativeWorker.cancelTask).toHaveBeenCalledWith("");
      expect(result).toBe(false);
    });
  });

  describe("cancelAllTasks", () => {
    it("should cancel all tasks and return count", async () => {
      const cancelledCount = 5;
      mockNativeWorker.cancelAllTasks.mockResolvedValue(cancelledCount);

      const result = await NativeWorker.cancelAllTasks();

      expect(mockNativeWorker.cancelAllTasks).toHaveBeenCalled();
      expect(result).toBe(cancelledCount);
    });

    it("should return 0 when no tasks to cancel", async () => {
      mockNativeWorker.cancelAllTasks.mockResolvedValue(0);

      const result = await NativeWorker.cancelAllTasks();

      expect(result).toBe(0);
    });

    it("should handle errors when canceling all tasks fails", async () => {
      const errorMessage = "Failed to cancel all tasks";
      mockNativeWorker.cancelAllTasks.mockRejectedValue(
        new Error(errorMessage)
      );

      await expect(NativeWorker.cancelAllTasks()).rejects.toThrow(errorMessage);
    });

    it("should handle large number of cancelled tasks", async () => {
      const largeCancelledCount = 1000;
      mockNativeWorker.cancelAllTasks.mockResolvedValue(largeCancelledCount);

      const result = await NativeWorker.cancelAllTasks();

      expect(result).toBe(largeCancelledCount);
    });
  });

  describe("getQueueSize", () => {
    it("should return current queue size", async () => {
      const queueSize = 3;
      mockNativeWorker.getQueueSize.mockResolvedValue(queueSize);

      const result = await NativeWorker.getQueueSize();

      expect(mockNativeWorker.getQueueSize).toHaveBeenCalled();
      expect(result).toBe(queueSize);
    });

    it("should return 0 for empty queue", async () => {
      mockNativeWorker.getQueueSize.mockResolvedValue(0);

      const result = await NativeWorker.getQueueSize();

      expect(result).toBe(0);
    });

    it("should handle errors when getting queue size fails", async () => {
      const errorMessage = "Failed to get queue size";
      mockNativeWorker.getQueueSize.mockRejectedValue(new Error(errorMessage));

      await expect(NativeWorker.getQueueSize()).rejects.toThrow(errorMessage);
    });

    it("should handle large queue sizes", async () => {
      const largeQueueSize = 10000;
      mockNativeWorker.getQueueSize.mockResolvedValue(largeQueueSize);

      const result = await NativeWorker.getQueueSize();

      expect(result).toBe(largeQueueSize);
    });
  });

  describe("isProcessing", () => {
    it("should return true when processing", async () => {
      mockNativeWorker.isProcessing.mockResolvedValue(true);

      const result = await NativeWorker.isProcessing();

      expect(mockNativeWorker.isProcessing).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it("should return false when not processing", async () => {
      mockNativeWorker.isProcessing.mockResolvedValue(false);

      const result = await NativeWorker.isProcessing();

      expect(result).toBe(false);
    });

    it("should handle errors when checking processing status fails", async () => {
      const errorMessage = "Failed to check processing status";
      mockNativeWorker.isProcessing.mockRejectedValue(new Error(errorMessage));

      await expect(NativeWorker.isProcessing()).rejects.toThrow(errorMessage);
    });
  });

  describe("Event Handling", () => {
    it("should provide onWorkerMessage function", () => {
      expect(typeof NativeWorker.onWorkerMessage).toBe("function");
    });

    it("should return cleanup function from onWorkerMessage", () => {
      const mockListener = jest.fn();
      const cleanup = NativeWorker.onWorkerMessage(mockListener);

      expect(typeof cleanup).toBe("function");

      // Call cleanup to prevent memory leaks in tests
      cleanup();
    });
  });

  describe("Module Structure", () => {
    it("should export all required methods", () => {
      expect(typeof NativeWorker.postMessage).toBe("function");
      expect(typeof NativeWorker.cancelTask).toBe("function");
      expect(typeof NativeWorker.cancelAllTasks).toBe("function");
      expect(typeof NativeWorker.getQueueSize).toBe("function");
      expect(typeof NativeWorker.isProcessing).toBe("function");
      expect(typeof NativeWorker.onWorkerMessage).toBe("function");
    });

    it("should have proper method signatures", async () => {
      // Mock all methods to resolve successfully
      mockNativeWorker.postMessage.mockResolvedValue("test-id");
      mockNativeWorker.cancelTask.mockResolvedValue(true);
      mockNativeWorker.cancelAllTasks.mockResolvedValue(0);
      mockNativeWorker.getQueueSize.mockResolvedValue(0);
      mockNativeWorker.isProcessing.mockResolvedValue(false);

      // Test that methods accept the expected parameters and return promises
      expect(NativeWorker.postMessage("test")).toBeInstanceOf(Promise);
      expect(NativeWorker.cancelTask("test-id")).toBeInstanceOf(Promise);
      expect(NativeWorker.cancelAllTasks()).toBeInstanceOf(Promise);
      expect(NativeWorker.getQueueSize()).toBeInstanceOf(Promise);
      expect(NativeWorker.isProcessing()).toBeInstanceOf(Promise);
      expect(typeof NativeWorker.onWorkerMessage(() => {})).toBe("function");
    });
  });

  describe("Integration Workflow", () => {
    it("should handle complete workflow sequence", async () => {
      const taskId = "integration-test-task";
      const message = "integration test message";

      // Setup sequential mock responses
      mockNativeWorker.postMessage.mockResolvedValue(taskId);
      mockNativeWorker.getQueueSize
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(0);
      mockNativeWorker.isProcessing
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      mockNativeWorker.cancelTask.mockResolvedValue(false); // Task already completed

      // Post a message
      const returnedTaskId = await NativeWorker.postMessage(message);
      expect(returnedTaskId).toBe(taskId);

      // Check initial status
      const initialQueueSize = await NativeWorker.getQueueSize();
      const initialProcessing = await NativeWorker.isProcessing();
      expect(initialQueueSize).toBe(1);
      expect(initialProcessing).toBe(true);

      // Simulate processing completion
      const finalQueueSize = await NativeWorker.getQueueSize();
      const finalProcessing = await NativeWorker.isProcessing();
      expect(finalQueueSize).toBe(0);
      expect(finalProcessing).toBe(false);

      // Try to cancel completed task
      const cancelResult = await NativeWorker.cancelTask(taskId);
      expect(cancelResult).toBe(false);
    });

    it("should handle batch operations", async () => {
      const taskIds = ["task-1", "task-2", "task-3"];

      // Mock posting multiple messages
      mockNativeWorker.postMessage
        .mockResolvedValueOnce(taskIds[0])
        .mockResolvedValueOnce(taskIds[1])
        .mockResolvedValueOnce(taskIds[2]);

      mockNativeWorker.getQueueSize.mockResolvedValue(3);
      mockNativeWorker.cancelAllTasks.mockResolvedValue(3);

      // Post multiple messages
      const results = await Promise.all([
        NativeWorker.postMessage("message 1"),
        NativeWorker.postMessage("message 2"),
        NativeWorker.postMessage("message 3"),
      ]);

      expect(results).toEqual(taskIds);

      // Check queue size
      const queueSize = await NativeWorker.getQueueSize();
      expect(queueSize).toBe(3);

      // Cancel all tasks
      const cancelledCount = await NativeWorker.cancelAllTasks();
      expect(cancelledCount).toBe(3);
    });
  });

  describe("Type Definitions", () => {
    it("should have proper WorkerResult interface", () => {
      const result: WorkerResult = {
        taskId: "test",
        result: "test result",
        processingTime: 100,
        timestamp: Date.now(),
      };

      expect(result.taskId).toBe("test");
      expect(result.result).toBe("test result");
      expect(typeof result.processingTime).toBe("number");
      expect(typeof result.timestamp).toBe("number");
    });

    it("should support optional error in WorkerResult", () => {
      const errorResult: WorkerResult = {
        taskId: "test",
        result: "",
        processingTime: 0,
        timestamp: Date.now(),
        error: "Test error",
      };

      expect(errorResult.error).toBe("Test error");
    });
  });
});
