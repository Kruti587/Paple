import { env } from '$env/dynamic/private';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const PRIMARY_MODEL = 'qwen/qwen3.8-27b';
const FALLBACK_MODEL = 'openai/gpt-oss-120b';

export interface ChatMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

export async function askGroq(
	messages: ChatMessage[],
	options: { maxTokens?: number; temperature?: number } = {}
): Promise<string> {
	const apiKey = env.GROQ_API_KEY;
	if (!apiKey) {
		throw new Error('GROQ_API_KEY is not configured in .env or environment variables');
	}

	const maxTokens = options.maxTokens ?? 150;
	const temperature = options.temperature ?? 0.7;

	// Try primary model first, then fallback model
	const models = [PRIMARY_MODEL, FALLBACK_MODEL];
	let lastError: unknown = null;

	for (const model of models) {
		try {
			const res = await fetch(GROQ_API_URL, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${apiKey}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					model,
					messages,
					max_tokens: maxTokens,
					temperature
				}),
				signal: AbortSignal.timeout(15_000)
			});

			if (!res.ok) {
				const errorText = await res.text();
				console.warn(`Groq (${model}) returned status ${res.status}:`, errorText);
				continue;
			}

			const data = (await res.json()) as {
				choices?: { message?: { content?: string; reasoning?: string } }[];
			};

			const choice = data.choices?.[0]?.message;
			const text = choice?.content?.trim() || choice?.reasoning?.trim();
			if (text) {
				return text;
			}
		} catch (err) {
			lastError = err;
			console.warn(`Groq request with ${model} failed:`, err);
		}
	}

	throw lastError || new Error('No response from Groq');
}
