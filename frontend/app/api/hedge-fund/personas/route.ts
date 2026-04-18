import { NextRequest, NextResponse } from 'next/server';

const STRATTON_API_URL = process.env.STRATTON_API_URL || 'http://localhost:8000';

export async function GET() {
  try {
    const res = await fetch(`${STRATTON_API_URL}/api/personas`);
    if (!res.ok) throw new Error(`Stratton API error: ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message, personas: {} }, { status: 503 });
  }
}
