#!/usr/bin/env node

/**
 * Direct Test Suite for Pareng Boyong - Fast validation
 */

import http from 'http';
import https from 'https';
import fs from 'fs';

const BASE_URL = 'http://localhost:5000';

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const requestUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
    const protocol = requestUrl.startsWith('https') ? https : http;
    
    const req = protocol.request(requestUrl, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      timeout: 5000
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

async function runDirectTests() {
  console.log('🚀 DIRECT TESTS - PARENG BOYONG VALIDATION');
  console.log('=' .repeat(50));

  const tests = [
    {
      name: 'System Status',
      test: async () => {
        const result = await makeRequest('/api/pareng-boyong/status');
        return result.status === 200 && result.data.status === 'active';
      }
    },
    {
      name: 'Context7 Status', 
      test: async () => {
        const result = await makeRequest('/api/context7/status');
        return result.status === 200 && result.data.success === true;
      }
    },
    {
      name: 'Context7 Library Fetch',
      test: async () => {
        const result = await makeRequest('/api/context7/library/express');
        return result.status === 200 && result.data.success === true;
      }
    },
    {
      name: 'Intent Detection Service',
      test: async () => {
        const result = await makeRequest('/api/pareng-boyong/chat', {
          method: 'POST',
          body: {
            message: 'scan this network with nmap',
            sessionId: 'intent-test',
            mode: 'default'
          }
        });
        return result.status === 200 && result.data.message;
      }
    },
    {
      name: 'Security Tools Check',
      test: async () => {
        return fs.existsSync('./workspace/tools/kali_toolkit_complete.py');
      }
    }
  ];

  let passed = 0;
  let total = tests.length;

  for (const test of tests) {
    try {
      console.log(`\n🧪 Testing ${test.name}...`);
      const result = await test.test();
      if (result) {
        console.log(`✅ ${test.name}: PASSED`);
        passed++;
      } else {
        console.log(`❌ ${test.name}: FAILED`);
      }
    } catch (error) {
      console.log(`❌ ${test.name}: ERROR - ${error.message}`);
    }
  }

  console.log('\n' + '=' .repeat(50));
  console.log(`📊 RESULTS: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 ALL TESTS PASSED - System is operational!');
  } else {
    console.log('⚠️ Some tests failed - Check individual results');
  }
}

// Run tests
runDirectTests().catch(console.error);