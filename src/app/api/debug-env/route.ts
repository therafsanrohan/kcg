import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    secret: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || 'not found',
    db: process.env.DATABASE_URL || process.env.POSTGRES_URL || 'not found'
  });
}
