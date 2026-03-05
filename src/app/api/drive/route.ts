import { NextRequest, NextResponse } from 'next/server';
import { getValidToken, getCurrentAres } from '@/app/api/token/route';

const BASE_URL = 'https://api.seiue.com';

// GET /api/drive?key0=<hash>  → fetch drive JSON
export async function GET(request: NextRequest) {
    const key0 = request.nextUrl.searchParams.get('key0');
    if (!key0) return NextResponse.json({ error: 'key0 required' }, { status: 400 });

    try {
        // Step 1: get download URL for the key0 file
        const fileURLRes = await fetch(
            `${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/api/file-url?fileKey=${key0}&download=true`
        );
        if (!fileURLRes.ok) return NextResponse.json({ error: 'Failed to get file URL' }, { status: 502 });
        const { url } = await fileURLRes.json();
        if (!url) return NextResponse.json({ error: 'No URL' }, { status: 502 });

        // Step 2: download the JSON
        const dataRes = await fetch(url);
        if (!dataRes.ok) return NextResponse.json({ error: 'Download failed' }, { status: 502 });

        const json = await dataRes.json();
        return NextResponse.json(json);
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

// POST /api/drive  → login-check or validate file exists
// body: { action: 'login-check', key0 } | { action: 'validate', hash }
export async function POST(request: NextRequest) {
    const body = await request.json();

    if (body.action === 'login-check') {
        // Perform the login check by attempting to get file URL
        const { key0 } = body;
        const res = await fetch(`${BASE_URL}/chalk/netdisk/files/${key0}/url`, { redirect: 'manual' });
        if (res.status === 302 || res.status === 200) {
            return NextResponse.json({ ok: true });
        } else if (res.status === 400 || res.status === 404) {
            return NextResponse.json({ ok: false, reason: 'invalid_credentials' });
        } else {
            return NextResponse.json({ ok: false, reason: 'server_error', status: res.status });
        }
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

// PUT /api/drive  → sync (upload) drive JSON
export async function PUT(request: NextRequest) {
    const { key0, driveData } = await request.json();
    if (!key0 || !driveData) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

    try {
        const token = await getValidToken();
        const ares = getCurrentAres();
        const jsonData = JSON.stringify(driveData, null, 2);
        const fileData = new TextEncoder().encode(jsonData);

        // Step 1: get netdisk file ID
        const idRes = await fetch(`${BASE_URL}/chalk/netdisk/files`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
                'X-Reflection-Id': ares,
            },
            body: JSON.stringify({
                netdisk_owner_id: 0,
                name: 'drive_data.json',
                parent_id: 0,
                path: '/',
                mime: 'application/json',
                type: 'other',
                size: 112,
                hash: key0,
                status: 'uploading',
            }),
        });

        if (!idRes.ok) return NextResponse.json({ error: 'Failed to create file entry' }, { status: idRes.status });
        const { id: netdiskID } = await idRes.json();

        // Step 2: get upload policy
        const policyRes = await fetch(`${BASE_URL}/chalk/netdisk/files/${netdiskID}/policy`, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
                'X-Reflection-Id': ares,
            },
        });
        if (!policyRes.ok) return NextResponse.json({ error: 'Failed to get policy' }, { status: policyRes.status });
        const policy = await policyRes.json();

        // Step 3: upload to OSS
        const boundary = `Boundary-${Date.now()}`;
        const bodyParts: Uint8Array[] = [];
        const enc = new TextEncoder();

        for (const [k, v] of Object.entries({
            key: policy.object_key,
            OSSAccessKeyId: policy.access_key_id,
            policy: policy.policy,
            signature: policy.signature,
            expire: policy.expire,
            callback: policy.callback,
        })) {
            bodyParts.push(enc.encode(`--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`));
        }

        bodyParts.push(enc.encode(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="drive_data.json"\r\nContent-Type: application/json\r\n\r\n`));
        bodyParts.push(fileData);
        bodyParts.push(enc.encode(`\r\n--${boundary}--\r\n`));

        const total = bodyParts.reduce((s, p) => s + p.length, 0);
        const formBody = new Uint8Array(total);
        let offset = 0;
        for (const part of bodyParts) { formBody.set(part, offset); offset += part.length; }

        const ossRes = await fetch(policy.host, {
            method: 'POST',
            headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
            body: formBody,
        });

        if (!ossRes.ok) return NextResponse.json({ error: 'OSS upload failed' }, { status: ossRes.status });

        return NextResponse.json({ ok: true });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
