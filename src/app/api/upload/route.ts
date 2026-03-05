import { NextRequest, NextResponse } from 'next/server';
import { getValidToken, getCurrentAres } from '@/app/api/token/route';

const BASE_URL = 'https://api.seiue.com';

// POST /api/upload
// Body (multipart form-data):
//   - fileData: Blob
//   - fileName: string
//   - fileKey: string (md5 hash to use as identity)
//   - mimeType: string
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const fileKey = formData.get('fileKey') as string | null;
        const fileName = formData.get('fileName') as string | null;
        const mimeType = formData.get('mimeType') as string ?? 'application/octet-stream';

        if (!file || !fileKey || !fileName) {
            return NextResponse.json({ error: 'Missing file, fileKey, or fileName' }, { status: 400 });
        }

        const token = await getValidToken();
        const ares = getCurrentAres();
        const fileData = new Uint8Array(await file.arrayBuffer());

        // Step 1: Create netdisk entry
        const idRes = await fetch(`${BASE_URL}/chalk/netdisk/files`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
                'X-Reflection-Id': ares,
            },
            body: JSON.stringify({
                netdisk_owner_id: 0,
                name: fileName,
                parent_id: 0,
                path: '/',
                mime: mimeType,
                type: 'other',
                size: 112,
                hash: fileKey,
                status: 'uploading',
            }),
        });

        if (!idRes.ok) {
            const txt = await idRes.text();
            return NextResponse.json({ error: `getID failed: ${txt}` }, { status: idRes.status });
        }

        const { id: netdiskID } = await idRes.json();

        // Step 2: Get upload policy
        const policyRes = await fetch(`${BASE_URL}/chalk/netdisk/files/${netdiskID}/policy`, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
                'X-Reflection-Id': ares,
            },
        });

        if (!policyRes.ok) {
            return NextResponse.json({ error: 'getPolicy failed' }, { status: policyRes.status });
        }

        const policy = await policyRes.json();

        // Step 3: Build multipart body and upload to OSS
        const boundary = `Boundary-${Date.now()}`;
        const enc = new TextEncoder();
        const chunks: Uint8Array[] = [];

        for (const [k, v] of Object.entries({
            key: policy.object_key,
            OSSAccessKeyId: policy.access_key_id,
            policy: policy.policy,
            signature: policy.signature,
            expire: policy.expire,
            callback: policy.callback,
        })) {
            chunks.push(enc.encode(`--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`));
        }

        chunks.push(enc.encode(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: ${mimeType}\r\n\r\n`));
        chunks.push(fileData);
        chunks.push(enc.encode(`\r\n--${boundary}--\r\n`));

        const total = chunks.reduce((s, c) => s + c.length, 0);
        const body = new Uint8Array(total);
        let offset = 0;
        for (const c of chunks) { body.set(c, offset); offset += c.length; }

        const ossRes = await fetch(policy.host, {
            method: 'POST',
            headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
            body,
        });

        if (!ossRes.ok) {
            return NextResponse.json({ error: `OSS upload failed: HTTP ${ossRes.status}` }, { status: ossRes.status });
        }

        return NextResponse.json({ ok: true, fileKey });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
