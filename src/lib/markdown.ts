/**
 * Tiny markdown renderer for AI-written articles. All input is HTML-escaped
 * first, then a limited set of markdown constructs is converted, so no raw
 * HTML from the model ever reaches the page. Plain YouTube links on their
 * own line become embedded players.
 */

function escapeHtml(text: string): string {
	return text
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

function youtubeId(url: string): string | null {
	const m = url.match(
		/^https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtube\.com\/shorts\/|youtu\.be\/)([\w-]{6,20})/
	);
	return m ? m[1] : null;
}

function safeHref(url: string): string | null {
	return /^https?:\/\//i.test(url) ? url : null;
}

function inline(text: string): string {
	let out = escapeHtml(text);
	// [label](url)
	out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (full, label: string, url: string) => {
		const href = safeHref(url);
		return href
			? `<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`
			: full;
	});
	out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
	out = out.replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>');
	out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
	return out;
}

export function renderMarkdown(markdown: string): string {
	const lines = markdown.replaceAll('\r\n', '\n').split('\n');
	const html: string[] = [];
	let paragraph: string[] = [];
	let list: { type: 'ul' | 'ol'; items: string[] } | null = null;

	const flushParagraph = () => {
		if (paragraph.length > 0) {
			html.push(`<p>${paragraph.map(inline).join('<br />')}</p>`);
			paragraph = [];
		}
	};
	const flushList = () => {
		if (list) {
			html.push(`<${list.type}>${list.items.map((i) => `<li>${i}</li>`).join('')}</${list.type}>`);
			list = null;
		}
	};

	for (const raw of lines) {
		const line = raw.trimEnd();
		const trimmed = line.trim();

		if (trimmed === '') {
			flushParagraph();
			flushList();
			continue;
		}

		const yt = youtubeId(trimmed);
		if (yt) {
			flushParagraph();
			flushList();
			html.push(
				`<div class="yt-embed"><iframe src="https://www.youtube-nocookie.com/embed/${yt}" title="YouTube Video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`
			);
			continue;
		}

		const heading = trimmed.match(/^(#{1,4})\s+(.*)$/);
		if (heading) {
			flushParagraph();
			flushList();
			const level = Math.min(heading[1].length + 1, 4); // h1 in markdown -> h2 on page
			html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
			continue;
		}

		const quote = trimmed.match(/^>\s?(.*)$/);
		if (quote) {
			flushParagraph();
			flushList();
			html.push(`<blockquote>${inline(quote[1])}</blockquote>`);
			continue;
		}

		const ulItem = trimmed.match(/^[-*]\s+(.*)$/);
		const olItem = trimmed.match(/^\d+[.)]\s+(.*)$/);
		if (ulItem || olItem) {
			flushParagraph();
			const type = ulItem ? 'ul' : 'ol';
			if (!list || list.type !== type) {
				flushList();
				list = { type, items: [] };
			}
			list.items.push(inline((ulItem ?? olItem)![1]));
			continue;
		}

		flushList();
		paragraph.push(trimmed);
	}
	flushParagraph();
	flushList();
	return html.join('\n');
}
