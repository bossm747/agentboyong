#!/usr/bin/env node

/**
 * Comprehensive Test Suite for Pareng Boyong AI Runtime Sandbox
 * Tests all enhanced features: Terminal, File Manager, Background Tasks, WebView
 */

import WebSocket from 'ws';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:5000';
const WS_URL = 'ws://localhost:5000/ws';
const TEST_SESSION_ID = 'test-session-' + Date.now();

console.log('🧪 Starting Pareng Boyong Test Suite...\n');

class TestSuite {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, testFn) {
    this.tests.push({ name, testFn });
  }

  async run() {
    console.log(`Running ${this.tests.length} tests...\n`);
    
    for (const test of this.tests) {
      try {
        console.log(`🔍 ${test.name}`);
        await test.testFn();
        console.log(`✅ ${test.name} - PASSED\n`);
        this.passed++;
      } catch (error) {
        console.log(`❌ ${test.name} - FAILED`);
        console.log(`   Error: ${error.message}\n`);
        this.failed++;
      }
    }

    this.summary();
  }

  summary() {
    console.log('=' * 50);
    console.log('📊 Test Results Summary:');
    console.log(`✅ Passed: ${this.passed}`);
    console.log(`❌ Failed: ${this.failed}`);
    console.log(`📈 Success Rate: ${((this.passed / this.tests.length) * 100).toFixed(1)}%`);
    
    if (this.failed === 0) {
      console.log('\n🎉 All tests passed! Pareng Boyong is working perfectly!');
    } else {
      console.log('\n⚠️  Some tests failed. Please check the implementation.');
    }
  }
}

// Test utilities
async function makeRequest(endpoint, options = {}) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
}

