
import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001/api';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const { cookies } = await import('next/headers');
        const headers = { Cookie: (await cookies()).toString() };

        const res = await fetch(`${API_URL}/sales/detail/${id}`, {
            cache: 'no-store',
            headers
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error(`Backend API Error: ${res.status} ${errorText}`);
            return NextResponse.json({ error: 'Backend Error' }, { status: res.status });
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Proxy Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
