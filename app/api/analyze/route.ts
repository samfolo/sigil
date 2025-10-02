import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // Claude agent API calls will be implemented here
  return NextResponse.json({ message: 'Analyze endpoint ready' });
}
