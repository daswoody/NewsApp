import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { env } from '$env/dynamic/private';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const EXT_BY_TYPE: Record<string, string> = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp',
	'image/gif': 'gif',
	'image/avif': 'avif',
	'image/svg+xml': 'svg'
};

export function imageDir(): string {
	return env.IMAGE_DIR ?? 'data/images';
}

/**
 * Downloads a remote article image into the local cache so articles keep
 * working when the source site removes the file. Returns the stored file
 * name or null when the download fails (the article is saved without image).
 */
export async function cacheImage(url: string): Promise<string | null> {
	try {
		const parsed = new URL(url);
		if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
		const res = await fetch(url, {
			signal: AbortSignal.timeout(15000),
			headers: { 'user-agent': 'NewsApp/1.0 (+image-cache)' }
		});
		if (!res.ok) return null;
		const type = (res.headers.get('content-type') ?? '').split(';')[0].trim();
		const ext = EXT_BY_TYPE[type];
		if (!ext) return null;
		const buf = Buffer.from(await res.arrayBuffer());
		if (buf.byteLength === 0 || buf.byteLength > MAX_IMAGE_BYTES) return null;
		const name = `${randomUUID()}.${ext}`;
		await mkdir(imageDir(), { recursive: true });
		await writeFile(join(imageDir(), name), buf);
		return name;
	} catch {
		return null;
	}
}

export async function deleteImage(name: string | null): Promise<void> {
	if (!name || name.includes('/') || name.includes('..')) return;
	try {
		await unlink(join(imageDir(), name));
	} catch {
		// already gone
	}
}
