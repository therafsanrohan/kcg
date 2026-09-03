import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    secret: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || 'not found'
  });
}
