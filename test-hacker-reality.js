/**
 * Reality Check Test for Pareng Boyong Hacker Mode
 * Tests whether security assessments are real or just AI-generated assumptions
 */

async function makeRequest(endpoint, options = {}) {
  const baseUrl = 'http://localhost:5000';
  const url = `${baseUrl}${endpoint}`;
  
  const defaultOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    ...options
  };

  const response = await fetch(url, defaultOptions);
  const data = await response.json();
  return data;
}

async function testRealSecurityTesting() {
  console.log('🕵️ TESTING: Real vs Fake Security Assessment');
  console.log('='.repeat(50));
  
  // Test 1: Ask for nmap scan with specific target
  console.log('\n🧪 Test 1: Real Network Scan Request');
  const scanRequest = {
    message: 'Use nmap to scan ports 80-443 on 127.0.0.1 and show me the actual command output',
    sessionId: 'reality-test-' + Date.now(),
    mode: 'hacker'
  };

  try {
    console.log('📡 Sending request for real nmap scan...');
    const response = await makeRequest('/api/pareng-boyong/chat', {
      method: 'POST',
      body: JSON.stringify(scanRequest)
    });

    console.log('\n📄 Response Analysis:');
    console.log('Length:', response.message.length);
    
    // Check if response contains real command execution
    const hasRealExecution = [
      'Nmap scan report',
      'PORT',
      'STATE',
      'SERVICE',
      'Starting Nmap',
      'Host is up'
    ].some(indicator => response.message.includes(indicator));

    // Check if response contains typical AI assumptions
    const hasAssumptions = [
      'would show',
      'typically reveals',
      'might indicate',
      'could be',
      'assuming',
      'example output',
      'simulated'
    ].some(assumption => response.message.toLowerCase().includes(assumption));

    console.log('🔍 Real execution indicators found:', hasRealExecution);
    console.log('🤖 AI assumption patterns found:', hasAssumptions);
    
    if (hasRealExecution && !hasAssumptions) {
      console.log('✅ REAL SECURITY TESTING: Appears to execute actual commands');
    } else if (hasAssumptions) {
      console.log('❌ FAKE SECURITY TESTING: Making assumptions, not executing real commands');
    } else {
      console.log('❓ UNCLEAR: Unable to determine if real or simulated');
    }

    console.log('\n📋 Sample Response (first 300 chars):');
    console.log(response.message.substring(0, 300) + '...');

  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

async function testToolAvailability() {
  console.log('\n\n🔧 TESTING: Actual Tool Availability');
  console.log('='.repeat(50));
  
  try {
    const toolsResponse = await makeRequest('/api/pareng-boyong/tools');
    console.log('📋 Available tools response:', toolsResponse);
    
    // Check if tools are actually installed or just listed
    console.log('\n🧪 Tool Reality Check:');
    console.log('- Tools listed:', toolsResponse.length || 0);
    
    if (Array.isArray(toolsResponse) && toolsResponse.length > 0) {
      console.log('✅ Tools endpoint returns data');
    } else {
      console.log('❌ No actual tools detected');
    }
  } catch (error) {
    console.log('❌ Tool check failed:', error.message);
  }
}

async function testTerminalExecution() {
  console.log('\n\n⚡ TESTING: Real Terminal Command Execution');
  console.log('='.repeat(50));
  
  const terminalTest = {
    message: 'Execute "whoami" command and show me the actual output',
    sessionId: 'terminal-test-' + Date.now(),
    mode: 'hacker'
  };

  try {
    console.log('📡 Testing terminal command execution...');
    const response = await makeRequest('/api/pareng-boyong/chat', {
      method: 'POST',
      body: JSON.stringify(terminalTest)
    });

    // Check for real command output vs simulated
    const hasRealOutput = response.message.includes('runner') || 
                          response.message.includes('root') ||
                          response.message.includes('$');
    
    const hasSimulation = response.message.toLowerCase().includes('would return') ||
                          response.message.toLowerCase().includes('example:') ||
                          response.message.toLowerCase().includes('simulate');

    console.log('🔍 Real command output detected:', hasRealOutput);
    console.log('🎭 Simulated response detected:', hasSimulation);
    
    if (hasRealOutput && !hasSimulation) {
      console.log('✅ REAL TERMINAL ACCESS: Commands actually executed');
    } else {
      console.log('❌ SIMULATED TERMINAL: Not executing real commands');
    }

    console.log('\n📋 Terminal Response:');
    console.log(response.message.substring(0, 200) + '...');

  } catch (error) {
    console.log('❌ Terminal test failed:', error.message);
  }
}

async function runRealityCheck() {
  console.log('🚨 PARENG BOYONG HACKER MODE REALITY CHECK');
  console.log('Testing whether security capabilities are real or simulated');
  console.log('='.repeat(60));
  
  await testRealSecurityTesting();
  await testToolAvailability();
  await testTerminalExecution();
  
  console.log('\n' + '='.repeat(60));
  console.log('🎯 CONCLUSION:');
  console.log('If Pareng Boyong is truly confident but making assumptions,');
  console.log('it means the AI is generating plausible-sounding security advice');
  console.log('without actually executing real security tools or commands.');
  console.log('Real penetration testing requires actual tool execution.');
}

// Run the test
runRealityCheck().catch(console.error);