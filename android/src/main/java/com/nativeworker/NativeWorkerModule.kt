package com.nativeworker

import android.os.Handler
import android.os.HandlerThread
import android.os.Looper
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger
import java.util.UUID

/**
 * React Native Native Worker Module - Android Implementation
 * 
 * This module provides background thread processing capabilities using:
 * - HandlerThread for background execution
 * - ConcurrentLinkedQueue for thread-safe task management
 * - Event emission back to JavaScript layer
 */
class NativeWorkerModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "NativeWorker"
        private const val EVENT_WORKER_MESSAGE = "onWorkerMessage"
        private const val WORKER_THREAD_NAME = "NativeWorkerThread"
    }

    // Data class for worker tasks
    data class WorkerTask(
        val id: String,
        val message: String,
        val timestamp: Long,
        var cancelled: AtomicBoolean = AtomicBoolean(false)
    )

    // Background thread and handler for processing
    private var workerThread: HandlerThread? = null
    private var workerHandler: Handler? = null
    private var mainHandler: Handler = Handler(Looper.getMainLooper())

    // Thread-safe task queue and management
    private val taskQueue = ConcurrentLinkedQueue<WorkerTask>()
    private val activeTasks = mutableMapOf<String, WorkerTask>()
    private val isProcessing = AtomicBoolean(false)
    private val taskCounter = AtomicInteger(0)

    override fun getName(): String {
        return NAME
    }

    /**
     * Initialize the background worker thread
     */
    override fun initialize() {
        super.initialize()
        startWorkerThread()
    }

    /**
     * Cleanup resources when module is destroyed
     */
    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        stopWorkerThread()
    }

    /**
     * Start the background worker thread and begin processing loop
     */
    private fun startWorkerThread() {
        if (workerThread == null) {
            workerThread = HandlerThread(WORKER_THREAD_NAME).apply {
                start()
                workerHandler = Handler(looper)
            }
            startProcessingLoop()
        }
    }

    /**
     * Stop the background worker thread and cleanup
     */
    private fun stopWorkerThread() {
        workerThread?.quitSafely()
        workerThread = null
        workerHandler = null
        taskQueue.clear()
        activeTasks.clear()
        isProcessing.set(false)
    }

    /**
     * Start the continuous processing loop on background thread
     */
    private fun startProcessingLoop() {
        workerHandler?.post(object : Runnable {
            override fun run() {
                processNextTask()
                // Continue the loop with a small delay to prevent CPU spinning
                workerHandler?.postDelayed(this, 10)
            }
        })
    }

    /**
     * Process the next task in the queue
     */
    private fun processNextTask() {
        val task = taskQueue.poll()
        if (task != null && !task.cancelled.get()) {
            isProcessing.set(true)
            
            try {
                // Simulate heavy processing work
                val processingStartTime = System.currentTimeMillis()
                val result = processMessage(task.message)
                val processingTime = System.currentTimeMillis() - processingStartTime
                
                // Remove from active tasks
                synchronized(activeTasks) {
                    activeTasks.remove(task.id)
                }
                
                // Send result back to JavaScript if task wasn't cancelled
                if (!task.cancelled.get()) {
                    sendEventToJS(task, result, processingTime)
                }
                
            } catch (e: Exception) {
                // Handle processing errors
                if (!task.cancelled.get()) {
                    sendErrorToJS(task, e.message ?: "Unknown error")
                }
            } finally {
                isProcessing.set(taskQueue.isNotEmpty())
            }
        } else {
            isProcessing.set(false)
        }
    }

    /**
     * Simulate heavy processing work
     * In a real implementation, this would contain actual heavy computation
     */
    private fun processMessage(message: String): String {
        // Simulate CPU-intensive work
        Thread.sleep(100) // Simulate processing delay
        
        // Example processing: reverse string, convert to uppercase, add timestamp
        val processed = message.reversed().uppercase()
        val timestamp = System.currentTimeMillis()
        
        return "Processed: $processed (at $timestamp)"
    }

    /**
     * Send successful result event to JavaScript
     */
    private fun sendEventToJS(task: WorkerTask, result: String, processingTime: Long) {
        mainHandler.post {
            val params = Arguments.createMap().apply {
                putString("taskId", task.id)
                putString("result", result)
                putDouble("processingTime", processingTime.toDouble())
                putDouble("timestamp", System.currentTimeMillis().toDouble())
            }
            
            reactApplicationContext
                ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit(EVENT_WORKER_MESSAGE, params)
        }
    }

    /**
     * Send error event to JavaScript
     */
    private fun sendErrorToJS(task: WorkerTask, error: String) {
        mainHandler.post {
            val params = Arguments.createMap().apply {
                putString("taskId", task.id)
                putString("error", error)
                putDouble("timestamp", System.currentTimeMillis().toDouble())
            }
            
            reactApplicationContext
                ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit(EVENT_WORKER_MESSAGE, params)
        }
    }

    /**
     * Posts a message to the worker queue for background processing
     */
    @ReactMethod
    fun postMessage(message: String, taskId: String?, promise: Promise) {
        try {
            val finalTaskId = taskId ?: UUID.randomUUID().toString()
            val task = WorkerTask(
                id = finalTaskId,
                message = message,
                timestamp = System.currentTimeMillis()
            )
            
            // Add to active tasks and queue
            synchronized(activeTasks) {
                activeTasks[finalTaskId] = task
            }
            taskQueue.offer(task)
            
            promise.resolve(finalTaskId)
        } catch (e: Exception) {
            promise.reject("ENQUEUE_ERROR", "Failed to enqueue task: ${e.message}", e)
        }
    }

    /**
     * Cancels a specific task by ID
     */
    @ReactMethod
    fun cancelTask(taskId: String, promise: Promise) {
        try {
            synchronized(activeTasks) {
                val task = activeTasks[taskId]
                if (task != null) {
                    task.cancelled.set(true)
                    activeTasks.remove(taskId)
                    promise.resolve(true)
                } else {
                    promise.resolve(false)
                }
            }
        } catch (e: Exception) {
            promise.reject("CANCEL_ERROR", "Failed to cancel task: ${e.message}", e)
        }
    }

    /**
     * Cancels all pending tasks
     */
    @ReactMethod
    fun cancelAllTasks(promise: Promise) {
        try {
            var cancelledCount = 0
            synchronized(activeTasks) {
                activeTasks.values.forEach { task ->
                    task.cancelled.set(true)
                    cancelledCount++
                }
                activeTasks.clear()
            }
            taskQueue.clear()
            promise.resolve(cancelledCount)
        } catch (e: Exception) {
            promise.reject("CANCEL_ALL_ERROR", "Failed to cancel all tasks: ${e.message}", e)
        }
    }

    /**
     * Gets the current queue size
     */
    @ReactMethod
    fun getQueueSize(promise: Promise) {
        try {
            promise.resolve(taskQueue.size)
        } catch (e: Exception) {
            promise.reject("QUEUE_SIZE_ERROR", "Failed to get queue size: ${e.message}", e)
        }
    }

    /**
     * Checks if the worker is currently processing tasks
     */
    @ReactMethod
    fun isProcessing(promise: Promise) {
        try {
            promise.resolve(isProcessing.get())
        } catch (e: Exception) {
            promise.reject("PROCESSING_STATUS_ERROR", "Failed to get processing status: ${e.message}", e)
        }
    }

    /**
     * Return constants that can be accessed from JavaScript
     */
    override fun getConstants(): MutableMap<String, Any> {
        return hashMapOf(
            "EVENT_WORKER_MESSAGE" to EVENT_WORKER_MESSAGE
        )
    }
} 