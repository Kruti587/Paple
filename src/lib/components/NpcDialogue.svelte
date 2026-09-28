<script lang="ts">
	import { MAX_MESSAGE_LENGTH, npcConfig } from '$lib/npcConfig';
	import { quests } from '$lib/game/questManager';

	let {
		npcId,
		npcName,
		open,
		onclose
	}: { npcId: string; npcName: string; open: boolean; onclose: () => void } = $props();

	const info = $derived(npcConfig[npcId]);

	let message = $state('');
	let lastQuestion = $state('');
	let reply = $state('');
	let sources = $state<{ title: string; url: string }[]>([]);
	let errorText = $state('');
	let loading = $state(false);
	let controller: AbortController | null = null;

	const ICONS: Record<string, string> = {
		alien: '🛸',
		chef: '☕',
		diver: '🤿',
		musician: '🪕',
		caveman: '🍖'
	};

	function playNpcBlah(id: string, count = 4) {
		try {
			const AudioContextClass =
				window.AudioContext ||
				(window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
			if (!AudioContextClass) return;
			const ctx = new AudioContextClass();

			const config: Record<string, { type: OscillatorType; base: number; range: number }> = {
				alien: { type: 'sawtooth', base: 640, range: 160 },
				chef: { type: 'triangle', base: 280, range: 70 },
				diver: { type: 'sine', base: 220, range: 45 },
				musician: { type: 'triangle', base: 440, range: 90 },
				caveman: { type: 'square', base: 130, range: 35 }
			};
			const cfg = config[id] ?? { type: 'sine', base: 320, range: 60 };

			for (let i = 0; i < count; i++) {
				const start = ctx.currentTime + i * 0.07;
				const osc = ctx.createOscillator();
				const gain = ctx.createGain();
				osc.connect(gain);
				gain.connect(ctx.destination);
				osc.type = cfg.type;
				const freq = cfg.base + (Math.random() - 0.5) * cfg.range;
				osc.frequency.setValueAtTime(freq, start);
				osc.frequency.exponentialRampToValueAtTime(freq * 0.88, start + 0.055);
				gain.gain.setValueAtTime(0.06, start);
				gain.gain.exponentialRampToValueAtTime(0.001, start + 0.06);
				osc.start(start);
				osc.stop(start + 0.065);
			}
		} catch {}
	}

	function reset() {
		controller?.abort();
		controller = null;
		message = '';
		lastQuestion = '';
		reply = '';
		sources = [];
		errorText = '';
		loading = false;
	}

	// Trigger quest progression and greeting babble when dialogue opens
	$effect(() => {
		if (open && npcId) {
			if (npcId === 'musician') {
				quests.completeTask('musician_veena', 'talk_musician');
			} else if (npcId === 'chef') {
				quests.activateQuest('chef_chai_rush');
				quests.completeTask('chef_chai_rush', 'talk_chef');
			} else if (npcId === 'alien') {
				quests.activateQuest('alien_ufo_repair');
			} else if (npcId === 'diver') {
				quests.activateQuest('mani_lake_revival');
				quests.completeTask('mani_lake_revival', 'talk_mani');
			} else if (npcId === 'caveman') {
				quests.activateQuest('grog_ancient_spark');
				quests.completeTask('grog_ancient_spark', 'talk_grog');
			}
			playNpcBlah(npcId, 5);
		}
		return reset;
	});

	function close() {
		reset();
		onclose();
	}

	async function ask(text: string) {
		if (!text || loading) return;

		controller = new AbortController();
		loading = true;
		errorText = '';
		reply = '';
		sources = [];
		lastQuestion = text;
		message = '';

		try {
			const res = await fetch(`/api/npc/${npcId}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ message: text }),
				signal: controller.signal
			});
			if (res.status === 404) {
				errorText = "This character isn't available right now.";
			} else if (!res.ok) {
				errorText = 'Something went wrong. Please try again.';
			} else {
				const data = (await res.json()) as {
					reply: string;
					sources?: { title: string; url: string }[];
				};
				reply = data.reply;
				sources = data.sources ?? [];
				playNpcBlah(npcId, Math.min(Math.floor(reply.length / 10) + 3, 10));
			}
		} catch (err) {
			if ((err as Error).name === 'AbortError') return;
			errorText = 'Something went wrong. Please try again.';
		} finally {
			loading = false;
		}
	}

	function submit(e: SubmitEvent) {
		e.preventDefault();
		const text = message.trim();
		if (text) void ask(text);
	}
</script>

{#if open}
	<div class="dialogue-backdrop">
		<div class="panel" role="dialog" aria-label="Talk to {npcName}">
			<header>
				<div class="character-header">
					<span class="avatar-badge">{ICONS[npcId] ?? '👤'}</span>
					<div class="char-titles">
						<strong>{npcName}</strong>
						{#if info?.title}
							<span class="title"> · {info.title}</span>
						{/if}
					</div>
				</div>
				<button class="close-btn" onclick={close} aria-label="Close conversation">×</button>
			</header>

			<div class="scrollback">
				{#if !lastQuestion && info?.greeting}
					<p class="npc">{info.greeting}</p>
					<div class="suggestions">
						<button type="button" onclick={() => ask('Any hints for my quest at the HQ building?')}>
							💡 Quest Hint
						</button>
						<button type="button" onclick={() => ask("What's the weather like in Bengaluru today?")}>
							🌦️ Weather today
						</button>
						<button type="button" onclick={() => ask("What's the latest news in Bengaluru?")}>
							📰 City news
						</button>
					</div>
				{/if}

				{#if lastQuestion}
					<p class="you">{lastQuestion}</p>
				{/if}
				{#if loading}
					<div class="loading-state">
						<div class="spinner" aria-label="Loading"></div>
						<span>Gathering live intel via Anakin...</span>
					</div>
				{:else if errorText}
					<p class="error">{errorText}</p>
				{:else if reply}
					<p class="npc">{reply}</p>
					{#if sources.length}
						<div class="sources">
							<span>🔎 Live intel via Anakin</span>
							{#each sources as source (source.url)}
								<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- external source link -->
								<a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a>
							{/each}
						</div>
					{/if}
				{/if}
			</div>

			<form onsubmit={submit}>
				<input
					bind:value={message}
					maxlength={MAX_MESSAGE_LENGTH}
					placeholder="Ask anything or request a quest hint..."
					disabled={loading}
				/>
				<button type="submit" disabled={loading || !message.trim()}>Send</button>
				<button type="button" class="leave-btn" onclick={close} title="End conversation">Leave <kbd>Esc</kbd></button>
			</form>
		</div>
	</div>
{/if}

<style>
	.dialogue-backdrop {
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: 60;
		display: flex;
		align-items: flex-end;
		justify-content: center;
		padding-bottom: 2.2rem;
	}
	.panel {
		pointer-events: auto;
		width: min(92vw, 36rem);
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		padding: 1.1rem 1.35rem;
		border-radius: 1.25rem;
		background: rgba(15, 23, 42, 0.88);
		backdrop-filter: blur(24px);
		-webkit-backdrop-filter: blur(24px);
		border: 1px solid rgba(255, 255, 255, 0.18);
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.75), 0 0 28px rgba(127, 196, 198, 0.22);
		color: white;
		font-family: system-ui, sans-serif;
		animation: floatUp 0.28s cubic-bezier(0.16, 1, 0.3, 1);
	}
	@keyframes floatUp {
		from {
			opacity: 0;
			transform: translateY(22px) scale(0.96);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}
	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.character-header {
		display: flex;
		align-items: center;
		gap: 0.65rem;
	}
	.avatar-badge {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.2rem;
		height: 2.2rem;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.12);
		border: 1px solid rgba(255, 255, 255, 0.25);
		font-size: 1.2rem;
	}
	.char-titles {
		display: flex;
		align-items: baseline;
		gap: 0.35rem;
	}
	.close-btn {
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: #e2e8f0;
		font-size: 1.25rem;
		line-height: 1;
		width: 1.8rem;
		height: 1.8rem;
		border-radius: 50%;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.15s, transform 0.1s;
	}
	.close-btn:hover {
		background: rgba(255, 255, 255, 0.25);
		transform: scale(1.08);
	}
	.scrollback {
		max-height: 38vh;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		padding-right: 0.3rem;
	}
	.scrollback p {
		margin: 0;
		line-height: 1.45;
		white-space: pre-wrap;
	}
	.npc {
		background: rgba(255, 255, 255, 0.08);
		padding: 0.7rem 0.9rem;
		border-radius: 0.75rem;
		border-left: 3px solid #7fc4c6;
		font-size: 0.95rem;
	}
	.you {
		align-self: flex-end;
		background: rgba(127, 196, 198, 0.2);
		border: 1px solid rgba(127, 196, 198, 0.35);
		padding: 0.5rem 0.8rem;
		border-radius: 0.75rem;
		font-size: 0.9rem;
		color: #e0f2fe;
	}
	.error {
		color: #f87171;
		font-size: 0.9rem;
	}
	.title {
		font-size: 0.82rem;
		opacity: 0.75;
		font-weight: normal;
		color: #94a3b8;
	}
	.sources {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.75rem;
		opacity: 0.85;
		padding: 0.3rem 0.5rem;
		background: rgba(0, 0, 0, 0.25);
		border-radius: 0.5rem;
	}
	.sources a {
		color: #7fc4c6;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.suggestions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-top: 0.3rem;
	}
	.suggestions button {
		background: rgba(255, 255, 255, 0.12);
		border: 1px solid rgba(255, 255, 255, 0.22);
		color: #e2e8f0;
		padding: 0.35rem 0.7rem;
		border-radius: 0.6rem;
		font-size: 0.8rem;
		cursor: pointer;
		transition: background 0.15s, transform 0.1s;
	}
	.suggestions button:hover {
		background: rgba(255, 255, 255, 0.26);
		transform: translateY(-1px);
	}
	.loading-state {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		font-size: 0.85rem;
		opacity: 0.85;
		color: #94a3b8;
	}
	.spinner {
		width: 1.25rem;
		height: 1.25rem;
		border: 2px solid rgba(255, 255, 255, 0.25);
		border-top-color: #7fc4c6;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	form {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}
	input {
		flex: 1;
		padding: 0.6rem 0.85rem;
		border-radius: 0.65rem;
		border: 1px solid rgba(255, 255, 255, 0.2);
		background: rgba(255, 255, 255, 0.08);
		color: white;
		outline: none;
		font-size: 0.9rem;
	}
	input:focus {
		border-color: #7fc4c6;
		box-shadow: 0 0 0 2px rgba(127, 196, 198, 0.25);
	}
	button[type='submit'] {
		padding: 0.6rem 1.05rem;
		border-radius: 0.65rem;
		border: none;
		background: #7fc4c6;
		color: #0f172a;
		font-weight: 600;
		font-size: 0.88rem;
		cursor: pointer;
		transition: background 0.15s, transform 0.1s;
	}
	button[type='submit']:hover:not(:disabled) {
		background: #99d5d7;
		transform: translateY(-1px);
	}
	button[type='submit']:disabled {
		opacity: 0.4;
		cursor: default;
	}
	.leave-btn {
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: #cbd5e1;
		padding: 0.6rem 0.75rem;
		border-radius: 0.65rem;
		font-size: 0.82rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.3rem;
		transition: background 0.15s;
	}
	.leave-btn:hover {
		background: rgba(255, 255, 255, 0.2);
		color: white;
	}
	kbd {
		background: rgba(0, 0, 0, 0.4);
		border-radius: 0.25rem;
		padding: 0.1rem 0.35rem;
		font-size: 0.72rem;
		font-family: inherit;
	}
</style>
