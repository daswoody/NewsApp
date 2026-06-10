import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { env } from '$env/dynamic/private';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const EXT_BY_TYPE: Record<string, string> = {
	'image/jpeg': 'jpg',
	'image/jpg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp',
	'image/gif': 'gif',
	'image/avif': 'avif',
	'image/svg+xml': 'svg'
};

const URL_EXTENSIONS: Record<string, string> = {
	'.jpg': 'jpg',
	'.jpeg': 'jpg',
	'.jfif': 'jpg',
	'.png': 'png',
	'.webp': 'webp',
	'.gif': 'gif',
	'.avif': 'avif'
};

export function imageDir(): string {
	return env.IMAGE_DIR ?? 'data/images';
}

export interface CacheImageResult {
	name: string | null;
	error?: string;
}

/**
 * Downloads a remote article image into the local cache so articles keep
 * working when the source site removes the file. Returns the stored file
 * name, or an error description that is passed back to the AI so it can
 * retry with a different image URL.
 */
export async function cacheImage(url: string): Promise<CacheImageResult> {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return { name: null, error: 'image_url is not a valid URL' };
	}
	if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
		return { name: null, error: 'image_url must be a http(s) URL' };
	}

	try {
		const res = await fetch(url, {
			signal: AbortSignal.timeout(15000),
			redirect: 'follow',
			headers: {
				// some image CDNs block obvious bots
				'user-agent':
					'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
				accept: 'image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8'
			}
		});
		if (!res.ok) {
			return { name: null, error: `image download failed with HTTP ${res.status}` };
		}
		const type = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
		// trust the content type first, fall back to the file extension in the URL
		const ext = EXT_BY_TYPE[type] ?? URL_EXTENSIONS[extname(parsed.pathname).toLowerCase()];
		if (!ext) {
			return {
				name: null,
				error: `URL did not return an image (content-type: ${type || 'unknown'}); pass a direct image file URL, e.g. the og:image of an article`
			};
		}
		const buf = Buffer.from(await res.arrayBuffer());
		if (buf.byteLength === 0) return { name: null, error: 'image was empty' };
		if (buf.byteLength > MAX_IMAGE_BYTES) {
			return { name: null, error: 'image is larger than 10 MB' };
		}
		const name = `${randomUUID()}.${ext}`;
		await mkdir(imageDir(), { recursive: true });
		await writeFile(join(imageDir(), name), buf);
		return { name };
	} catch (err) {
		console.warn(`[images] failed to cache ${url}:`, err instanceof Error ? err.message : err);
		return { name: null, error: 'image download failed (timeout or network error)' };
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
