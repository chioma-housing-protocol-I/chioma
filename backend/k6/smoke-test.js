/**
 * k6 performance smoke tests for Chioma backend.
 *
 * Smoke tests are lightweight performance checks that verify critical endpoints
 * respond within acceptable thresholds under minimal load. These run quickly
 * and should be executed before full load tests.
 *
 * Run with:
 *   k6 run backend/k6/smoke-test.js -e BASE_URL=http://localhost:5000
 *
 * Environment variables:
 *   BASE_URL - Target API origin (default: http://localhost:5000)
 *
 * Each test uses 1-3 VUs for 30 seconds to verify basic functionality.
 */
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';
const API = `${BASE_URL}/api/v1`;

// Custom metrics
const healthCheckErrors = new Rate('health_check_errors');
const authErrors = new Rate('auth_errors');
const propertyListErrors = new Rate('property_list_errors');
const searchErrors = new Rate('search_errors');
const apiDocsErrors = new Rate('api_docs_errors');

const healthCheckDuration = new Trend('health_check_duration');
const authDuration = new Trend('auth_duration');
const propertyListDuration = new Trend('property_list_duration');
const searchDuration = new Trend('search_duration');
const apiDocsDuration = new Trend('api_docs_duration');

const totalRequests = new Counter('total_requests');
const totalErrors = new Counter('total_errors');

export const options = {
  scenarios: {
    // Smoke Test 1: Health Check Endpoint
    health_check: {
      executor: 'constant-vus',
      exec: 'testHealthCheck',
      vus: 1,
      duration: '30s',
      gracefulStop: '5s',
      tags: { test: 'health_check' },
    },
    
    // Smoke Test 2: Authentication Flow
    auth_flow: {
      executor: 'constant-vus',
      exec: 'testAuthFlow',
      vus: 2,
      duration: '30s',
      gracefulStop: '5s',
      tags: { test: 'auth_flow' },
    },
    
    // Smoke Test 3: Property Listing
    property_listing: {
      executor: 'constant-vus',
      exec: 'testPropertyListing',
      vus: 2,
      duration: '30s',
      gracefulStop: '5s',
      tags: { test: 'property_listing' },
    },
    
    // Smoke Test 4: Search Functionality
    search: {
      executor: 'constant-vus',
      exec: 'testSearch',
      vus: 3,
      duration: '30s',
      gracefulStop: '5s',
      tags: { test: 'search' },
    },
    
    // Smoke Test 5: API Documentation Access
    api_docs: {
      executor: 'constant-vus',
      exec: 'testApiDocs',
      vus: 1,
      duration: '30s',
      gracefulStop: '5s',
      tags: { test: 'api_docs' },
    },
  },
  
  thresholds: {
    // Health check must be fast and reliable
    'health_check_duration': ['p(95)<200', 'p(99)<500'],
    'health_check_errors': ['rate<0.01'],
    
    // Auth should complete quickly
    'auth_duration': ['p(95)<1000', 'p(99)<2000'],
    'auth_errors': ['rate<0.05'],
    
    // Property listing should be responsive
    'property_list_duration': ['p(95)<800', 'p(99)<1500'],
    'property_list_errors': ['rate<0.05'],
    
    // Search should be fast
    'search_duration': ['p(95)<1000', 'p(99)<2000'],
    'search_errors': ['rate<0.05'],
    
    // API docs should load quickly
    'api_docs_duration': ['p(95)<500', 'p(99)<1000'],
    'api_docs_errors': ['rate<0.01'],
    
    // Overall health
    'http_req_duration': ['p(95)<2000'],
    'http_req_failed': ['rate<0.05'],
  },
};

/**
 * Smoke Test 1: Health Check Endpoint
 * Verifies the health check endpoint responds quickly and correctly.
 * This is the most critical check for service availability.
 */
