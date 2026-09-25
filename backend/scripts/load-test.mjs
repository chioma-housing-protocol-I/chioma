#!/usr/bin/env node
/**
 * Comprehensive Load Testing Script for Chioma API
 * 
 * This script runs various load testing scenarios against the API
 * and provides detailed performance analysis and reporting.
 * 
 * Usage:
 *   node scripts/load-test.mjs [environment] [scenario] [options]
 * 
 * Examples:
 *   node scripts/load-test.mjs local
 *   node scripts/load-test.mjs staging "Health Check Load Test"
 *   node scripts/load-test.mjs production --report-format=html
 * 
 * Options:
 *   --scenario=NAME          Run specific scenario only
 *   --report-format=FORMAT   Output format: console, json, html (default: console)
 *   --output-dir=PATH        Output directory for reports
 *   --duration=SECONDS       Override test duration
 *   --connections=NUMBER     Override connection count
 *   --verbose                Enable verbose logging
 */

import autocannon from 'autocannon';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load configuration
const configPath = join(__dirname, '../test/performance-config.json');
const config = JSON.parse(readFileSync(configPath, 'utf8'));

// Parse command line arguments
const args = process.argv.slice(2);
const environment = args[0] || 'local';
const options = {
  scenario: null,
  reportFormat: 'console',
  outputDir: './performance-reports',
  duration: null,
  connections: null,
  verbose: false,
};

// Parse options
args.forEach(arg => {
  if (arg.startsWith('--scenario=')) {
    options.scenario = arg.split('=')[1];
  } else if (arg.startsWith('--report-format=')) {
    options.reportFormat = arg.split('=')[1];
  } else if (arg.startsWith('--output-dir=')) {
    options.outputDir = arg.split('=')[1];
  } else if (arg.startsWith('--duration=')) {
    options.duration = parseInt(arg.split('=')[1]);
  } else if (arg.startsWith('--connections=')) {
    options.connections = parseInt(arg.split('=')[1]);
  } else if (arg === '--verbose') {
    options.verbose = true;
  }
});

class LoadTester {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
    this.authToken = null;
    
    // Validate environment
    if (!config.environments[environment]) {
      throw new Error(`Unknown environment: ${environment}. Available: ${Object.keys(config.environments).join(', ')}`);
    }
    
    this.envConfig = config.environments[environment];
    this.baseUrl = this.envConfig.baseUrl;
    
