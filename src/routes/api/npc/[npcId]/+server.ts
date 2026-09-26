import { json } from '@sveltejs/kit';
import { MAX_MESSAGE_LENGTH, npcConfig } from '$lib/npcConfig';
import { askGroq } from '$lib/server/groq';
import type { RequestHandler } from './$types';

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

	try {
		const reply = await askGroq(
			[
				{ role: 'system', content: npc.systemPrompt },
				{ role: 'user', content: message.trim() }
			],
			{ maxTokens: 120, temperature: 0.7 }
		);

		return json({ reply });
	} catch (e) {
		console.error(`Groq error for NPC ${params.npcId}:`, e);
		return json(
			{ error: 'The character is lost in thought right now. Please try again.' },
			{ status: 502 }
		);
	}
};
