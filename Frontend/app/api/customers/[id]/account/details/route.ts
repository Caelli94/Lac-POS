
import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001/api';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    console.log("NextJS API Route Hit: /api/customers/[id]/account/details");
    try {
        const { id } = await params;
        const { cookies } = await import('next/headers');
        const headers = { Cookie: (await cookies()).toString() };

        const res = await fetch(`${API_URL}/customers/${id}/account/details`, {
            cache: 'no-store',
            headers
        });

        if (!res.ok) {
            return NextResponse.json({ hasAccount: false }, { status: res.status });
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
