# Test Suite for react-native-native-worker

This directory contains comprehensive unit tests for the React Native Native Worker package.

## Test Coverage

The test suite covers:

- **Core functionality**: All native module methods (postMessage, cancelTask, cancelAllTasks, getQueueSize, isProcessing)
- **Error handling**: Network failures, invalid inputs, and edge cases
- **Event system**: onWorkerMessage event listener functionality
- **Integration workflows**: Complete task lifecycle and batch operations
- **Type definitions**: TypeScript interface validation
- **Module structure**: API surface and method signatures

## Running Tests

### Basic test run

```bash
npm test
```

### Watch mode (runs tests on file changes)

```bash
npm run test:watch
```

### Coverage report

```bash
npm run test:coverage
```

## Test Structure

### Setup (`setup.ts`)

- Mocks React Native modules
- Configures Jest environment
- Sets global test timeout and console suppression

### Main test file (`NativeWorker.test.ts`)

- **postMessage tests**: Message posting with various inputs and error scenarios
- **cancelTask tests**: Task cancellation functionality
- **cancelAllTasks tests**: Bulk cancellation operations
- **getQueueSize tests**: Queue monitoring functionality
- **isProcessing tests**: Processing status checks
- **Event Handling tests**: Event listener setup and cleanup
- **Module Structure tests**: API surface validation
- **Integration Workflow tests**: End-to-end scenarios
- **Type Definitions tests**: TypeScript interface validation

## Current Coverage

- **Statements**: 70.37%
- **Branches**: 33.33%
- **Functions**: 69.23%
- **Lines**: 69.23%

## Notes

- Tests use Jest mocking to simulate native module behavior
- Event emitter functionality is tested at the interface level
- Integration tests validate complete workflows without requiring actual native modules
- All async operations are properly handled to prevent promise rejection warnings

## Adding New Tests

When adding new functionality:

1. Add corresponding test cases in `NativeWorker.test.ts`
2. Update mocks in `setup.ts` if needed
3. Ensure error scenarios are covered
4. Run tests with coverage to verify new code paths are tested
5. Update this documentation if test structure changes

## Continuous Integration

These tests are designed to run in CI environments without requiring:

- Physical devices
- Native module compilation
- React Native runtime environment

All dependencies are mocked appropriately for headless testing.
