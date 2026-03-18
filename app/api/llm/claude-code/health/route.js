import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET() {
  try {
    await execAsync('which claude');
    return NextResponse.json({ available: true });
  } catch {
    return NextResponse.json({ available: false, error: 'Claude Code CLI not installed' }, { status: 200 });
  }
}
