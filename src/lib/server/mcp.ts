import {
	getInterests,
	getInterestsForGroup,
	getRecentArticles,
	saveArticle,
	SaveArticleError
} from '$lib/server/articles';
import type { TokenScope } from '$lib/server/mcp-auth';

/**
 * Minimal, stateless MCP server (Streamable HTTP transport, JSON responses).
 * Implements exactly what news agents need: initialize, tools/list, tools/call.
 * Works with Claude Desktop (custom connector / mcp-remote) and any MCP client.
 */

const SUPPORTED_PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const DEFAULT_PROTOCOL_VERSION = '2025-03-26';

const TOOLS = [
	{
		name: 'get_interests',
		description:
			'Returns all news categories of the user, each with a short title, a description of what the user is interested in, and the list of hot topics (sub categories). Use the descriptions to guide web research and the returned IDs when saving articles.',
		inputSchema: { type: 'object', properties: {}, additionalProperties: false }
	},
	{
		name: 'list_recent_articles',
		description:
			'Lists headlines of recently saved articles so you can avoid saving duplicate news. Optionally pass the number of days to look back (default 3).',
		inputSchema: {
			type: 'object',
			properties: {
				days: {
					type: 'number',
					description: 'How many days to look back (1-30, default 3).'
				}
			},
			additionalProperties: false
		}
	},
	{
		name: 'save_article',
		description:
			'Saves a researched news article to the news app. Provide the category_id (and topic_id if the article belongs to a hot topic) from get_interests, a headline, a short teaser summary (2-3 sentences), the full article text in Markdown (plain YouTube links on their own line are rendered as embedded videos), an optional image URL from one of the sources, and the list of sources used.',
		inputSchema: {
			type: 'object',
			properties: {
				category_id: { type: 'string', description: 'Category ID from get_interests.' },
				topic_id: {
					type: 'string',
					description: 'Optional hot-topic ID from get_interests when the article matches one.'
				},
				headline: { type: 'string', description: 'Article headline.' },
				summary: { type: 'string', description: 'Short teaser text shown on the news card.' },
				content: {
					type: 'string',
					description:
						'Full article text in Markdown, including a fact-checked synthesis of the sources.'
				},
				image_url: {
					type: 'string',
					description:
						'Optional direct URL to an image FILE (e.g. the og:image of a source article), not the page URL. It is downloaded and cached locally; the result reports whether caching worked.'
				},
				published_at: {
					type: 'string',
					description: 'Optional ISO 8601 date of the news event (defaults to now).'
				},
				sources: {
					type: 'array',
					description: 'Sources the article is based on.',
					items: {
						type: 'object',
						properties: {
							name: { type: 'string', description: 'Name of the publication/site.' },
							url: { type: 'string', description: 'URL of the source article.' }
						},
						required: ['name', 'url']
					}
				}
			},
			required: ['category_id', 'headline', 'summary', 'content', 'sources'],
			additionalProperties: false
		}
	}
];

type JsonRpcMessage = {
	jsonrpc?: string;
	id?: string | number | null;
	method?: string;
	params?: Record<string, unknown>;
};

function rpcResult(id: string | number | null | undefined, result: unknown) {
	return { jsonrpc: '2.0', id: id ?? null, result };
}

function rpcError(id: string | number | null | undefined, code: number, message: string) {
	return { jsonrpc: '2.0', id: id ?? null, error: { code, message } };
}

function toolText(value: unknown, isError = false) {
	return {
		content: [
			{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }
		],
		isError
	};
}

async function callTool(scope: TokenScope, name: string, args: Record<string, unknown>) {
	switch (name) {
		case 'get_interests': {
			if (scope.kind === 'group') {
				const members = await getInterestsForGroup(scope.groupId);
				return toolText({
					mode: 'group',
					note: 'Research news for EVERY user below. Each category id belongs to the user it is listed under; save_article assigns the article to that user automatically.',
					users: members
				});
			}
			const interests = await getInterests(scope.userId);
			if (interests.length === 0) {
				return toolText(
					'The user has not defined any interest categories yet. Ask them to add categories in the news app settings first.'
				);
			}
			return toolText({ categories: interests });
		}
		case 'list_recent_articles': {
			const days = Math.min(30, Math.max(1, Number(args.days) || 3));
			return toolText({ articles: await getRecentArticles(scope, days) });
		}
		case 'save_article': {
			try {
				const { article, imageError } = await saveArticle(scope, {
					categoryId: String(args.category_id ?? ''),
					topicId: args.topic_id ? String(args.topic_id) : null,
					headline: String(args.headline ?? ''),
					summary: String(args.summary ?? ''),
					content: String(args.content ?? ''),
					imageUrl: args.image_url ? String(args.image_url) : null,
					publishedAt: args.published_at ? String(args.published_at) : null,
					sources: Array.isArray(args.sources)
						? (args.sources as { name: string; url: string }[])
						: []
				});
				return toolText({
					saved: true,
					article_id: article.id,
					image_cached: article.imagePath !== null,
					...(imageError ? { image_error: imageError } : {})
				});
			} catch (err) {
				if (err instanceof SaveArticleError) return toolText(err.message, true);
				throw err;
			}
		}
		default:
			return null;
	}
}

async function handleMessage(scope: TokenScope, msg: JsonRpcMessage): Promise<object | null> {
	// Notifications (no id) just get acknowledged.
	if (msg.id === undefined || msg.id === null) return null;

	switch (msg.method) {
		case 'initialize': {
			const requested = String(msg.params?.protocolVersion ?? '');
			const protocolVersion = SUPPORTED_PROTOCOL_VERSIONS.includes(requested)
				? requested
				: DEFAULT_PROTOCOL_VERSION;
			return rpcResult(msg.id, {
				protocolVersion,
				capabilities: { tools: {} },
				serverInfo: { name: 'newsapp-mcp', version: '1.0.0' },
				instructions:
					'News app MCP server. Call get_interests to learn what the user wants news about, research current news on the web for each category and hot topic, fact-check across sources, then store each article with save_article. Use list_recent_articles to avoid duplicates.'
			});
		}
		case 'ping':
			return rpcResult(msg.id, {});
		case 'tools/list':
			return rpcResult(msg.id, { tools: TOOLS });
		case 'tools/call': {
			const name = String(msg.params?.name ?? '');
			const args = (msg.params?.arguments ?? {}) as Record<string, unknown>;
			try {
				const result = await callTool(scope, name, args);
				if (result === null) return rpcError(msg.id, -32602, `Unknown tool: ${name}`);
				return rpcResult(msg.id, result);
			} catch (err) {
				console.error('MCP tool error', err);
				return rpcResult(msg.id, toolText('Internal error while executing the tool.', true));
			}
		}
		default:
			return rpcError(msg.id, -32601, `Method not found: ${msg.method}`);
	}
}

export async function handleMcpPost(scope: TokenScope, request: Request): Promise<Response> {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return Response.json(rpcError(null, -32700, 'Parse error'), { status: 400 });
	}

	const messages: JsonRpcMessage[] = Array.isArray(body) ? body : [body as JsonRpcMessage];
	const responses: object[] = [];
	for (const msg of messages) {
		const res = await handleMessage(scope, msg);
		if (res) responses.push(res);
	}

	// Only notifications: acknowledge without a body.
	if (responses.length === 0) return new Response(null, { status: 202 });
	const payload = Array.isArray(body) ? responses : responses[0];
	return Response.json(payload, { status: 200 });
}
