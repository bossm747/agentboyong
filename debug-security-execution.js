/**
 * Debug script to test the real security execution integration
 */

async function testSecurityDetection() {
  console.log('🔍 Testing security operation detection...');
  
  const testMessage = 'Use nmap to scan ports 80-443 on 127.0.0.1 and show me the actual command output';
  
  try {
    // Import the real security executor
    const { default: RealSecurityExecutor } = await import('./server/services/realSecurityExecutor.js');
    
    const executor = new RealSecurityExecutor('debug-test');
    
    // Test detection
    const detection = await executor.detectSecurityOperation(testMessage);
    console.log('Detection result:', detection);
    
    if (detection.isSecurityOperation && detection.tool && detection.args) {
      console.log('✅ Security operation detected correctly');
      console.log('Tool:', detection.tool);
      console.log('Args:', detection.args);
      console.log('Target:', detection.target);
      
      // Test execution
      console.log('\n🔧 Testing real execution...');
      const result = await executor.executeSecurityCommand(
        detection.tool,
        detection.args,
        detection.target
      );
      
      console.log('\nExecution result:');
      console.log('Success:', result.success);
      console.log('Command:', result.command);
      console.log('Output:', result.output.substring(0, 200) + '...');
      console.log('Real execution:', result.realExecution);
      
    } else {
      console.log('❌ Security operation not detected');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testSecurityDetection().catch(console.error);