import { json } from '@sveltejs/kit';
import { MAX_MESSAGE_LENGTH, npcConfig } from '$lib/npcConfig';
import { formatWebContext, searchWeb } from '$lib/server/anakin';
import { askGroq } from '$lib/server/groq';
import type { RequestHandler } from './$types';

const webContextRules = () => `
Answer the player's question using the concrete facts in the live web intel above: specific numbers, names, places and dates. Stay in character and keep your usual length. Don't invent facts that aren't in the intel. Today is ${new Date().toDateString()}.`;

/** Questions about the (fictional) quest or the character themselves: the web can't help. */
const IN_WORLD_QUESTION =
	/\b(quest|hint|clue|hq|code|pin|post-?it|terminal|kiosk|guards?|pantry|yourself|who are you|your name)\b/i;

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
	// Ground real-world questions in current Bengaluru info pulled from the web by Anakin.
	const sources = IN_WORLD_QUESTION.test(question)
		? []
		: await searchWeb(`${question} (Bengaluru)`, 3);
	const webContext = formatWebContext(sources);

	try {
		const reply = await askGroq(
			[
				{
					role: 'system',
					content: npc.systemPrompt + (webContext && webContext + webContextRules())
				},
				{ role: 'user', content: question }
			],
			{ maxTokens: 160, temperature: 0.6 }
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
