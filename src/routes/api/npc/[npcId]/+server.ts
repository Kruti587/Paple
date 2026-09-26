import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { MAX_MESSAGE_LENGTH, npcConfig } from '$lib/npcConfig';
import type { RequestHandler } from './$types';

// NOTE: API access requires an Anakin Pro-tier account.
// Verify the endpoint and version header against Anakin's current API docs.
const ANAKIN_API_BASE = 'https://api.anakin.ai/v1';
const ANAKIN_API_VERSION = '2024-05-06';
const TIMEOUT_MS = 20_000;

const UPSTREAM_ERROR = 'The character could not respond. Please try again.';

export const POST: RequestHandler = async ({ params, request }) => {
	const npc = Object.hasOwn(npcConfig, params.npcId) ? npcConfig[params.npcId] : undefined;
	if (!npc) return json({ error: 'Unknown character' }, { status: 404 });

	const { message } = (await request.json().catch(() => ({}))) as { message?: unknown };
	if (typeof message !== 'string' || !message.trim()) {
		return json({ error: 'Message is required' }, { status: 400 });
	}
	if (message.length > MAX_MESSAGE_LENGTH) {
		return json(
			{ error: `Message must be at most ${MAX_MESSAGE_LENGTH} characters` },
			{ status: 400 }
		);
	}

	if (!env.ANAKIN_API_KEY) {
		console.error('ANAKIN_API_KEY is not set');
		return json({ error: UPSTREAM_ERROR }, { status: 502 });
	}

	try {
		const res = await fetch(`${ANAKIN_API_BASE}/chatbots/${npc.appId}/messages`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${env.ANAKIN_API_KEY}`,
				'Content-Type': 'application/json',
				'X-Anakin-Api-Version': ANAKIN_API_VERSION
			},
			body: JSON.stringify({ content: message.trim(), stream: false }),
			signal: AbortSignal.timeout(TIMEOUT_MS)
		});

		if (!res.ok) {
			// Log upstream details server-side only; never relay them to the client.
			console.error(`Anakin ${res.status} for ${params.npcId}:`, await res.text());
			return json({ error: UPSTREAM_ERROR }, { status: 502 });
		}

		const data = (await res.json()) as { content?: unknown };
		if (typeof data.content !== 'string' || !data.content) {
			console.error(`Anakin returned no content for ${params.npcId}`);
			return json({ error: UPSTREAM_ERROR }, { status: 502 });
		}

		return json({ reply: data.content });
	} catch (e) {
		console.error(`Anakin request failed for ${params.npcId}:`, e);
		return json({ error: UPSTREAM_ERROR }, { status: 502 });
	}
};
