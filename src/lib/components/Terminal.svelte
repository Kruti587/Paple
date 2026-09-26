<script lang="ts">
	import { onMount } from 'svelte';
	import { COMPANY_NAME } from '$lib/world/props/signs';

	let {
		onsubmit,
		onclose,
		ondone
	}: {
		/** Returns true if the code is right. */
		onsubmit: (code: string) => boolean;
		onclose: () => void;
		ondone: () => void;
	} = $props();

	const BOOT = [
		`${COMPANY_NAME}-OS v2.6 — secure shell (tty1)`,
		`Connecting to ${COMPANY_NAME.toLowerCase()}-hq.local ... ok`,
		'WARNING: unauthorised access detected near main entrance',
		'Enter the access code from the post-it to continue.'
	];

	let lines = $state<{ text: string; kind?: 'error' | 'ok' | 'input' }[]>([]);
	let value = $state('');
	let booted = $state(false);
	let granted = $state(false);
	let attempts = 0;
	let input = $state<HTMLInputElement>();

	onMount(() => {
		let i = 0;
		const timer = setInterval(() => {
			lines = [...lines, { text: BOOT[i] }];
			i++;
			if (i >= BOOT.length) {
				clearInterval(timer);
				booted = true;
				queueMicrotask(() => input?.focus());
			}
		}, 260);
		return () => clearInterval(timer);
	});

	let loading = $state(false);

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		if (!booted || granted || loading) return;
		const code = value.trim();
		if (!code) return;
		lines = [...lines, { text: `> ${code}`, kind: 'input' }];
		value = '';

		// If it's the valid 4-digit access code
		if (onsubmit(code)) {
			granted = true;
			lines = [
				...lines,
				{ text: 'ACCESS GRANTED ✔', kind: 'ok' },
				{ text: `Welcome, Anakin. The ${COMPANY_NAME} mainframe is yours.`, kind: 'ok' }
			];
			setTimeout(ondone, 2600);
			return;
		}

		// If it looks like a 4-digit numeric attempt that was wrong
		if (/^\d{4}$/.test(code)) {
			attempts++;
			lines = [
				...lines,
				{ text: `ACCESS DENIED ✖  (attempt ${attempts}) — check the post-it, or type 'hint'`, kind: 'error' }
			];
			return;
		}

		// Otherwise, query the Anakin AI mainframe assistant!
		loading = true;
		lines = [...lines, { text: `[SYSTEM] Querying Anakin neural security link...`, kind: 'ok' }];

		try {
			const res = await fetch('/api/quest/terminal', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ command: code })
			});

			if (res.ok) {
				const data = (await res.json()) as { reply?: string };
				const replyLines = (data.reply || '').split('\n').filter(Boolean);
				lines = [
					...lines,
					...replyLines.map((t) => ({ text: t, kind: 'ok' as const }))
				];
			} else {
				lines = [
					...lines,
					{ text: `SYS_ERR: Connection timed out. Enter 4-digit PIN.`, kind: 'error' }
				];
			}
		} catch {
			lines = [
				...lines,
				{ text: `SYS_ERR: Security subsystem unreachable.`, kind: 'error' }
			];
		} finally {
			loading = false;
			queueMicrotask(() => input?.focus());
		}
	}

	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && !granted) onclose();
	}
</script>

<svelte:window {onkeydown} />

<div class="backdrop">
	<div class="terminal" role="dialog" aria-label="Command prompt">
		<div class="titlebar">
			<span class="dots"><i></i><i></i><i></i></span>
			<span>C:\{COMPANY_NAME}\mainframe&gt; cmd.exe (AI Link Active)</span>
			{#if !granted}
				<button class="close" onclick={onclose} aria-label="Close">×</button>
			{/if}
		</div>
		<div class="screen">
			{#each lines as line, i (i)}
				<div class="line {line.kind ?? ''}">{line.text}</div>
			{/each}
			{#if booted && !granted}
				<form onsubmit={submit} class="prompt">
					<span>&gt;</span>
					<input
						bind:this={input}
						bind:value
						maxlength="64"
						autocomplete="off"
						spellcheck="false"
						disabled={loading}
						placeholder={loading ? 'Processing...' : ''}
						aria-label="Access code or terminal command"
					/>
				</form>
				<div class="help">Enter 4-digit code or type 'help' / 'hint' for AI mainframe guidance · Esc to close</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.backdrop {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		background: rgb(0 0 0 / 0.35);
		z-index: 15;
	}
	.terminal {
		width: min(92vw, 40rem);
		border: 2px solid #1f3a2a;
		border-radius: 0.6rem;
		overflow: hidden;
		box-shadow:
			0 0 0 4px #0b0f0c,
			0 20px 60px rgb(0 0 0 / 0.6);
		background: #050a07;
		font-family: 'Cascadia Mono', Consolas, 'Courier New', monospace;
	}
	.titlebar {
		display: flex;
		align-items: center;
		gap: 0.8rem;
		padding: 0.45rem 0.8rem;
		background: #16241b;
		color: #9fd8b0;
		font-size: 0.8rem;
	}
	.dots {
		display: flex;
		gap: 0.3rem;
	}
	.dots i {
		width: 0.65rem;
		height: 0.65rem;
		border-radius: 50%;
		background: #3a5a45;
	}
	.close {
		margin-left: auto;
		border: none;
		background: none;
		color: #9fd8b0;
		font-size: 1.2rem;
		cursor: pointer;
	}
	.screen {
		min-height: 14rem;
		padding: 1rem 1.1rem;
		color: #39ff88;
		font-size: 0.98rem;
		line-height: 1.55;
		text-shadow: 0 0 6px rgb(57 255 136 / 0.55);
		/* CRT scanlines */
		background-image: repeating-linear-gradient(
			0deg,
			rgb(255 255 255 / 0.03) 0 1px,
			transparent 1px 3px
		);
	}
	.line.error {
		color: #ff5d5d;
		text-shadow: 0 0 6px rgb(255 93 93 / 0.5);
	}
	.line.ok {
		color: #b6ff5d;
		font-weight: 700;
	}
	.line.input {
		color: #d7ffe6;
	}
	.prompt {
		display: flex;
		gap: 0.5rem;
	}
	.prompt input {
		flex: 1;
		border: none;
		outline: none;
		background: transparent;
		color: #d7ffe6;
		font: inherit;
		caret-color: #39ff88;
		letter-spacing: 0.25em;
	}
	.help {
		margin-top: 0.6rem;
		opacity: 0.5;
		font-size: 0.78rem;
	}
</style>
