import { error } from '@sveltejs/kit';
import { createReadStream, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { imageDir } from '$lib/server/images';
import type { RequestHandler } from './$types';

const TYPE_BY_EXT: Record<string, string> = {
	jpg: 'image/jpeg',
	png: 'image/png',
	webp: 'image/webp',
	gif: 'image/gif',
	avif: 'image/avif',
	svg: 'image/svg+xml'
};

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) error(401);
	const name = params.file;
	if (!/^[\w-]+\.[a-z]+$/.test(name)) error(404);
	const type = TYPE_BY_EXT[name.split('.').pop() ?? ''];
	if (!type) error(404);
	const path = join(imageDir(), name);
	if (!existsSync(path)) error(404);

	return new Response(Readable.toWeb(createReadStream(path)) as ReadableStream, {
		headers: {
			'content-type': type,
			'cache-control': 'private, max-age=31536000, immutable'
		}
	});
};
