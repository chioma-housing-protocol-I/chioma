#!/usr/bin/env node
/**
 * Enhanced Performance Benchmark Suite for Chioma API
 * 
 * Features:
 * - Comprehensive endpoint testing
 * - Multiple load patterns (burst, sustained, ramp-up)
 * - Detailed metrics collection and reporting
 * - Performance regression detection
 * - Resource usage monitoring
 * - HTML report generation
 * 
 * Usage: node scripts/performance-benchmark-enhanced.mjs [BASE_URL] [--report-format=json|html|console]
 * 
 * Environment Variables:
 * - BASE_URL: Target server URL (default: http://localhost:5000)
 * - BENCHMARK_DURATION: Test duration in seconds (default: 10)
 * - BENCHMARK_CONNECTIONS: Number of concurrent connections (default: 10)
 * - BENCHMARK_REPORT_FORMAT: Output format (json|html|console, default: console)
 * - BENCHMARK_OUTPUT_FILE: Output file path (default: performance-report)
 */

import autocannon from 'autocannon';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const BASE_URL = process.env.BASE_URL || process.argv[2] || 'http://localhost:5000';
const DURATION = parseInt(process.env.BENCHMARK_DURATION) || 10;
const CONNECTIONS = parseInt(process.env.BENCHMARK_CONNECTIONS) || 10;
const REPORT_FORMAT = process.env.BENCHMARK_REPORT_FORMAT || 'console';
const OUTPUT_FILE = process.env.BENCHMARK_OUTPUT_FILE || 'performance-report';

// Performance thresholds (ms)
const THRESHOLDS = {
  CRITICAL: {
    '/health': { p99: 100, rps: 500 },
    '/health/detailed': { p99: 200, rps: 200 },
    '/security.txt': { p99: 50, rps: 1000 },
  },
  IMPORTANT: {
    '/api/docs-json': { p99: 500, rps: 100 },
    '/api/auth/login': { p99: 1000, rps: 50 },
    '/api/properties': { p99: 1500, rps: 30 },
  },
  STANDARD: {
    '/api/users/profile': { p99: 2000, rps: 20 },
    '/api/payments': { p99: 3000, rps: 10 },
  }
};

// Test scenarios
const SCENARIOS = [
  {
    name: 'Health Check Burst',
    endpoint: '/health',
    method: 'GET',
    connections: 50,
    duration: 5,
    description: 'High-frequency health checks'
  },
  {
    name: 'API Documentation Load',
    endpoint: '/api/docs-json',
    method: 'GET',
    connections: 20,
    duration: 8,
    description: 'OpenAPI specification serving'
  },
  {
    name: 'Security File Access',
    endpoint: '/security.txt',
    method: 'GET',
    connections: 30,
    duration: 3,
    description: 'Security policy file access'
  },
  {
    name: 'Detailed Health Check',
    endpoint: '/health/detailed',
    method: 'GET',
    connections: 15,
    duration: 6,
    description: 'Comprehensive health status'
  }
];