    console.log(`🚀 Load Testing Suite - Environment: ${environment}`);
    console.log(`   Target: ${this.baseUrl}`);
    console.log(`   Scenarios: ${options.scenario ? 1 : config.scenarios.length}`);
  }

  async setupAuthentication() {
    console.log('🔐 Setting up authentication...');
    
    try {
      // Create a test user and get auth token
      const registerResponse = await fetch(`${this.baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `loadtest-${Date.now()}@example.com`,
          password: 'LoadTest123!',
          firstName: 'Load',
          lastName: 'Test',
          role: 'tenant',
        }),
      });

      if (registerResponse.ok) {
        const data = await registerResponse.json();
        this.authToken = data.accessToken;
        console.log('✅ Authentication setup complete');
      } else {
        // Try to login with existing test user
        const loginResponse = await fetch(`${this.baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'TestPassword123!',
          }),
        });

        if (loginResponse.ok) {
          const data = await loginResponse.json();
          this.authToken = data.accessToken;
          console.log('✅ Authentication setup complete (existing user)');
        } else {
          console.warn('⚠️  Authentication setup failed, some tests may fail');
        }
      }
    } catch (error) {
      console.warn('⚠️  Authentication setup failed:', error.message);
    }
  }

  async runScenario(scenario) {
    const scenarioConfig = {
      ...scenario,
      connections: options.connections || scenario.connections || this.envConfig.connections,
      duration: options.duration || scenario.duration || this.envConfig.duration,
    };

    console.log(`\n🎯 Running: ${scenarioConfig.name}`);
    console.log(`   ${scenarioConfig.description}`);
    console.log(`   ${scenarioConfig.method} ${scenarioConfig.endpoint}`);
    console.log(`   Connections: ${scenarioConfig.connections}, Duration: ${scenarioConfig.duration}s`);

    const url = `${this.baseUrl}${scenarioConfig.endpoint}${scenarioConfig.queryParams || ''}`;
    const headers = {};

    // Add authentication if required
    if (scenarioConfig.requiresAuth && this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    // Add content type for POST requests
    if (scenarioConfig.method === 'POST' && scenarioConfig.payload) {
      headers['Content-Type'] = 'application/json';
    }

    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const cannonConfig = {
        url,
        method: scenarioConfig.method,
        duration: scenarioConfig.duration,
        connections: scenarioConfig.connections,
        headers,
      };

      // Add body for POST requests
      if (scenarioConfig.payload) {
        cannonConfig.body = JSON.stringify(scenarioConfig.payload);
      }

      if (options.verbose) {
        console.log('   Autocannon config:', cannonConfig);
      }

      autocannon(cannonConfig, (err, result) => {
        if (err) {
          console.error(`❌ Error in ${scenarioConfig.name}: ${err.message}`);
          return reject(err);
        }

        const endTime = Date.now();
        const processedResult = this.processResult(scenarioConfig, result, startTime, endTime);
        
        this.displayResult(processedResult);
        resolve(processedResult);
      });
    });
  }

  processResult(scenario, result, startTime, endTime) {
    const latency = result.latency || {};
    const requests = result.requests || {};
    const throughput = result.throughput || {};
    
    const totalRequests = requests.total || 0;
    const totalBytes = throughput.total || 0;
    const duration = (endTime - startTime) / 1000;
    const errors = result.errors || 0;
    const timeouts = result.timeouts || 0;

    const processedResult = {
      scenario: scenario.name,
      endpoint: scenario.endpoint,
      method: scenario.method,
      timestamp: new Date(startTime).toISOString(),
      duration,
      
      // Request metrics
      totalRequests,
      requestsPerSecond: totalRequests / duration,
      
      // Latency metrics
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
      errors,
      timeouts,
      successRate: totalRequests > 0 ? ((totalRequests - errors) / totalRequests) * 100 : 0,
      
      // Performance assessment
      performance: this.assessPerformance(scenario, latency.p99 || 0, totalRequests / duration, errors / totalRequests * 100),
      
      // Expected vs actual
      expected: {
        maxP99: scenario.expectedMaxP99,
        minRPS: scenario.expectedMinRPS,
      },
      
      // Pass/fail status
      passed: this.evaluateScenario(scenario, latency.p99 || 0, totalRequests / duration, errors / totalRequests * 100),
    };

    return processedResult;
  }

  assessPerformance(scenario, p99, rps, errorRate) {
    const p99Pass = p99 <= scenario.expectedMaxP99;
    const rpsPass = rps >= scenario.expectedMinRPS;
    const errorRatePass = errorRate <= 5; // 5% max error rate

    if (p99Pass && rpsPass && errorRatePass) {
      return { status: 'excellent', message: '✅ Exceeds all performance targets', score: 100 };
    } else if ((p99Pass && rpsPass) || (p99Pass && errorRatePass) || (rpsPass && errorRatePass)) {
      return { status: 'good', message: '✅ Meets most performance targets', score: 75 };
    } else if (p99Pass || rpsPass || errorRatePass) {
      return { status: 'acceptable', message: '⚠️  Meets some performance targets', score: 50 };
    } else {
      return { status: 'poor', message: '❌ Below performance targets', score: 25 };
    }
  }

  evaluateScenario(scenario, p99, rps, errorRate) {
    return p99 <= scenario.expectedMaxP99 && 
           rps >= scenario.expectedMinRPS && 
           errorRate <= 5;
  }

  displayResult(result) {
    console.log(`\n📊 Results:`);
    console.log(`   Requests: ${result.totalRequests.toLocaleString()} total (${result.requestsPerSecond.toFixed(2)} req/sec)`);
    console.log(`   Latency: ${result.latency.mean.toFixed(2)}ms avg, ${result.latency.p99.toFixed(2)}ms p99`);
    console.log(`   Success Rate: ${result.successRate.toFixed(2)}%`);
    console.log(`   Throughput: ${result.throughput.mbPerSecond.toFixed(2)} MB/sec`);
    console.log(`   ${result.performance.message} (Score: ${result.performance.score}/100)`);
    
    // Show comparison with expectations
    console.log(`\n📈 Performance vs Expectations:`);
    console.log(`   P99 Latency: ${result.latency.p99.toFixed(2)}ms (expected ≤ ${result.expected.maxP99}ms) ${result.latency.p99 <= result.expected.maxP99 ? '✅' : '❌'}`);
    console.log(`   Throughput: ${result.requestsPerSecond.toFixed(2)} RPS (expected ≥ ${result.expected.minRPS} RPS) ${result.requestsPerSecond >= result.expected.minRPS ? '✅' : '❌'}`);
    
    if (result.errors > 0) {
      console.log(`   ⚠️  Errors: ${result.errors} (${(result.errors / result.totalRequests * 100).toFixed(2)}%)`);
    }
    if (result.timeouts > 0) {
      console.log(`   ⏱️  Timeouts: ${result.timeouts}`);
    }
  }

  async runAllScenarios() {
    // Filter scenarios if specific one requested
    let scenariosToRun = config.scenarios;
    if (options.scenario) {
      scenariosToRun = config.scenarios.filter(s => s.name === options.scenario);
      if (scenariosToRun.length === 0) {
        throw new Error(`Scenario not found: ${options.scenario}`);
      }
    }

    // Setup authentication for scenarios that need it
    const needsAuth = scenariosToRun.some(s => s.requiresAuth || s.setupRequired);
    if (needsAuth) {
      await this.setupAuthentication();
    }

    // Run scenarios
    for (const scenario of scenariosToRun) {
      try {
        const result = await this.runScenario(scenario);
        this.results.push(result);
        
        // Brief pause between scenarios
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Failed to run scenario ${scenario.name}:`, error.message);
        this.results.push({
          scenario: scenario.name,
          endpoint: scenario.endpoint,
          error: error.message,
          passed: false,
          performance: { status: 'failed', message: '❌ Test failed', score: 0 }
        });
      }
    }
  }

  generateSummary() {
    const totalDuration = (Date.now() - this.startTime) / 1000;
    const successfulTests = this.results.filter(r => !r.error);
    const failedTests = this.results.filter(r => r.error);
    const passedTests = this.results.filter(r => r.passed);

    const totalRequests = successfulTests.reduce((sum, r) => sum + (r.totalRequests || 0), 0);
    const avgRPS = successfulTests.length > 0 
      ? successfulTests.reduce((sum, r) => sum + (r.requestsPerSecond || 0), 0) / successfulTests.length 
      : 0;
    const avgP99 = successfulTests.length > 0
      ? successfulTests.reduce((sum, r) => sum + (r.latency?.p99 || 0), 0) / successfulTests.length 
      : 0;
    const avgScore = this.results.length > 0
      ? this.results.reduce((sum, r) => sum + (r.performance?.score || 0), 0) / this.results.length
      : 0;

    return {
      environment,
      baseUrl: this.baseUrl,
      summary: {
        totalTests: this.results.length,
        successfulTests: successfulTests.length,
        failedTests: failedTests.length,
        passedTests: passedTests.length,
        passRate: (passedTests.length / this.results.length) * 100,
        totalDuration,
        totalRequests,
        avgRequestsPerSecond: avgRPS,
        avgP99Latency: avgP99,
        overallScore: avgScore,
      },
      results: this.results,
      timestamp: new Date().toISOString(),
      config: {
        environment: this.envConfig,
        options,
      }
    };
  }

  displaySummary(summary) {
    console.log(`\n\n🎯 LOAD TEST SUMMARY`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Environment: ${environment} (${summary.baseUrl})`);
    console.log(`Total Tests: ${summary.summary.totalTests}`);
    console.log(`Passed: ${summary.summary.passedTests} ✅ (${summary.summary.passRate.toFixed(1)}%)`);
    console.log(`Failed: ${summary.summary.failedTests} ❌`);
    console.log(`Total Duration: ${summary.summary.totalDuration.toFixed(2)}s`);
    console.log(`Total Requests: ${summary.summary.totalRequests.toLocaleString()}`);
    console.log(`Average RPS: ${summary.summary.avgRequestsPerSecond.toFixed(2)}`);
    console.log(`Average P99: ${summary.summary.avgP99Latency.toFixed(2)}ms`);
    console.log(`Overall Score: ${summary.summary.overallScore.toFixed(1)}/100`);

    // Show failed tests
    const failedResults = this.results.filter(r => !r.passed && !r.error);
    if (failedResults.length > 0) {
      console.log(`\n⚠️  Performance Issues:`);
      failedResults.forEach(r => {
        console.log(`   ${r.scenario}:`);
        console.log(`     P99: ${r.latency?.p99?.toFixed(2)}ms (expected ≤ ${r.expected?.maxP99}ms)`);
        console.log(`     RPS: ${r.requestsPerSecond?.toFixed(2)} (expected ≥ ${r.expected?.minRPS})`);
      });
    }

    // Show error tests
    const errorResults = this.results.filter(r => r.error);
    if (errorResults.length > 0) {
      console.log(`\n❌ Failed Tests:`);
      errorResults.forEach(r => {
        console.log(`   ${r.scenario}: ${r.error}`);
      });
    }

    const overallStatus = summary.summary.passRate >= 80 ? 
      '🎉 Load test passed!' : 
      '⚠️  Load test has issues that need attention';
    
    console.log(`\n${overallStatus}`);
  }

  saveReport(summary) {
    // Create output directory
    if (!existsSync(options.outputDir)) {
      mkdirSync(options.outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseFilename = `load-test-${environment}-${timestamp}`;

    // Save JSON report
    if (options.reportFormat === 'json' || options.reportFormat === 'all') {
      const jsonFile = join(options.outputDir, `${baseFilename}.json`);
      writeFileSync(jsonFile, JSON.stringify(summary, null, 2));
      console.log(`\n💾 JSON report saved: ${jsonFile}`);
    }

    // Save HTML report
    if (options.reportFormat === 'html' || options.reportFormat === 'all') {
      const htmlFile = join(options.outputDir, `${baseFilename}.html`);
      const htmlContent = this.generateHTMLReport(summary);
      writeFileSync(htmlFile, htmlContent);
      console.log(`💾 HTML report saved: ${htmlFile}`);
    }
  }

  generateHTMLReport(summary) {
    const chartData = summary.results.map(r => ({
      scenario: r.scenario,
      p99: r.latency?.p99 || 0,
      rps: r.requestsPerSecond || 0,
      score: r.performance?.score || 0,
      passed: r.passed
    }));

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Load Test Report - ${environment}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: white; padding: 30px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric { background: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric-value { font-size: 2em; font-weight: bold; color: #2c3e50; }
        .metric-label { color: #7f8c8d; margin-top: 5px; }
        .chart-container { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .results-table { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; font-weight: 600; }
        .status-passed { color: #28a745; font-weight: bold; }
        .status-failed { color: #dc3545; font-weight: bold; }
        .status-error { color: #6c757d; font-weight: bold; }
        h1 { color: #2c3e50; margin: 0; }
        h2 { color: #34495e; margin-top: 0; }
        .timestamp { color: #6c757d; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Load Test Report</h1>
            <p><strong>Environment:</strong> ${environment} (${summary.baseUrl})</p>
            <p class="timestamp">Generated: ${summary.timestamp}</p>
        </div>

        <div class="summary">
            <div class="metric">
                <div class="metric-value">${summary.summary.totalTests}</div>
                <div class="metric-label">Total Tests</div>
            </div>
            <div class="metric">
                <div class="metric-value">${summary.summary.passRate.toFixed(1)}%</div>
                <div class="metric-label">Pass Rate</div>
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
            <div class="metric">
                <div class="metric-value">${summary.summary.overallScore.toFixed(1)}</div>
                <div class="metric-label">Overall Score</div>
            </div>
        </div>

        <div class="chart-container">
            <h2>Performance Overview</h2>
            <canvas id="performanceChart" width="400" height="200"></canvas>
        </div>

        <div class="results-table">
            <h2>Detailed Results</h2>
            <table>
                <thead>
                    <tr>
                        <th>Scenario</th>
                        <th>Endpoint</th>
                        <th>Requests</th>
                        <th>RPS</th>
                        <th>P99 Latency</th>
                        <th>Success Rate</th>
                        <th>Score</th>
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
                            <td>${result.performance?.score || 0}/100</td>
                            <td class="status-${result.error ? 'error' : result.passed ? 'passed' : 'failed'}">
                                ${result.error ? 'ERROR' : result.passed ? 'PASSED' : 'FAILED'}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>

    <script>
        const ctx = document.getElementById('performanceChart').getContext('2d');
        const chartData = ${JSON.stringify(chartData)};
        
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: chartData.map(d => d.scenario),
                datasets: [{
                    label: 'Performance Score',
                    data: chartData.map(d => d.score),
                    backgroundColor: chartData.map(d => d.passed ? '#28a745' : '#dc3545'),
                    borderColor: chartData.map(d => d.passed ? '#1e7e34' : '#c82333'),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Performance Score'
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Performance Scores by Scenario'
                    }
                }
            }
        });
    </script>
</body>
</html>`;
  }
}

// Main execution
async function main() {
  try {
    const loadTester = new LoadTester();
    await loadTester.runAllScenarios();
    
    const summary = loadTester.generateSummary();
    loadTester.displaySummary(summary);
    
    // Save report if requested
    if (options.reportFormat !== 'console') {
      loadTester.saveReport(summary);
    }
    
    // Exit with appropriate code
    const success = summary.summary.passRate >= 80;
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Load test failed:', error.message);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Show help
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🚀 Chioma Load Testing Suite

Usage: node scripts/load-test.mjs [environment] [options]

Environments: ${Object.keys(config.environments).join(', ')}

Options:
  --scenario=NAME          Run specific scenario only
  --report-format=FORMAT   Output format: console, json, html (default: console)
  --output-dir=PATH        Output directory for reports (default: ./performance-reports)
  --duration=SECONDS       Override test duration
  --connections=NUMBER     Override connection count
  --verbose                Enable verbose logging
  --help, -h              Show this help message

Examples:
  node scripts/load-test.mjs local
  node scripts/load-test.mjs staging --report-format=html
  node scripts/load-test.mjs production --scenario="Health Check Load Test"
  `);
  process.exit(0);
}

main();