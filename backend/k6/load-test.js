/**
 * k6 load/stress suite for issue #1616.
 *
 * Covers the three core user flows: property search, booking creation, and
 * payment submission. Run against a target environment with:
 *
 *   k6 run backend/k6/load-test.js \
 *     -e BASE_URL=https://staging-api.chioma.com
 *
 * Tunables (all optional):
 *   BASE_URL          Target API origin (default http://localhost:5000)
 *   K6_VUS_PEAK        Peak virtual users per scenario (default 20)
 *   K6_RAMP_DURATION   Ramp-up/ramp-down duration, e.g. "30s" (default 30s)
 *   K6_HOLD_DURATION   Steady-state hold duration, e.g. "1m" (default 1m)
 *
 * The target environment needs at least one published property for the
 * booking scenario to exercise real bookings — otherwise it logs a warning
 * in setup() and that scenario's iterations become no-ops.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';
const API = `${BASE_URL}/api/v1`;

const VUS_PEAK = Number(__ENV.K6_VUS_PEAK || 20);
const RAMP_DURATION = __ENV.K6_RAMP_DURATION || '30s';
const HOLD_DURATION = __ENV.K6_HOLD_DURATION || '1m';

const searchErrors = new Rate('search_errors');
const bookingErrors = new Rate('booking_errors');
const paymentErrors = new Rate('payment_errors');
const bookingConflicts = new Trend('booking_conflicts', true);

function rampStages() {
  return [
    { duration: RAMP_DURATION, target: VUS_PEAK },
    { duration: HOLD_DURATION, target: VUS_PEAK },
    { duration: RAMP_DURATION, target: 0 },
  ];
}

export const options = {
  scenarios: {
    search: {
      executor: 'ramping-vus',
      exec: 'searchScenario',
      startVUs: 0,
      stages: rampStages(),
      gracefulRampDown: '10s',
      tags: { scenario: 'search' },
    },
    booking_creation: {
      executor: 'ramping-vus',
      exec: 'bookingScenario',
      startVUs: 0,
      stages: rampStages(),
      gracefulRampDown: '10s',
      tags: { scenario: 'booking_creation' },
    },
    payment_submission: {
      executor: 'ramping-vus',
      exec: 'paymentScenario',
      startVUs: 0,
      stages: rampStages(),
      gracefulRampDown: '10s',
      tags: { scenario: 'payment_submission' },
    },
  },
  thresholds: {
    'http_req_duration{scenario:search}': ['p(95)<1500', 'p(99)<3000'],
    'http_req_duration{scenario:booking_creation}': [
      'p(95)<2000',
      'p(99)<4000',
    ],
    'http_req_duration{scenario:payment_submission}': [
      'p(95)<2500',
      'p(99)<5000',
    ],
    search_errors: ['rate<0.05'],
    booking_errors: ['rate<0.05'],
    payment_errors: ['rate<0.05'],
  },
};

function authHeaders(token) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
}

export function setup() {
  const runId = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const email = `k6-loadtest-${runId}@example.com`;
  const password = 'LoadTest123!';

  const registerRes = http.post(
    `${API}/auth/register`,
    JSON.stringify({
      email,
      password,
      firstName: 'K6',
      lastName: 'LoadTest',
      role: 'user',
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  let token = registerRes.status === 201 ? registerRes.json('accessToken') : null;

  if (!token) {
    const loginRes = http.post(
      `${API}/auth/login`,
      JSON.stringify({ email, password }),
      { headers: { 'Content-Type': 'application/json' } },
    );
    token = loginRes.json('accessToken');
  }

  if (!token) {
    throw new Error(
      `k6 setup could not obtain an auth token (register status ${registerRes.status}). Aborting run.`,
    );
  }

  const propsRes = http.get(`${API}/properties?limit=5`, authHeaders(token));
  const properties =
    propsRes.status === 200 && Array.isArray(propsRes.json('data'))
      ? propsRes.json('data')
      : [];
  const propertyId = properties.length > 0 ? properties[0].id : null;

  const pmRes = http.post(
    `${API}/payment-methods`,
    JSON.stringify({ paymentType: 'card', lastFour: '4242', isDefault: true }),
    authHeaders(token),
  );
  const paymentMethodId =
    pmRes.status === 201 && pmRes.json('id') != null
      ? String(pmRes.json('id'))
      : null;

  if (!propertyId) {
    console.warn(
      'k6 setup: no properties found on the target environment — booking_creation iterations will be skipped. Seed at least one published property before running.',
    );
  }
  if (!paymentMethodId) {
    console.warn(
      'k6 setup: could not create a payment method — payment_submission iterations will be skipped.',
    );
  }

  return { token, propertyId, paymentMethodId };
}

export function searchScenario(data) {
  const cities = ['Lagos', 'Abuja', 'Nairobi', 'Accra'];
  const city = cities[Math.floor(Math.random() * cities.length)];
  const res = http.get(
    `${API}/properties?search=apartment&city=${city}&limit=10`,
    authHeaders(data.token),
  );
  const ok = check(res, { 'search: status 200': (r) => r.status === 200 });
  searchErrors.add(!ok);
  sleep(1);
}

export function bookingScenario(data) {
  if (!data.propertyId) {
    sleep(1);
    return;
  }
  const checkIn = randomFutureDate(30, 300);
  const checkOut = addDays(checkIn, 3 + Math.floor(Math.random() * 5));
  const res = http.post(
    `${API}/bookings`,
    JSON.stringify({
      propertyId: data.propertyId,
      checkIn,
      checkOut,
      guests: 1 + Math.floor(Math.random() * 3),
    }),
    authHeaders(data.token),
  );
  // 400/409 are expected business-rule outcomes (validation, double-booking
  // conflicts) under concurrent load — only 5xx/network failures are infra errors.
  const infraOk = res.status < 500;
  const ok = check(res, { 'booking: no server error': () => infraOk });
  bookingErrors.add(!ok);
  if (res.status === 409 || res.status === 400) {
    bookingConflicts.add(1);
  }
  sleep(1);
}

export function paymentScenario(data) {
  if (!data.paymentMethodId) {
    sleep(1);
    return;
  }
  const res = http.post(
    `${API}/payments`,
    JSON.stringify({
      amount: Math.round((50 + Math.random() * 950) * 100) / 100,
      paymentMethodId: data.paymentMethodId,
      referenceNumber: `k6-${__VU}-${__ITER}-${Date.now()}`,
    }),
    authHeaders(data.token),
  );
  const infraOk = res.status < 500;
  const ok = check(res, { 'payment: no server error': () => infraOk });
  paymentErrors.add(!ok);
  sleep(1);
}

function randomFutureDate(minDays, maxDays) {
  const days = minDays + Math.floor(Math.random() * (maxDays - minDays));
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
