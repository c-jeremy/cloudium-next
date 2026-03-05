import { NextRequest, NextResponse } from 'next/server';
import { getValidToken, getCurrentAres } from '@/app/api/token/route';

const BASE_URL = 'https://api.seiue.com';

// GET /api/file-url?fileKey=xxx&download=true
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const fileKey = searchParams.get('fileKey');
    const download = searchParams.get('download') === 'true';

    if (!fileKey) {
        return NextResponse.json({ error: 'fileKey required' }, { status: 400 });
    }

    const suffix = download ? '/url?download=true' : '/url';
    const apiURL = `${BASE_URL}/chalk/netdisk/files/${fileKey}${suffix}`;

    // Follow redirects manually to capture the final URL
    const res = await fetch(apiURL, { redirect: 'manual' });

    let location: string | null = null;

    if (res.status === 302 || res.status === 301) {
        location = res.headers.get('location');
    } else if (res.ok) {
        location = res.url !== apiURL ? res.url : null;
    }

    if (!location) {
        return NextResponse.json({ error: 'No redirect URL found' }, { status: 502 });
    }

    return NextResponse.json({ url: location });
}

// POST /api/file-url  → check user exists
export async function POST(request: NextRequest) {
    const { hash } = await request.json();
    const token = await getValidToken();
    const ares = getCurrentAres();

    const url = new URL(`${BASE_URL}/chalk/netdisk/files`);
    url.searchParams.set('fields', 'hash');
    url.searchParams.set('hash', hash);
    url.searchParams.set('netdisk_owner_id', '0');
    url.searchParams.set('validating_hash', 'true');

    const res = await fetch(url.toString(), {
        headers: {
            Accept: 'application/json, text/plain, */*',
            Authorization: `Bearer ${token}`,
            'X-Reflection-Id': ares,
            Pragma: 'no-cache',
            'Cache-Control': 'no-cache',
        },
    });

    if (!res.ok) {
        return NextResponse.json({ error: 'Bad response' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ exists: Array.isArray(data) && data.length > 0 });
}