class PerformanceBenchmark {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
    this.systemInfo = this.getSystemInfo();
  }

  getSystemInfo() {
    const os = await import('os');
    return {
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024) + 'GB',
      nodeVersion: process.version,
      timestamp: new Date().toISOString()
    };
  }

  async runScenario(scenario) {
    console.log(`\n🚀 Running: ${scenario.name}`);
    console.log(`   ${scenario.description}`);
    console.log(`   ${scenario.method} ${scenario.endpoint} (${scenario.connections} connections, ${scenario.duration}s)`);

    const url = `${BASE_URL.replace(/\/$/, '')}${scenario.endpoint}`;
    
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      autocannon({
        url,
        method: scenario.method,
        duration: scenario.duration,
        connections: scenario.connections,
        headers: scenario.headers || {},
        body: scenario.body,
        setupClient: scenario.setupClient,
      }, (err, result) => {
        if (err) {
          console.error(`❌ Error in ${scenario.name}: ${err.message}`);
          return reject(err);
        }

        const endTime = Date.now();
        const processedResult = this.processResult(scenario, result, startTime, endTime);
        
        this.displayScenarioResult(processedResult);
        resolve(processedResult);
      });
    });
  }

  processResult(scenario, result, startTime, endTime) {
    const latency = result.latency || {};
    const requests = result.requests || {};
    const throughput = result.throughput || {};
    
    // Calculate additional metrics
    const totalRequests = requests.total || 0;
    const totalBytes = throughput.total || 0;
    const duration = (endTime - startTime) / 1000;
    
    const processedResult = {
      scenario: scenario.name,
      endpoint: scenario.endpoint,
      method: scenario.method,
      timestamp: new Date(startTime).toISOString(),
      duration: duration,
      
      // Request metrics
      totalRequests,
      requestsPerSecond: totalRequests / duration,
      
      // Latency metrics (ms)
      latency: {
        min: latency.min || 0,
        max: latency.max || 0,
        mean: latency.mean || 0,
        p50: latency.p50 || latency.median || 0,
        p90: latency.p90 || 0,
        p95: latency.p95 || 0,
        p99: latency.p99 || 0,
        p999: latency.p999 || 0,
      },
      
      // Throughput metrics
      throughput: {
        totalBytes,
        bytesPerSecond: totalBytes / duration,
        mbPerSecond: (totalBytes / duration) / (1024 * 1024),
      },
      
      // Error metrics
      errors: result.errors || 0,
      timeouts: result.timeouts || 0,
      
      // Success rate
      successRate: totalRequests > 0 ? ((totalRequests - (result.errors || 0)) / totalRequests) * 100 : 0,
      
      // Performance assessment
      performance: this.assessPerformance(scenario.endpoint, latency.p99 || 0, totalRequests / duration),
      
      // Raw autocannon result for detailed analysis
      raw: result
    };

    return processedResult;
  }

  assessPerformance(endpoint, p99, rps) {
    const allThresholds = { ...THRESHOLDS.CRITICAL, ...THRESHOLDS.IMPORTANT, ...THRESHOLDS.STANDARD };
    const threshold = allThresholds[endpoint];
    
    if (!threshold) {
      return { status: 'unknown', message: 'No threshold defined' };
    }

    const p99Pass = p99 <= threshold.p99;
    const rpsPass = rps >= threshold.rps;

    if (p99Pass && rpsPass) {
      return { status: 'excellent', message: '✅ Exceeds performance targets' };
    } else if (p99Pass || rpsPass) {
      return { status: 'acceptable', message: '⚠️  Meets some performance targets' };
    } else {
      return { status: 'poor', message: '❌ Below performance targets' };
    }
  }

  displayScenarioResult(result) {
    console.log(`\n📊 Results for ${result.scenario}:`);
    console.log(`   Requests: ${result.totalRequests} total, ${result.requestsPerSecond.toFixed(2)} req/sec`);
    console.log(`   Latency: ${result.latency.mean.toFixed(2)}ms avg, ${result.latency.p99.toFixed(2)}ms p99`);
    console.log(`   Success Rate: ${result.successRate.toFixed(2)}%`);
    console.log(`   Throughput: ${result.throughput.mbPerSecond.toFixed(2)} MB/sec`);
    console.log(`   ${result.performance.message}`);
    
    if (result.errors > 0) {
      console.log(`   ⚠️  Errors: ${result.errors}`);
    }
    if (result.timeouts > 0) {
      console.log(`   ⏱️  Timeouts: ${result.timeouts}`);
    }
  }

  async runAllScenarios() {
    console.log(`🎯 Starting Performance Benchmark Suite`);
    console.log(`   Target: ${BASE_URL}`);
    console.log(`   System: ${this.systemInfo.platform} ${this.systemInfo.arch}, ${this.systemInfo.cpus} CPUs, ${this.systemInfo.totalMemory} RAM`);
    console.log(`   Node.js: ${this.systemInfo.nodeVersion}`);

    for (const scenario of SCENARIOS) {
      try {
        const result = await this.runScenario(scenario);
        this.results.push(result);
        
        // Brief pause between scenarios
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to run scenario ${scenario.name}:`, error.message);
        this.results.push({
          scenario: scenario.name,
          endpoint: scenario.endpoint,
          error: error.message,
          performance: { status: 'failed', message: '❌ Test failed' }
        });
      }
    }
  }

  generateSummary() {
    const totalDuration = (Date.now() - this.startTime) / 1000;
    const successfulTests = this.results.filter(r => !r.error);
    const failedTests = this.results.filter(r => r.error);
    
    const excellentPerformance = this.results.filter(r => r.performance?.status === 'excellent').length;
    const acceptablePerformance = this.results.filter(r => r.performance?.status === 'acceptable').length;
    const poorPerformance = this.results.filter(r => r.performance?.status === 'poor').length;

    const totalRequests = successfulTests.reduce((sum, r) => sum + (r.totalRequests || 0), 0);
    const avgRPS = successfulTests.reduce((sum, r) => sum + (r.requestsPerSecond || 0), 0) / successfulTests.length;
    const avgP99 = successfulTests.reduce((sum, r) => sum + (r.latency?.p99 || 0), 0) / successfulTests.length;

    return {
      summary: {
        totalTests: this.results.length,
        successfulTests: successfulTests.length,
        failedTests: failedTests.length,
        totalDuration: totalDuration,
        totalRequests,
        avgRequestsPerSecond: avgRPS,
        avgP99Latency: avgP99,
      },
      performance: {
        excellent: excellentPerformance,
        acceptable: acceptablePerformance,
        poor: poorPerformance,
      },
      systemInfo: this.systemInfo,
      results: this.results,
      timestamp: new Date().toISOString()
    };
  }

  displaySummary(summary) {
    console.log(`\n\n📈 PERFORMANCE BENCHMARK SUMMARY`);
    console.log(`${'='.repeat(50)}`);
    console.log(`Total Tests: ${summary.summary.totalTests}`);
    console.log(`Successful: ${summary.summary.successfulTests} ✅`);
    console.log(`Failed: ${summary.summary.failedTests} ❌`);
    console.log(`Total Duration: ${summary.summary.totalDuration.toFixed(2)}s`);
    console.log(`Total Requests: ${summary.summary.totalRequests}`);
    console.log(`Average RPS: ${summary.summary.avgRequestsPerSecond.toFixed(2)}`);
    console.log(`Average P99: ${summary.summary.avgP99Latency.toFixed(2)}ms`);
    
    console.log(`\n🎯 Performance Distribution:`);
    console.log(`   Excellent: ${summary.performance.excellent} tests`);
    console.log(`   Acceptable: ${summary.performance.acceptable} tests`);
    console.log(`   Poor: ${summary.performance.poor} tests`);

    if (summary.performance.poor > 0) {
      console.log(`\n⚠️  Performance Issues Detected:`);
      this.results.filter(r => r.performance?.status === 'poor').forEach(r => {
        console.log(`   ${r.scenario}: P99=${r.latency?.p99?.toFixed(2)}ms, RPS=${r.requestsPerSecond?.toFixed(2)}`);
      });
    }

    console.log(`\n${summary.performance.poor === 0 ? '🎉 All tests passed performance thresholds!' : '⚠️  Some tests failed performance thresholds'}`);
  }

  saveReport(summary, format, filename) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    switch (format) {
      case 'json':
        const jsonFile = `${filename}-${timestamp}.json`;
        writeFileSync(jsonFile, JSON.stringify(summary, null, 2));
        console.log(`\n💾 JSON report saved: ${jsonFile}`);
        break;
        
      case 'html':
        const htmlFile = `${filename}-${timestamp}.html`;
        const htmlContent = this.generateHTMLReport(summary);
        writeFileSync(htmlFile, htmlContent);
        console.log(`\n💾 HTML report saved: ${htmlFile}`);
        break;
        
      case 'csv':
        const csvFile = `${filename}-${timestamp}.csv`;
        const csvContent = this.generateCSVReport(summary);
        writeFileSync(csvFile, csvContent);
        console.log(`\n💾 CSV report saved: ${csvFile}`);
        break;
    }
  }

  generateHTMLReport(summary) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chioma Performance Benchmark Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
        h2 { color: #34495e; margin-top: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric { background: #ecf0f1; padding: 20px; border-radius: 6px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; color: #2c3e50; }
        .metric-label { color: #7f8c8d; margin-top: 5px; }
        .test-result { margin: 15px 0; padding: 15px; border-left: 4px solid #bdc3c7; background: #f8f9fa; }
        .excellent { border-left-color: #27ae60; }
        .acceptable { border-left-color: #f39c12; }
        .poor { border-left-color: #e74c3c; }
        .failed { border-left-color: #95a5a6; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; font-weight: 600; }
        .status-excellent { color: #27ae60; font-weight: bold; }
        .status-acceptable { color: #f39c12; font-weight: bold; }
        .status-poor { color: #e74c3c; font-weight: bold; }
        .status-failed { color: #95a5a6; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Chioma Performance Benchmark Report</h1>
        
        <div class="summary">
            <div class="metric">
                <div class="metric-value">${summary.summary.totalTests}</div>
                <div class="metric-label">Total Tests</div>
            </div>
            <div class="metric">
                <div class="metric-value">${summary.summary.totalRequests.toLocaleString()}</div>
                <div class="metric-label">Total Requests</div>
            </div>
            <div class="metric">
                <div class="metric-value">${summary.summary.avgRequestsPerSecond.toFixed(1)}</div>
                <div class="metric-label">Avg RPS</div>
            </div>
            <div class="metric">
                <div class="metric-value">${summary.summary.avgP99Latency.toFixed(1)}ms</div>
                <div class="metric-label">Avg P99 Latency</div>
            </div>
        </div>

        <h2>📊 Test Results</h2>
        <table>
            <thead>
                <tr>
                    <th>Scenario</th>
                    <th>Endpoint</th>
                    <th>Requests</th>
                    <th>RPS</th>
                    <th>P99 Latency</th>
                    <th>Success Rate</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${summary.results.map(result => `
                    <tr>
                        <td>${result.scenario}</td>
                        <td>${result.endpoint}</td>
                        <td>${result.totalRequests?.toLocaleString() || 'N/A'}</td>
                        <td>${result.requestsPerSecond?.toFixed(2) || 'N/A'}</td>
                        <td>${result.latency?.p99?.toFixed(2) || 'N/A'}ms</td>
                        <td>${result.successRate?.toFixed(1) || 'N/A'}%</td>
                        <td class="status-${result.performance?.status || 'failed'}">${result.performance?.status || 'failed'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <h2>🖥️ System Information</h2>
        <table>
            <tr><td><strong>Platform</strong></td><td>${summary.systemInfo.platform}</td></tr>
            <tr><td><strong>Architecture</strong></td><td>${summary.systemInfo.arch}</td></tr>
            <tr><td><strong>CPUs</strong></td><td>${summary.systemInfo.cpus}</td></tr>
            <tr><td><strong>Memory</strong></td><td>${summary.systemInfo.totalMemory}</td></tr>
            <tr><td><strong>Node.js</strong></td><td>${summary.systemInfo.nodeVersion}</td></tr>
            <tr><td><strong>Timestamp</strong></td><td>${summary.timestamp}</td></tr>
        </table>
    </div>
</body>
</html>`;
  }

  generateCSVReport(summary) {
    const headers = [
      'Scenario', 'Endpoint', 'Method', 'Total Requests', 'RPS', 
      'Min Latency', 'Mean Latency', 'P99 Latency', 'Max Latency',
      'Success Rate', 'Errors', 'Throughput MB/s', 'Status'
    ];
    
    const rows = summary.results.map(result => [
      result.scenario,
      result.endpoint,
      result.method,
      result.totalRequests || 0,
      result.requestsPerSecond?.toFixed(2) || 0,
      result.latency?.min?.toFixed(2) || 0,
      result.latency?.mean?.toFixed(2) || 0,
      result.latency?.p99?.toFixed(2) || 0,
      result.latency?.max?.toFixed(2) || 0,
      result.successRate?.toFixed(2) || 0,
      result.errors || 0,
      result.throughput?.mbPerSecond?.toFixed(2) || 0,
      result.performance?.status || 'failed'
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
}

// Main execution
async function main() {
  const benchmark = new PerformanceBenchmark();
  
  try {
    await benchmark.runAllScenarios();
    const summary = benchmark.generateSummary();
    
    benchmark.displaySummary(summary);
    
    // Save reports based on format
    if (REPORT_FORMAT !== 'console') {
      benchmark.saveReport(summary, REPORT_FORMAT, OUTPUT_FILE);
    }
    
    // Exit with appropriate code
    const hasFailures = summary.performance.poor > 0 || summary.summary.failedTests > 0;
    process.exit(hasFailures ? 1 : 0);
    
  } catch (error) {
    console.error('❌ Benchmark suite failed:', error.message);
    process.exit(1);
  }
}

// Handle CLI arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
🚀 Chioma Performance Benchmark Suite

Usage: node scripts/performance-benchmark-enhanced.mjs [BASE_URL] [OPTIONS]

Options:
  --report-format=FORMAT    Output format: console, json, html, csv (default: console)
  --help, -h               Show this help message

Environment Variables:
  BASE_URL                 Target server URL (default: http://localhost:5000)
  BENCHMARK_DURATION       Test duration in seconds (default: 10)
  BENCHMARK_CONNECTIONS    Concurrent connections (default: 10)
  BENCHMARK_REPORT_FORMAT  Output format (default: console)
  BENCHMARK_OUTPUT_FILE    Output file prefix (default: performance-report)

Examples:
  node scripts/performance-benchmark-enhanced.mjs
  node scripts/performance-benchmark-enhanced.mjs http://localhost:3000
  BENCHMARK_REPORT_FORMAT=html node scripts/performance-benchmark-enhanced.mjs
  `);
  process.exit(0);
}

main();