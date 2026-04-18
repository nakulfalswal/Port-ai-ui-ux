import { NextRequest, NextResponse } from 'next/server';

const STRATTON_API_URL = process.env.STRATTON_API_URL || 'http://localhost:8000';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${STRATTON_API_URL}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: errText }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: `AI Hedge Fund backend is offline. Start it with: uvicorn api_server:app --port 8000. Detail: ${error.message}` },
      { status: 503 }
    );
  }
}
