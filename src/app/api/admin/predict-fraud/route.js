import { NextResponse } from 'next/server';
import { predictFraudScore } from '@/backend/services/ml';
// import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        // TODO: Add Admin Authentication check here
        // const session = await getServerSession(authOptions);
        // if (!session || session.user.role !== 'admin') {
        //     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        // }

        const body = await request.json();
        const { goalAmount, title, description, documents } = body;

        if (!goalAmount || !description) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const result = await predictFraudScore({ goalAmount, title, description, documents });

        return NextResponse.json(result);
    } catch (error) {
        console.error("Prediction API Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
