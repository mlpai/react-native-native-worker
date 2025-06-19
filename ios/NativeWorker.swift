import Foundation

@objc(NativeWorker)
class NativeWorker: RCTEventEmitter {
    
    private static let EVENT_WORKER_MESSAGE = "onWorkerMessage"
    private static let WORKER_QUEUE_LABEL = "com.nativeworker.background"
    
    private let backgroundQueue = DispatchQueue.global(qos: .userInitiated)
    private let serialQueue = DispatchQueue(label: WORKER_QUEUE_LABEL, qos: .userInitiated)
    
    private var taskQueue: [WorkerTask] = []
    private var activeTasks: [String: WorkerTask] = [:]
    private var isProcessing: Bool = false
    private var processingTimer: Timer?
    
    override init() {
        super.init()
        startProcessingLoop()
    }
    
    deinit {
        stopProcessingLoop()
    }
    
    override func supportedEvents() -> [String]! {
        return [NativeWorker.EVENT_WORKER_MESSAGE]
    }
    
    override func constantsToExport() -> [AnyHashable : Any]! {
        return ["EVENT_WORKER_MESSAGE": NativeWorker.EVENT_WORKER_MESSAGE]
    }
    
    override static func requiresMainQueueSetup() -> Bool {
        return false
    }
    
    private func startProcessingLoop() {
        DispatchQueue.main.async { [weak self] in
            self?.processingTimer = Timer.scheduledTimer(withTimeInterval: 0.01, repeats: true) { [weak self] _ in
                self?.processNextTask()
            }
        }
    }
    
    private func stopProcessingLoop() {
        processingTimer?.invalidate()
        processingTimer = nil
        
        serialQueue.async { [weak self] in
            self?.taskQueue.removeAll()
            self?.activeTasks.removeAll()
            self?.isProcessing = false
        }
    }
    
    private func processNextTask() {
        serialQueue.async { [weak self] in
            guard let self = self else { return }
            
            guard !self.taskQueue.isEmpty else {
                self.isProcessing = false
                return
            }
            
            let task = self.taskQueue.removeFirst()
            
            guard !task.isCancelled else {
                self.activeTasks.removeValue(forKey: task.id)
                return
            }
            
            self.isProcessing = true
            
            self.backgroundQueue.async {
                self.processTask(task)
            }
        }
    }
    
    private func processTask(_ task: WorkerTask) {
        let processingStartTime = CACurrentMediaTime()
        
        do {
            let result = try processMessage(task.message)
            let processingTime = (CACurrentMediaTime() - processingStartTime) * 1000
            
            serialQueue.async { [weak self] in
                self?.activeTasks.removeValue(forKey: task.id)
            }
            
            if !task.isCancelled {
                sendEventToJS(task: task, result: result, processingTime: processingTime)
            }
            
        } catch {
            if !task.isCancelled {
                sendErrorToJS(task: task, error: error.localizedDescription)
            }
        }
    }
    
    private func processMessage(_ message: String) throws -> String {
        Thread.sleep(forTimeInterval: 0.1)
        
        let processed = String(message.reversed()).uppercased()
        let timestamp = Int64(Date().timeIntervalSince1970 * 1000)
        
        return "Processed: \(processed) (at \(timestamp))"
    }
    
    private func sendEventToJS(task: WorkerTask, result: String, processingTime: Double) {
        DispatchQueue.main.async { [weak self] in
            let params: [String: Any] = [
                "taskId": task.id,
                "result": result,
                "processingTime": processingTime,
                "timestamp": Date().timeIntervalSince1970 * 1000
            ]
            
            self?.sendEvent(withName: NativeWorker.EVENT_WORKER_MESSAGE, body: params)
        }
    }
    
    private func sendErrorToJS(task: WorkerTask, error: String) {
        DispatchQueue.main.async { [weak self] in
            let params: [String: Any] = [
                "taskId": task.id,
                "error": error,
                "timestamp": Date().timeIntervalSince1970 * 1000
            ]
            
            self?.sendEvent(withName: NativeWorker.EVENT_WORKER_MESSAGE, body: params)
        }
    }
    
    @objc func postMessage(_ message: String, taskId: String?, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        
        let finalTaskId = taskId ?? UUID().uuidString
        let task = WorkerTask(
            id: finalTaskId,
            message: message,
            timestamp: Date().timeIntervalSince1970 * 1000
        )
        
        serialQueue.async { [weak self] in
            guard let self = self else {
                reject("MODULE_DESTROYED", "Module has been destroyed", nil)
                return
            }
            
            self.activeTasks[finalTaskId] = task
            self.taskQueue.append(task)
            
            DispatchQueue.main.async {
                resolve(finalTaskId)
            }
        }
    }
    
    @objc func cancelTask(_ taskId: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        
        serialQueue.async { [weak self] in
            guard let self = self else {
                reject("MODULE_DESTROYED", "Module has been destroyed", nil)
                return
            }
            
            if let task = self.activeTasks[taskId] {
                task.cancel()
                self.activeTasks.removeValue(forKey: taskId)
                
                DispatchQueue.main.async {
                    resolve(true)
                }
            } else {
                DispatchQueue.main.async {
                    resolve(false)
                }
            }
        }
    }
    
    @objc func cancelAllTasks(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        
        serialQueue.async { [weak self] in
            guard let self = self else {
                reject("MODULE_DESTROYED", "Module has been destroyed", nil)
                return
            }
            
            let cancelledCount = self.activeTasks.count
            
            self.activeTasks.values.forEach { $0.cancel() }
            self.activeTasks.removeAll()
            self.taskQueue.removeAll()
            
            DispatchQueue.main.async {
                resolve(cancelledCount)
            }
        }
    }
    
    @objc func getQueueSize(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        
        serialQueue.async { [weak self] in
            guard let self = self else {
                reject("MODULE_DESTROYED", "Module has been destroyed", nil)
                return
            }
            
            let queueSize = self.taskQueue.count
            
            DispatchQueue.main.async {
                resolve(queueSize)
            }
        }
    }
    
    @objc func isProcessing(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        
        serialQueue.async { [weak self] in
            guard let self = self else {
                reject("MODULE_DESTROYED", "Module has been destroyed", nil)
                return
            }
            
            let processing = self.isProcessing
            
            DispatchQueue.main.async {
                resolve(processing)
            }
        }
    }
}

public class WorkerTask {
    let id: String
    let message: String
    let timestamp: Double
    private(set) var isCancelled: Bool = false
    
    init(id: String, message: String, timestamp: Double) {
        self.id = id
        self.message = message
        self.timestamp = timestamp
    }
    
    func cancel() {
        isCancelled = true
    }
} 