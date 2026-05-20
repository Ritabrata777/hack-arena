import { NextResponse } from 'next/server';
import { runTraining } from '@/backend/services/ml';

export const dynamic = 'force-dynamic'; // Prevent static caching

export async function GET(request) {
    // Basic auth using secret (optional but recommended for cron)
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        // Allow unauthenticated for dev/demo if needed, or strictly enforce
        // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const output = await runTraining();
        return NextResponse.json({ success: true, message: "Training completed", output });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
