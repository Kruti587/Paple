import { json } from '@sveltejs/kit';
import { MAX_MESSAGE_LENGTH, npcConfig } from '$lib/npcConfig';
import { formatWebContext, searchWeb } from '$lib/server/anakin';
import { askGroq } from '$lib/server/groq';
import type { RequestHandler } from './$types';

const WEB_CONTEXT_RULES = `\nIf the live web intel is relevant to the player's question, weave the real facts in naturally, in character. If it isn't relevant, ignore it. Never mention searching or sources.`;

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

	const question = message.trim();
	// Ground the NPC in real, current Bengaluru info pulled from the web by Anakin.
	const sources = await searchWeb(`${question} (Bengaluru)`, 3);
	const webContext = formatWebContext(sources);

	try {
		const reply = await askGroq(
			[
				{
					role: 'system',
					content: npc.systemPrompt + (webContext && webContext + WEB_CONTEXT_RULES)
				},
				{ role: 'user', content: question }
			],
			{ maxTokens: 120, temperature: 0.7 }
		);

		return json({ reply, sources: sources.map(({ title, url }) => ({ title, url })) });
	} catch (e) {
		console.error(`LLM error for NPC ${params.npcId}:`, e);
		return json(
			{ error: 'The character is lost in thought right now. Please try again.' },
			{ status: 502 }
		);
	}
};
