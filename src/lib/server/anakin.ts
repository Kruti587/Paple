import { env } from '$env/dynamic/private';

// Anakin.io is a web-data API: it fetches live information from the web, and the
// LLM (see groq.ts) does the thinking on top of it.
// Docs: https://anakin.io/docs/api-reference/search/search
const ANAKIN_SEARCH_URL = 'https://api.anakin.io/v1/search';
const TIMEOUT_MS = 8_000;
/** Snippets are near whole-page text that opens with nav clutter; facts come later. */
const MAX_SNIPPET_CHARS = 1500;

const clean = (s: string) => s.replace(/\s+/g, ' ').trim();

export interface WebResult {
	title: string;
	url: string;
	snippet: string;
	date?: string;
}

/**
 * Live web search via Anakin. Never throws: on a missing key or upstream failure it
 * returns [] so dialogue still works, just without fresh web context.
 */
export async function searchWeb(prompt: string, limit = 3): Promise<WebResult[]> {
	const apiKey = env.ANAKIN_API_KEY;
	if (!apiKey) {
		console.warn('ANAKIN_API_KEY is not set; skipping live web search');
		return [];
	}

	try {
		const res = await fetch(ANAKIN_SEARCH_URL, {
			method: 'POST',
			headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
			body: JSON.stringify({ prompt, limit }),
			signal: AbortSignal.timeout(TIMEOUT_MS)
		});
		if (!res.ok) {
			console.warn(`Anakin search returned ${res.status}:`, await res.text());
			return [];
		}

		const data = (await res.json()) as {
			results?: { title?: string; url?: string; snippet?: string; date?: string }[];
		};
		return (data.results ?? [])
			.filter((r) => r.url && (r.title || r.snippet))
			.map((r) => ({
				title: clean(r.title ?? '') || r.url!,
				url: r.url!,
				snippet: clean(r.snippet ?? '').slice(0, MAX_SNIPPET_CHARS),
				date: r.date
			}));
	} catch (err) {
		console.warn('Anakin search failed:', err);
		return [];
	}
}

/** Formats results as a context block for an LLM system prompt ('' when there are none). */
export function formatWebContext(results: WebResult[]): string {
	if (!results.length) return '';
	const items = results
		.map((r, i) => `[${i + 1}] ${r.title}${r.date ? ` (${r.date})` : ''}: ${r.snippet}`)
		.join('\n');
	return `\n\nLive web intel (fetched just now via Anakin):\n${items}`;
}
