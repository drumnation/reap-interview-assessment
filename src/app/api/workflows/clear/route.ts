import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { workflowStore } from '@/lib/workflow/store';

// POST /api/workflows/clear - Clear all workflow runs (requires auth)
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  workflowStore.clear();
  return NextResponse.json({ success: true, message: 'All workflow runs cleared' });
}
