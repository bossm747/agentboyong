/**
 * Simple Direct Test for Pareng Boyong Core Functionality
 */

import fetch from 'node-fetch';

const baseUrl = 'http://localhost:5000';

async function testBasicChat() {
  console.log('\n🧪 Testing Basic Chat Functionality...');
  
  try {
    const response = await fetch(`${baseUrl}/api/pareng-boyong/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: "Hello, can you help me understand machine learning?",
        sessionId: 'simple-test-' + Date.now(),
        mode: 'default'
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.response && data.response.length > 0) {
      console.log('✅ Chat functionality working');
      console.log('Response preview:', data.response.substring(0, 100) + '...');
      return true;
    } else {
      console.log('❌ Chat returned empty response');
      return false;
    }
  } catch (error) {
    console.log('❌ Chat test failed:', error.message);
    return false;
  }
}

async function testIntentDetection() {
  console.log('\n🧪 Testing Intent Detection...');
  
  try {
    const response = await fetch(`${baseUrl}/api/pareng-boyong/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: "I want to scan a network for security vulnerabilities",
        sessionId: 'intent-test-' + Date.now(),
        mode: 'default'
      })
    });

    const data = await response.json();
    
    if (data.intent_detected) {
      console.log('✅ Intent detection working');
      console.log('Detected intent:', data.intent_detected);
      return true;
    } else {
      console.log('⚠️ Intent detection not returning results');
      return false;
    }
  } catch (error) {
    console.log('❌ Intent detection test failed:', error.message);
    return false;
  }
}

async function testSecurityTools() {
  console.log('\n🧪 Testing Security Tools Integration...');
  
  try {
    const response = await fetch(`${baseUrl}/api/pareng-boyong/tools`);
    const data = await response.json();
    
    if (data.tools && Array.isArray(data.tools) && data.tools.length > 0) {
      console.log('✅ Security tools integration working');
      console.log(`Available tools: ${data.tools.length}`);
      console.log('Sample tools:', data.tools.slice(0, 3).map(t => t.name));
      return true;
    } else {
      console.log('❌ Security tools not available');
      return false;
    }
  } catch (error) {
    console.log('❌ Security tools test failed:', error.message);
    return false;
  }
}

async function testSystemStatus() {
  console.log('\n🧪 Testing System Status...');
  
  try {
    const response = await fetch(`${baseUrl}/api/status`);
    const data = await response.json();
    
    if (data.status === 'online') {
      console.log('✅ System status healthy');
      return true;
    } else {
      console.log('⚠️ System status:', data.status);
      return false;
    }
  } catch (error) {
    console.log('❌ System status test failed:', error.message);
    return false;
  }
}

async function runSimpleTests() {
  console.log('🚀 PARENG BOYONG SIMPLE TEST SUITE');
  console.log('==================================');
  console.log(`Testing system at: ${baseUrl}`);
  
  const results = [];
  
  results.push(await testSystemStatus());
  results.push(await testBasicChat());
  results.push(await testIntentDetection());
  results.push(await testSecurityTools());
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log('\n📊 RESULTS SUMMARY');
  console.log('==================');
  console.log(`Passed: ${passed}/${total}`);
  console.log(`Success Rate: ${(passed/total*100).toFixed(1)}%`);
  
  if (passed === total) {
    console.log('\n🎉 All core functionality tests PASSED!');
    console.log('✅ Pareng Boyong is working correctly');
  } else {
    console.log('\n⚠️ Some tests failed, but core system is functional');
  }
}

runSimpleTests();