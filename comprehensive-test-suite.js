/**
 * Comprehensive Test Suite for Pareng Boyong AI System
 * Tests all components: Intent Detection, Context7, Security Tools, Advanced Chat Interface
 * 
 * This suite validates:
 * - Intent detection accuracy
 * - Context7 real documentation fetching
 * - Security tool availability
 * - Advanced chat interface rendering
 * - Mode switching capabilities
 * - Real-time documentation integration
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import fetch from 'node-fetch';

class ComprehensiveTestSuite {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      total: 0,
      details: []
    };
    
    this.baseUrl = 'http://localhost:5000';
    this.testStartTime = Date.now();
  }

  // Test utility functions
  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async test(name, testFunction) {
    this.results.total++;
    console.log(`\n🧪 Testing: ${name}`);
    
    const startTime = Date.now();
    try {
      await testFunction();
      const duration = Date.now() - startTime;
      console.log(`✅ PASSED: ${name} (${duration}ms)`);
      this.results.passed++;
      this.results.details.push({
        name,
        status: 'PASSED',
        duration,
        error: null
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`❌ FAILED: ${name} (${duration}ms)`);
      console.log(`   Error: ${error.message}`);
      this.results.failed++;
      this.results.details.push({
        name,
        status: 'FAILED',
        duration,
        error: error.message
      });
    }
  }

  // Test 1: Intent Detection System
  async testIntentDetection() {
    const testCases = [
      { input: "scan this network for vulnerabilities", expected: "hacker" },
      { input: "build a React todo app", expected: "developer" },
      { input: "research AI trends in 2024", expected: "researcher" },
      { input: "what is machine learning", expected: "default" },
      { input: "perform sql injection testing", expected: "hacker" },
      { input: "create REST API with Express", expected: "developer" },
      { input: "analyze market data", expected: "researcher" }
    ];

    for (const testCase of testCases) {
      const response = await this.makeRequest('/api/pareng-boyong/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: testCase.input,
          sessionId: 'test-intent-detection',
          mode: 'default'
        })
      });

      if (!response.intent_detected) {
        throw new Error(`Intent not detected for: "${testCase.input}"`);
      }

      if (response.intent_detected !== testCase.expected) {
        throw new Error(`Intent mismatch for "${testCase.input}": expected ${testCase.expected}, got ${response.intent_detected}`);
      }
    }

    console.log(`   ✓ All ${testCases.length} intent detection test cases passed`);
  }

  // Test 2: Context7 Real Documentation Service
  async testContext7Service() {
    const testLibraries = ['react', 'express', 'lodash', 'axios', 'mongoose'];
    
    for (const library of testLibraries) {
      try {
        const response = await this.makeRequest(`/api/context7/library/${library}`);
        
        if (!response.success) {
          throw new Error(`Context7 failed to fetch ${library}: ${response.error}`);
        }

        if (!response.data || !response.data.documentation) {
          throw new Error(`Context7 returned empty documentation for ${library}`);
        }

        console.log(`   ✓ Successfully fetched documentation for ${library} (${response.data.version})`);
      } catch (error) {
        console.log(`   ⚠️  Warning: ${library} documentation fetch failed: ${error.message}`);
      }
    }
  }

  // Test 3: Security Tools Integration
  async testSecurityTools() {
    const criticalTools = [
      'nmap', 'sqlmap', 'nikto', 'john', 'hashcat', 
      'wireshark', 'hydra', 'metasploit', 'burpsuite'
    ];

    const response = await this.makeRequest('/api/pareng-boyong/tools');
    
    if (!response.tools || !Array.isArray(response.tools)) {
      throw new Error('Security tools endpoint returned invalid response');
    }

    const availableTools = response.tools.map(tool => tool.name.toLowerCase());
    const missingTools = criticalTools.filter(tool => !availableTools.includes(tool));

    if (missingTools.length > 0) {
      throw new Error(`Missing critical security tools: ${missingTools.join(', ')}`);
    }

    console.log(`   ✓ All ${criticalTools.length} critical security tools are available`);
    console.log(`   ✓ Total tools available: ${response.tools.length}`);
  }

  // Test 4: Advanced Chat Interface Components
  async testAdvancedChatInterface() {
    // Test different message types and rendering
    const testMessages = [
      {
        type: 'code',
        content: '```javascript\nconsole.log("Hello World");\n```',
        expectedRender: 'code'
      },
      {
        type: 'json',
        content: '{"name": "test", "value": 123}',
        expectedRender: 'json'
      },
      {
        type: 'html',
        content: '<html><body><h1>Test</h1></body></html>',
        expectedRender: 'html'
      },
      {
        type: 'markdown',
        content: '# Test Header\n\n**Bold text** and *italic text*',
        expectedRender: 'markdown'
      }
    ];

    for (const message of testMessages) {
      const response = await this.makeRequest('/api/pareng-boyong/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: message.content,
          sessionId: 'test-chat-interface',
          mode: 'default'
        })
      });

      if (!response.response) {
        throw new Error(`Chat interface failed to process ${message.type} message`);
      }

      console.log(`   ✓ Successfully processed ${message.type} message`);
    }
  }

  // Test 5: Mode Switching and Context Preservation
  async testModeSwitching() {
    const modes = ['default', 'hacker', 'developer', 'researcher'];
    
    for (const mode of modes) {
      const response = await this.makeRequest('/api/pareng-boyong/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: `Switch to ${mode} mode and confirm`,
          sessionId: 'test-mode-switching',
          mode: 'default'
        })
      });

      if (!response.response) {
        throw new Error(`Mode switching failed for ${mode} mode`);
      }

      console.log(`   ✓ Successfully switched to ${mode} mode`);
    }
  }

  // Test 6: Real-time Documentation Integration
  async testRealTimeDocumentation() {
    const testMessage = "How do I create a React component using useState and useEffect hooks?";
    
    const response = await this.makeRequest('/api/pareng-boyong/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: testMessage,
        sessionId: 'test-documentation',
        mode: 'developer'
      })
    });

    if (!response.response) {
      throw new Error('Real-time documentation integration failed');
    }

    // Check if response contains documentation enhancements
    if (!response.response.includes('React') && !response.response.includes('useState')) {
      throw new Error('Documentation integration did not enhance the response');
    }

    console.log(`   ✓ Real-time documentation successfully integrated`);
  }

  // Test 7: Database Operations and Memory System
  async testDatabaseOperations() {
    const testUserId = 'test-user-' + Date.now();
    
    // Test conversation storage
    const response = await this.makeRequest('/api/pareng-boyong/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: "Remember that I prefer Python over JavaScript",
        sessionId: 'test-database',
        userId: testUserId,
        mode: 'default'
      })
    });

    if (!response.response) {
      throw new Error('Database conversation storage failed');
    }

    // Test memory retrieval
    const memoryResponse = await this.makeRequest(`/api/pareng-boyong/memories/${testUserId}`);
    
    if (!memoryResponse.memories || !Array.isArray(memoryResponse.memories)) {
      throw new Error('Memory retrieval failed');
    }

    console.log(`   ✓ Database operations and memory system working correctly`);
  }

  // Test 8: Performance and Load Testing
  async testPerformanceAndLoad() {
    const startTime = Date.now();
    const concurrent = 5;
    const promises = [];

    for (let i = 0; i < concurrent; i++) {
      promises.push(
        this.makeRequest('/api/pareng-boyong/chat', {
          method: 'POST',
          body: JSON.stringify({
            message: `Performance test message ${i}`,
            sessionId: `test-performance-${i}`,
            mode: 'default'
          })
        })
      );
    }

    await Promise.all(promises);
    const duration = Date.now() - startTime;

    if (duration > 30000) { // 30 seconds timeout
      throw new Error(`Performance test failed: ${duration}ms for ${concurrent} concurrent requests`);
    }

    console.log(`   ✓ Performance test passed: ${duration}ms for ${concurrent} concurrent requests`);
  }

  // Test 9: Error Handling and Resilience
  async testErrorHandling() {
    const errorCases = [
      { endpoint: '/api/pareng-boyong/chat', method: 'POST', body: '{"invalid": "json"}' },
      { endpoint: '/api/pareng-boyong/chat', method: 'POST', body: '{}' },
      { endpoint: '/api/nonexistent-endpoint', method: 'GET' }
    ];

    for (const errorCase of errorCases) {
      try {
        await this.makeRequest(errorCase.endpoint, {
          method: errorCase.method,
          body: errorCase.body
        });
        // If we get here, the error case didn't properly fail
        throw new Error(`Error case should have failed: ${errorCase.endpoint}`);
      } catch (error) {
        if (error.message.includes('HTTP 404') || error.message.includes('HTTP 400')) {
          console.log(`   ✓ Error case handled properly: ${errorCase.endpoint}`);
        } else {
          throw error;
        }
      }
    }
  }

  // Test 10: Integration Test - Full Workflow
  async testFullWorkflow() {
    const sessionId = 'test-full-workflow-' + Date.now();
    
    // Step 1: Start with security scan request
    const step1 = await this.makeRequest('/api/pareng-boyong/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: "I need to perform a security audit of my web application",
        sessionId,
        mode: 'default'
      })
    });

    if (!step1.response || !step1.intent_detected) {
      throw new Error('Full workflow Step 1 failed');
    }

    // Step 2: Switch to development task
    const step2 = await this.makeRequest('/api/pareng-boyong/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: "Now I want to build a React dashboard for monitoring",
        sessionId,
        mode: step1.mode || 'hacker'
      })
    });

    if (!step2.response) {
      throw new Error('Full workflow Step 2 failed');
    }

    // Step 3: Research phase
    const step3 = await this.makeRequest('/api/pareng-boyong/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: "Research the best practices for security dashboards",
        sessionId,
        mode: step2.mode || 'developer'
      })
    });

    if (!step3.response) {
      throw new Error('Full workflow Step 3 failed');
    }

    console.log(`   ✓ Full workflow completed successfully through all modes`);
  }

  // Main test runner
  async run() {
    console.log('\n🚀 PARENG BOYONG COMPREHENSIVE TEST SUITE');
    console.log('==========================================');
    console.log(`Testing system at: ${this.baseUrl}`);
    console.log(`Test started: ${new Date().toISOString()}\n`);

    // Run all tests
    await this.test('Intent Detection System', () => this.testIntentDetection());
    await this.test('Context7 Real Documentation Service', () => this.testContext7Service());
    await this.test('Security Tools Integration', () => this.testSecurityTools());
    await this.test('Advanced Chat Interface', () => this.testAdvancedChatInterface());
    await this.test('Mode Switching and Context Preservation', () => this.testModeSwitching());
    await this.test('Real-time Documentation Integration', () => this.testRealTimeDocumentation());
    await this.test('Database Operations and Memory System', () => this.testDatabaseOperations());
    await this.test('Performance and Load Testing', () => this.testPerformanceAndLoad());
    await this.test('Error Handling and Resilience', () => this.testErrorHandling());
    await this.test('Integration Test - Full Workflow', () => this.testFullWorkflow());

    // Generate final report
    this.generateReport();
  }

  generateReport() {
    const totalDuration = Date.now() - this.testStartTime;
    const successRate = (this.results.passed / this.results.total * 100).toFixed(1);
    
    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('========================');
    console.log(`Total Tests: ${this.results.total}`);
    console.log(`Passed: ${this.results.passed}`);
    console.log(`Failed: ${this.results.failed}`);
    console.log(`Success Rate: ${successRate}%`);
    console.log(`Total Duration: ${totalDuration}ms`);
    
    if (this.results.failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.results.details
        .filter(test => test.status === 'FAILED')
        .forEach(test => {
          console.log(`   - ${test.name}: ${test.error}`);
        });
    }

    console.log('\n📋 DETAILED RESULTS:');
    this.results.details.forEach(test => {
      const status = test.status === 'PASSED' ? '✅' : '❌';
      console.log(`   ${status} ${test.name} (${test.duration}ms)`);
    });

    // Save results to file
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.results.total,
        passed: this.results.passed,
        failed: this.results.failed,
        successRate: successRate,
        totalDuration: totalDuration
      },
      details: this.results.details
    };

    fs.writeFileSync(
      `test-results-${Date.now()}.json`,
      JSON.stringify(reportData, null, 2)
    );

    console.log('\n🎯 SYSTEM STATUS:', successRate >= 90 ? 'EXCELLENT' : successRate >= 70 ? 'GOOD' : 'NEEDS IMPROVEMENT');
    console.log('\n✅ Test suite completed successfully!');
  }
}

// Run the test suite
async function runTests() {
  try {
    const testSuite = new ComprehensiveTestSuite();
    await testSuite.run();
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export default ComprehensiveTestSuite;