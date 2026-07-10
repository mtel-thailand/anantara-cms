import { NextRequest, NextResponse } from 'next/server';

const allowedOrigins = [process.env.NEXT_PUBLIC_ANANTARA_CLIENT_BASE_URL!];

export function applyCors(request: NextRequest, response: NextResponse) {
  const origin = request.headers.get('origin');

  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }

  response.headers.set(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  );

  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization',
  );

  return response;
}
