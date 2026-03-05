import { NextResponse } from 'next/server';

// Built-in credential pool (mirrors NetworkService.swift)
const CREDENTIAL_POOL = [
    { sessid: 'ae0d06ab472c9ce89552479596f4a9f3', ares: '3364854' },
];

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

function isExpired(): boolean {
    if (!cachedToken) return true;
    return Date.now() / 1000 >= tokenExpiry - 300;
}

function parseExpiry(token: string): number {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return 0;
        let b64 = parts[1];
        b64 += '='.repeat((4 - b64.length % 4) % 4);
        const payload = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
        return payload.exp ?? 0;
    } catch {
        return 0;
    }
}

async function fetchNewToken(): Promise<string> {
    const cred = CREDENTIAL_POOL[Math.floor(Math.random() * CREDENTIAL_POOL.length)];

    const res = await fetch('https://passport.seiue.com/authorize', {
        method: 'POST',
        headers: {
            'accept': 'application/json, text/plain, */*',
            'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'cache-control': 'no-cache',
            'content-type': 'application/x-www-form-urlencoded',
            'cookie': `PHPSESSID=${cred.sessid}; active_reflection=${cred.ares}`,
        },
        body: 'client_id=GpxvnjhVKt56qTmnPWH1sA&response_type=token',
        redirect: 'follow',
    });

    if (!res.ok) {
        throw new Error(`Token refresh failed: HTTP ${res.status}`);
    }

    const data = await res.json();
    if (!data.access_token) throw new Error('No access_token in response');

    cachedToken = data.access_token;
    tokenExpiry = parseExpiry(data.access_token);

    return cachedToken!;
}

export async function getValidToken(): Promise<string> {
    if (!isExpired() && cachedToken) return cachedToken;
    return fetchNewToken();
}

export function getCurrentAres(): string {
    return CREDENTIAL_POOL[0].ares;
}

export async function GET() {
    try {
        const token = await getValidToken();
        return NextResponse.json({ token });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
