import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ error: 'Endpoint disabled for production security.' }, { status: 403 })
}