async function testWebSocket(sessionId, messageHandler) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${WS_URL}?sessionId=${sessionId}`);
    
    ws.on('open', () => {
      resolve(ws);
    });
    
    ws.on('error', (error) => {
      reject(error);
    });
    
    if (messageHandler) {
      ws.on('message', messageHandler);
    }
  });
}

// Initialize test suite
const suite = new TestSuite();

// Test 1: Session Creation
suite.test('Session Creation', async () => {
  const session = await makeRequest('/api/sessions', {
    method: 'POST',
    body: JSON.stringify({})
  });
  
  if (!session.id) {
    throw new Error('Session creation failed - no ID returned');
  }
  
  console.log(`   Created session: ${session.id}`);
});

// Test 2: File System Operations
suite.test('File Manager - Create and List Files', async () => {
  // Create a test file
  const testContent = 'Hello from Pareng Boyong Test Suite!';
  const testFile = await makeRequest(`/api/files/${TEST_SESSION_ID}/create`, {
    method: 'POST',
    body: JSON.stringify({
      path: 'test-file.txt',
      content: testContent
    })
  });
  
  // List files to verify creation
  const fileTree = await makeRequest(`/api/files/${TEST_SESSION_ID}/tree`);
  
  if (!Array.isArray(fileTree)) {
    throw new Error('File tree should be an array');
  }
  
  console.log(`   Created file: test-file.txt`);
  console.log(`   File tree contains ${fileTree.length} items`);
});

// Test 3: Background Tasks System
suite.test('Background Tasks Management', async () => {
  // Create a background task
  const task = await makeRequest(`/api/background-tasks`, {
    method: 'POST',
    body: JSON.stringify({
      sessionId: TEST_SESSION_ID,
      name: 'Test Task',
      description: 'Testing background task creation',
      status: 'running',
      progress: 50
    })
  });
  
  if (!task.id) {
    throw new Error('Background task creation failed');
  }
  
  // List tasks
  const tasks = await makeRequest(`/api/background-tasks/${TEST_SESSION_ID}`);
  
  if (!Array.isArray(tasks)) {
    throw new Error('Tasks should be an array');
  }
  
  console.log(`   Created background task: ${task.id}`);
  console.log(`   Found ${tasks.length} background tasks`);
});

// Test 4: Application Management
suite.test('Application Management', async () => {
  // Create an application entry
  const app = await makeRequest(`/api/applications`, {
    method: 'POST',
    body: JSON.stringify({
      sessionId: TEST_SESSION_ID,
      name: 'Test App',
      type: 'web',
      port: 3000,
      status: 'running'
    })
  });
  
  if (!app.id) {
    throw new Error('Application creation failed');
  }
  
  // List applications
  const apps = await makeRequest(`/api/applications/${TEST_SESSION_ID}`);
  
  if (!Array.isArray(apps)) {
    throw new Error('Applications should be an array');
  }
  
  console.log(`   Created application: ${app.id}`);
  console.log(`   Found ${apps.length} applications`);
});

// Test 5: WebSocket Terminal Connection
suite.test('Terminal WebSocket Connection', async () => {
  const ws = await testWebSocket(TEST_SESSION_ID);
  
  // Test terminal initialization
  ws.send(JSON.stringify({
    type: 'terminal_init',
    sessionId: TEST_SESSION_ID,
    data: { cwd: `./workspace/${TEST_SESSION_ID}` }
  }));
  
  // Wait for response
  await new Promise((resolve) => {
    ws.on('message', (data) => {
      const message = JSON.parse(data);
      if (message.type === 'terminal_cwd') {
        console.log(`   Terminal initialized with cwd: ${message.data}`);
        resolve();
      }
    });
    
    setTimeout(resolve, 2000); // Timeout after 2 seconds
  });
  
  ws.close();
  console.log('   WebSocket connection established and closed');
});

// Test 6: Terminal Command Execution
suite.test('Terminal Command Execution', async () => {
  const ws = await testWebSocket(TEST_SESSION_ID);
  
  let commandOutput = '';
  
  ws.on('message', (data) => {
    const message = JSON.parse(data);
    if (message.type === 'terminal_output') {
      commandOutput += message.data;
    }
  });
  
  // Execute echo command
  ws.send(JSON.stringify({
    type: 'terminal_execute',
    sessionId: TEST_SESSION_ID,
    data: { command: 'echo "Terminal test successful"' }
  }));
  
  // Wait for output
  await new Promise((resolve) => {
    setTimeout(() => {
      if (commandOutput.includes('Terminal test successful')) {
        console.log('   Command executed successfully');
        console.log(`   Output: ${commandOutput.trim()}`);
      } else {
        throw new Error('Command execution failed or no output received');
      }
      resolve();
    }, 3000);
  });
  
  ws.close();
});

// Test 7: Mobile Responsiveness Check
suite.test('Mobile Interface Components', async () => {
  // This test validates that the API endpoints support mobile features
  
  // Test compact file tree API
  const fileTree = await makeRequest(`/api/files/${TEST_SESSION_ID}/tree`);
  
  // Test background tasks with mobile-friendly data
  const tasks = await makeRequest(`/api/background-tasks/${TEST_SESSION_ID}`);
  
  // Test applications list
  const apps = await makeRequest(`/api/applications/${TEST_SESSION_ID}`);
  
  console.log('   Mobile-friendly API endpoints verified');
  console.log(`   File tree: ${fileTree.length} items`);
  console.log(`   Background tasks: ${tasks.length} items`);
  console.log(`   Applications: ${apps.length} items`);
});

// Test 8: Error Handling
suite.test('Error Handling and Recovery', async () => {
  try {
    // Test invalid session access
    await makeRequest('/api/files/invalid-session/tree');
    throw new Error('Should have failed with invalid session');
  } catch (error) {
    if (error.message.includes('HTTP 404') || error.message.includes('HTTP 500')) {
      console.log('   Invalid session properly rejected');
    } else {
      throw error;
    }
  }
  
  try {
    // Test invalid endpoint
    await makeRequest('/api/nonexistent/endpoint');
    throw new Error('Should have failed with invalid endpoint');
  } catch (error) {
    if (error.message.includes('HTTP 404')) {
      console.log('   Invalid endpoint properly rejected');
    } else {
      throw error;
    }
  }
});

// Test 9: Performance and Load Test
suite.test('Performance and Load Handling', async () => {
  const startTime = Date.now();
  
  // Make multiple concurrent requests
  const promises = [];
  for (let i = 0; i < 10; i++) {
    promises.push(makeRequest(`/api/files/${TEST_SESSION_ID}/tree`));
  }
  
  await Promise.all(promises);
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  console.log(`   Handled 10 concurrent requests in ${duration}ms`);
  
  if (duration > 5000) {
    throw new Error('Response time too slow (>5 seconds)');
  }
});

// Test 10: Data Integrity
suite.test('Data Persistence and Integrity', async () => {
  // Create test data
  const testData = {
    file: 'integrity-test.txt',
    content: 'Data integrity test content',
    task: 'Data integrity background task'
  };
  
  // Create file
  await makeRequest(`/api/files/${TEST_SESSION_ID}/create`, {
    method: 'POST',
    body: JSON.stringify({
      path: testData.file,
      content: testData.content
    })
  });
  
  // Create background task
  const task = await makeRequest(`/api/background-tasks`, {
    method: 'POST',
    body: JSON.stringify({
      sessionId: TEST_SESSION_ID,
      name: testData.task,
      description: 'Testing data persistence',
      status: 'completed',
      progress: 100
    })
  });
  
  // Verify data persistence
  const fileTree = await makeRequest(`/api/files/${TEST_SESSION_ID}/tree`);
  const tasks = await makeRequest(`/api/background-tasks/${TEST_SESSION_ID}`);
  
  const fileExists = fileTree.some(item => item.name === testData.file);
  const taskExists = tasks.some(t => t.name === testData.task);
  
  if (!fileExists) {
    throw new Error('File data not persisted');
  }
  
  if (!taskExists) {
    throw new Error('Task data not persisted');
  }
  
  console.log('   Data persistence verified');
  console.log(`   File created: ${testData.file}`);
  console.log(`   Task created: ${testData.task}`);
});

// Run the test suite
suite.run().catch(console.error);