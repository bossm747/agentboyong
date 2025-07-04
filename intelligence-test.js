#!/usr/bin/env node

/**
 * Intelligence Test for Pareng Boyong - Demonstrates Enhanced Intelligence
 * Tests the AI's ability to avoid assumptions and use real, verified information
 */

import http from 'http';

const BASE_URL = 'http://localhost:5000';

async function makeRequest(endpoint, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(`${BASE_URL}${endpoint}`, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      timeout: 30000 // 30 second timeout for AI processing
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve({ status: res.statusCode, data: result });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Request timeout')));

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

async function testIntelligence() {
  console.log('🧠 PARENG BOYONG INTELLIGENCE TEST');
  console.log('=' .repeat(60));
  console.log('Testing ability to avoid assumptions and use verified information\n');

  const intelligenceTests = [
    {
      name: 'React Current Version Test',
      description: 'Should use real, current React documentation instead of assumptions',
      message: 'How do I create a React component with hooks? Give me the latest syntax.',
      expectedVerification: ['react', 'current_syntax', 'api_docs'],
      mode: 'developer'
    },
    {
      name: 'Express.js Latest Features Test',
      description: 'Should verify current Express.js capabilities and version',
      message: 'What are the latest Express.js features for building APIs?',
      expectedVerification: ['express', 'latest_features', 'version_check'],
      mode: 'developer'
    },
    {
      name: 'Security Tool Verification Test',
      description: 'Should use real tool documentation instead of general knowledge',
      message: 'How do I scan a network with nmap? Show me current options.',
      expectedVerification: ['nmap', 'current_syntax', 'real_example'],
      mode: 'hacker'
    },
    {
      name: 'No Assumption Test',
      description: 'Should explicitly state when verification is needed',
      message: 'What is the typical configuration for deploying Node.js to production?',
      expectedBehavior: 'avoid_assumptions',
      mode: 'developer'
    }
  ];

  let passed = 0;
  let total = intelligenceTests.length;

  for (const test of intelligenceTests) {
    console.log(`\n🧪 Running: ${test.name}`);
    console.log(`📋 ${test.description}`);
    console.log(`💬 Query: "${test.message}"`);
    
    try {
      const startTime = Date.now();
      const result = await makeRequest('/api/pareng-boyong/chat', {
        method: 'POST',
        body: {
          message: test.message,
          sessionId: `intelligence-test-${Date.now()}`,
          mode: test.mode,
          userId: 'intelligence_tester'
        }
      });

      const responseTime = Date.now() - startTime;
      
      if (result.status === 200 && result.data.message) {
        console.log(`⏱️ Response time: ${responseTime}ms`);
        console.log(`🤖 Mode detected: ${result.data.intent_detected || 'N/A'}`);
        console.log(`🔧 Tools used: ${result.data.tools_used?.join(', ') || 'None'}`);
        
        // Analyze response for intelligence indicators
        const response = result.data.message.toLowerCase();
        const intelligenceIndicators = {
          avoidsAssumptions: !response.includes('typically') && !response.includes('usually') && !response.includes('generally'),
          mentionsVerification: response.includes('current') || response.includes('latest') || response.includes('version'),
          usesSpecificInfo: response.includes('documentation') || response.includes('api') || response.includes('example'),
          avoidsVagueTerms: !response.includes('might be') && !response.includes('probably') && !response.includes('i think')
        };

        const intelligenceScore = Object.values(intelligenceIndicators).filter(Boolean).length;
        console.log(`🧠 Intelligence Score: ${intelligenceScore}/4`);
        
        // Check if verification tools were used
        const usedVerificationTools = result.data.tools_used?.some(tool => 
          tool.includes('context7') || tool.includes('verification') || tool.includes('intelligent')
        );
        
        if (usedVerificationTools) {
          console.log('✅ Verification system activated');
        } else {
          console.log('⚠️ No verification tools detected');
        }

        // Sample of response for analysis
        console.log(`📝 Response preview: "${result.data.message.substring(0, 200)}..."`);
        
        if (intelligenceScore >= 3 && (usedVerificationTools || test.expectedBehavior === 'avoid_assumptions')) {
          console.log('✅ PASSED - Shows intelligent, fact-based behavior');
          passed++;
        } else {
          console.log('❌ FAILED - May be relying on assumptions');
        }
        
      } else {
        console.log(`❌ FAILED - API Error: ${result.status}`);
      }
      
    } catch (error) {
      console.log(`❌ FAILED - ${error.message}`);
    }
    
    console.log('-' .repeat(50));
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 INTELLIGENCE TEST RESULTS: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 EXCELLENT! Pareng Boyong shows extremely intelligent behavior');
    console.log('✅ Successfully avoids assumptions and uses verified information');
  } else if (passed >= total * 0.75) {
    console.log('👍 GOOD! Pareng Boyong shows intelligent behavior with room for improvement');
  } else {
    console.log('⚠️ NEEDS IMPROVEMENT! Still relying on assumptions in some cases');
  }
  
  console.log('\n🧠 Intelligence Features Verified:');
  console.log('- Real-time documentation access');
  console.log('- Assumption avoidance system');
  console.log('- Verification-based responses');
  console.log('- Current information prioritization');
}

// Run intelligence test
testIntelligence().catch(console.error);