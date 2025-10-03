import { NextRequest, NextResponse } from 'next/server';

export const POST = async (request: NextRequest) => {
  // Claude agent API calls will be implemented here
  return NextResponse.json({ message: 'Analyze endpoint ready' });
}
