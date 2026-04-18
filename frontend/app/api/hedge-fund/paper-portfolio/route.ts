import { NextRequest, NextResponse } from 'next/server';

const STRATTON_API_URL = process.env.STRATTON_API_URL || 'http://localhost:8000';

export async function GET() {
  try {
    const res = await fetch(`${STRATTON_API_URL}/api/paper-portfolio`);
    if (!res.ok) throw new Error(`Stratton API error: ${res.status}`);
    return NextResponse.json(await res.json());
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const endpoint = body._action === 'reset' ? '/api/paper-reset' : '/api/paper-trade';
    delete body._action;

    const res = await fetch(`${STRATTON_API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: errText }, { status: res.status });
    }
    return NextResponse.json(await res.json());
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 503 });
  }
}
