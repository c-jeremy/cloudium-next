import md5 from 'md5';
import type { CloudiumLink } from '@/types';

const SALT = 'Cloudium_2026_TZY_SecureLink_v1';
const URL_SCHEME = 'cloudium';

function computeChecksum(fileKey: string, sizeHex: string): string {
    const payload = `${fileKey}.${sizeHex}.${SALT}`;
    const hash = md5(payload);
    return hash.slice(0, 8);
}

export function encode(fileKey: string, fileSize: number): string {
    if (fileSize <= 0) return `${URL_SCHEME}://${fileKey}`;
    const sizeHex = fileSize.toString(16);
    const checksum = computeChecksum(fileKey, sizeHex);
    return `${URL_SCHEME}://${fileKey}-${sizeHex}-${checksum}`;
}

export function decode(input: string): CloudiumLink | null {
    let raw = input.trim();
    if (!raw) return null;

    // Case 0: bare URL with /chalk/netdisk/files/HASH.ext/url
    const rawURLMatch = raw.match(/\/chalk\/netdisk\/files\/([0-9a-fA-F]{32})(?:\.[a-zA-Z0-9]+)?\/url/);
    if (rawURLMatch) {
        return { fileKey: rawURLMatch[1].toLowerCase(), fileSize: 0 };
    }

    // Strip scheme prefix
    const prefix = `${URL_SCHEME}://`;
    if (raw.startsWith(prefix)) raw = raw.slice(prefix.length);
    raw = raw.replace(/[/\s]+$/, '');
    if (!raw) return null;

    // Case 1: bare 32-char hex (old format)
    if (raw.length === 32 && /^[0-9a-fA-F]+$/.test(raw)) {
        return { fileKey: raw.toLowerCase(), fileSize: 0 };
    }

    // Case 2: new format fileKey-sizeHex-checksum
    const parts = raw.split('-');
    if (parts.length === 3) {
        const [fileKey, sizeHex, checksum] = parts;
        if (fileKey.length === 32 && /^[0-9a-fA-F]+$/.test(fileKey)) {
            const expected = computeChecksum(fileKey, sizeHex);
            const fileSize = checksum === expected ? parseInt(sizeHex, 16) : 0;
            return { fileKey: fileKey.toLowerCase(), fileSize };
        }
    }

    // Fallback: first segment is 32-char hex
    if (parts[0].length === 32 && /^[0-9a-fA-F]+$/.test(parts[0])) {
        return { fileKey: parts[0].toLowerCase(), fileSize: 0 };
    }

    return null;
}

export function isValidLink(input: string): boolean {
    return decode(input) !== null;
}

export function extractFileKey(input: string): string | null {
    return decode(input)?.fileKey ?? null;
}
