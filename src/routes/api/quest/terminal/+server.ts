import { json } from '@sveltejs/kit';
import { askGroq } from '$lib/server/groq';
import { COMPANY_NAME } from '$lib/world/props/signs';
import type { RequestHandler } from './$types';

const TERMINAL_SYSTEM_PROMPT = `You are the ${COMPANY_NAME}-OS v2.6 Mainframe Security Shell terminal running on an outdoor kiosk in Bengaluru.
You speak like a retro cybernetic CRT terminal: crisp, technical, slightly glitched, but helpful.
Keep all output short (2 to 4 lines maximum). Use computer/security jargon.

Context:
- The system is locked awaiting a 4-digit numeric master override code.
- Authorized personnel wrote the code on a yellow paper post-it stuck to the breakroom refrigerator on the 3rd-floor pantry of the HQ building.
- Security staffers are on high alert.

Command guidelines:
- If user types "HELP": List commands: CODE <pin>, HINT, STATUS, SCAN, OVERRIDE, LOGS.
- If user types "HINT": Give an encrypted or glitchy clue pointing them to the 3rd-floor pantry fridge.
- If user types "STATUS": Display system integrity, intrusion alerts, and lock state.
- If user asks a question or tries to hack/override: Respond in character with terminal logs, firewall diagnostics, or subtle clues.`;

export const POST: RequestHandler = async ({ request }) => {
	const { command } = (await request.json().catch(() => ({}))) as { command?: unknown };
	if (typeof command !== 'string' || !command.trim()) {
		return json({ error: 'Command required' }, { status: 400 });
	}

	const cmd = command.trim();

	try {
		const reply = await askGroq(
			[
				{ role: 'system', content: TERMINAL_SYSTEM_PROMPT },
				{ role: 'user', content: cmd }
			],
			{ maxTokens: 100, temperature: 0.6 }
		);

		return json({ reply });
	} catch (err) {
		console.error('Groq terminal error:', err);
		return json({
			reply: `SYS_ERR_503: Subsystem offline. Manual numeric PIN required.`
		});
	}
};