export function testHealthCheck() {
  group('Health Check', () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/health`);
    const duration = Date.now() - start;
    
    totalRequests.add(1);
    healthCheckDuration.add(duration);
    
    const passed = check(res, {
      'health: status is 200': (r) => r.status === 200,
      'health: response time < 500ms': () => duration < 500,
      'health: has status field': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.status !== undefined;
        } catch {
          return false;
        }
      },
    });
    
    if (!passed) {
      totalErrors.add(1);
      healthCheckErrors.add(1);
    } else {
      healthCheckErrors.add(0);
    }
    
    sleep(1);
  });
}

/**
 * Smoke Test 2: Authentication Flow
 * Tests user registration and login endpoints.
 * Ensures authentication system is responsive.
 */
export function testAuthFlow() {
  group('Authentication Flow', () => {
    const timestamp = Date.now();
    const uniqueId = `${timestamp}-${__VU}-${__ITER}`;
    const email = `smoke-test-${uniqueId}@example.com`;
    const password = 'SmokeTest123!';
    
    // Test registration
    const start = Date.now();
    const registerRes = http.post(
      `${API}/auth/register`,
      JSON.stringify({
        email,
        password,
        firstName: 'Smoke',
        lastName: 'Test',
        role: 'tenant',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
    const registerDuration = Date.now() - start;
    
    totalRequests.add(1);
    authDuration.add(registerDuration);
    
    const registerPassed = check(registerRes, {
      'auth: registration status is 201 or 409': (r) => 
        r.status === 201 || r.status === 409,
      'auth: registration time < 2000ms': () => registerDuration < 2000,
    });
    
    // Test login
    const loginStart = Date.now();
    const loginRes = http.post(
      `${API}/auth/login`,
      JSON.stringify({ email, password }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
    const loginDuration = Date.now() - loginStart;
    
    totalRequests.add(1);
    authDuration.add(loginDuration);
    
    const loginPassed = check(loginRes, {
      'auth: login status is 200 or 201': (r) => 
        r.status === 200 || r.status === 201,
      'auth: login time < 2000ms': () => loginDuration < 2000,
      'auth: returns access token': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.accessToken !== undefined;
        } catch {
          return false;
        }
      },
    });
    
    if (!registerPassed || !loginPassed) {
      totalErrors.add(1);
      authErrors.add(1);
    } else {
      authErrors.add(0);
    }
    
    sleep(1);
  });
}

/**
 * Smoke Test 3: Property Listing
 * Tests the property listing endpoint with pagination.
 * Critical for the main user flow.
 */
export function testPropertyListing() {
  group('Property Listing', () => {
    // Get auth token first
    const token = getAuthToken();
    if (!token) {
      totalErrors.add(1);
      propertyListErrors.add(1);
      sleep(1);
      return;
    }
    
    const start = Date.now();
    const res = http.get(
      `${API}/properties?limit=10&page=1`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    const duration = Date.now() - start;
    
    totalRequests.add(1);
    propertyListDuration.add(duration);
    
    const passed = check(res, {
      'properties: status is 200': (r) => r.status === 200,
      'properties: response time < 1500ms': () => duration < 1500,
      'properties: returns array': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.data) || Array.isArray(body);
        } catch {
          return false;
        }
      },
      'properties: has pagination info': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.meta !== undefined || body.pagination !== undefined;
        } catch {
          return true; // pagination might be optional
        }
      },
    });
    
    if (!passed) {
      totalErrors.add(1);
      propertyListErrors.add(1);
    } else {
      propertyListErrors.add(0);
    }
    
    sleep(1);
  });
}

/**
 * Smoke Test 4: Search Functionality
 * Tests property search with various parameters.
 * Essential for user discovery experience.
 */
export function testSearch() {
  group('Search Functionality', () => {
    const token = getAuthToken();
    if (!token) {
      totalErrors.add(1);
      searchErrors.add(1);
      sleep(1);
      return;
    }
    
    const searchTerms = ['apartment', 'house', 'studio', 'Lagos', 'Abuja'];
    const searchTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];
    
    const start = Date.now();
    const res = http.get(
      `${API}/properties?search=${searchTerm}&limit=20`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    const duration = Date.now() - start;
    
    totalRequests.add(1);
    searchDuration.add(duration);
    
    const passed = check(res, {
      'search: status is 200': (r) => r.status === 200,
      'search: response time < 2000ms': () => duration < 2000,
      'search: returns results': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.data) || Array.isArray(body);
        } catch {
          return false;
        }
      },
      'search: response size reasonable': (r) => r.body.length < 1000000, // < 1MB
    });
    
    if (!passed) {
      totalErrors.add(1);
      searchErrors.add(1);
    } else {
      searchErrors.add(0);
    }
    
    sleep(1);
  });
}

/**
 * Smoke Test 5: API Documentation Access
 * Verifies API documentation endpoints are accessible.
 * Important for developer experience and debugging.
 */
export function testApiDocs() {
  group('API Documentation', () => {
    const start = Date.now();
    const res = http.get(`${API}/docs-json`);
    const duration = Date.now() - start;
    
    totalRequests.add(1);
    apiDocsDuration.add(duration);
    
    const passed = check(res, {
      'docs: status is 200': (r) => r.status === 200,
      'docs: response time < 1000ms': () => duration < 1000,
      'docs: returns JSON': (r) => {
        try {
          JSON.parse(r.body);
          return true;
        } catch {
          return false;
        }
      },
      'docs: has openapi/swagger info': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.openapi !== undefined || body.swagger !== undefined;
        } catch {
          return false;
        }
      },
    });
    
    if (!passed) {
      totalErrors.add(1);
      apiDocsErrors.add(1);
    } else {
      apiDocsErrors.add(0);
    }
    
    sleep(2);
  });
}

/**
 * Helper function to get an auth token for authenticated requests.
 * Caches the token per VU to avoid excessive auth calls.
 */
let cachedToken = null;

function getAuthToken() {
  if (cachedToken) {
    return cachedToken;
  }
  
  const timestamp = Date.now();
  const uniqueId = `${timestamp}-${__VU}`;
  const email = `smoke-helper-${uniqueId}@example.com`;
  const password = 'SmokeHelper123!';
  
  // Try to register
  const registerRes = http.post(
    `${API}/auth/register`,
    JSON.stringify({
      email,
      password,
      firstName: 'Helper',
      lastName: 'Test',
      role: 'tenant',
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );
  
  if (registerRes.status === 201) {
    try {
      const body = JSON.parse(registerRes.body);
      cachedToken = body.accessToken;
      return cachedToken;
    } catch {
      // Continue to login attempt
    }
  }
  
  // Try to login
  const loginRes = http.post(
    `${API}/auth/login`,
    JSON.stringify({ email, password }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );
  
  if (loginRes.status === 200 || loginRes.status === 201) {
    try {
      const body = JSON.parse(loginRes.body);
      cachedToken = body.accessToken;
      return cachedToken;
    } catch {
      return null;
    }
  }
  
  return null;
}

export function handleSummary(data) {
  const summary = {
    test_name: 'Chioma Backend - Performance Smoke Tests',
    timestamp: new Date().toISOString(),
    duration: `${data.state.testRunDurationMs / 1000}s`,
    scenarios: {},
    overall: {
      total_requests: data.metrics.total_requests?.values.count || 0,
      total_errors: data.metrics.total_errors?.values.count || 0,
      error_rate: data.metrics.http_req_failed?.values.rate || 0,
      avg_duration: data.metrics.http_req_duration?.values.avg || 0,
      p95_duration: data.metrics.http_req_duration?.values['p(95)'] || 0,
      p99_duration: data.metrics.http_req_duration?.values['p(99)'] || 0,
    },
    individual_tests: {
      health_check: {
        error_rate: data.metrics.health_check_errors?.values.rate || 0,
        avg_duration: data.metrics.health_check_duration?.values.avg || 0,
        p95_duration: data.metrics.health_check_duration?.values['p(95)'] || 0,
      },
      auth_flow: {
        error_rate: data.metrics.auth_errors?.values.rate || 0,
        avg_duration: data.metrics.auth_duration?.values.avg || 0,
        p95_duration: data.metrics.auth_duration?.values['p(95)'] || 0,
      },
      property_listing: {
        error_rate: data.metrics.property_list_errors?.values.rate || 0,
        avg_duration: data.metrics.property_list_duration?.values.avg || 0,
        p95_duration: data.metrics.property_list_duration?.values['p(95)'] || 0,
      },
      search: {
        error_rate: data.metrics.search_errors?.values.rate || 0,
        avg_duration: data.metrics.search_duration?.values.avg || 0,
        p95_duration: data.metrics.search_duration?.values['p(95)'] || 0,
      },
      api_docs: {
        error_rate: data.metrics.api_docs_errors?.values.rate || 0,
        avg_duration: data.metrics.api_docs_duration?.values.avg || 0,
        p95_duration: data.metrics.api_docs_duration?.values['p(95)'] || 0,
      },
    },
  };
  
  return {
    'stdout': textSummary(data, { indent: '  ', enableColors: true }),
    'smoke-test-summary.json': JSON.stringify(summary, null, 2),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  const enableColors = options.enableColors || false;
  
  let output = '\n';
  output += `${indent}=== Chioma Backend - Performance Smoke Tests ===\n\n`;
  output += `${indent}Duration: ${(data.state.testRunDurationMs / 1000).toFixed(2)}s\n`;
  output += `${indent}Total Requests: ${data.metrics.total_requests?.values.count || 0}\n`;
  output += `${indent}Total Errors: ${data.metrics.total_errors?.values.count || 0}\n\n`;
  
  output += `${indent}--- Test Results ---\n`;
  output += `${indent}✓ Health Check: ${((1 - (data.metrics.health_check_errors?.values.rate || 0)) * 100).toFixed(1)}% success\n`;
  output += `${indent}✓ Auth Flow: ${((1 - (data.metrics.auth_errors?.values.rate || 0)) * 100).toFixed(1)}% success\n`;
  output += `${indent}✓ Property Listing: ${((1 - (data.metrics.property_list_errors?.values.rate || 0)) * 100).toFixed(1)}% success\n`;
  output += `${indent}✓ Search: ${((1 - (data.metrics.search_errors?.values.rate || 0)) * 100).toFixed(1)}% success\n`;
  output += `${indent}✓ API Docs: ${((1 - (data.metrics.api_docs_errors?.values.rate || 0)) * 100).toFixed(1)}% success\n\n`;
  
  return output;
}
