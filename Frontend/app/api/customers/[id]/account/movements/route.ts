
import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001/api';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await request.json();

        const { cookies } = await import('next/headers');
        const headers = {
            'Content-Type': 'application/json',
            Cookie: (await cookies()).toString()
        };

        const res = await fetch(`${API_URL}/customers/${id}/account/movements`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            const error = await res.json();
            return NextResponse.json(error, { status: res.status });
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
