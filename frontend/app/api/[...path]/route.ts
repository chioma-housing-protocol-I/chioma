import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/api/backend-proxy';

type RouteContext = { params: Promise<{ path: string[] }> };

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': process.env.CORS_ALLOW_ORIGIN ?? '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-Requested-With, Idempotency-Key',
  // Lets browsers cache the preflight for 24h instead of re-sending
  // an OPTIONS request before every complex call.
  'Access-Control-Max-Age': '86400',
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

async function handle(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyToBackend(request, path);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
