<script lang="ts">
	import { MAX_MESSAGE_LENGTH, npcConfig } from '$lib/npcConfig';

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
	let errorText = $state('');
	let loading = $state(false);
	let controller: AbortController | null = null;

	function reset() {
		controller?.abort();
		controller = null;
		message = '';
		lastQuestion = '';
		reply = '';
		errorText = '';
		loading = false;
	}

	// Switching NPCs or closing starts a fresh conversation — nothing is persisted.
	$effect(() => {
		void npcId;
		void open;
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
				reply = (await res.json()).reply;
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
	<div class="panel" role="dialog" aria-label="Talk to {npcName}">
		<header>
			<div>
				<strong>{npcName}</strong>
				{#if info?.title}
					<span class="title"> · {info.title}</span>
				{/if}
			</div>
			<button class="close" onclick={close} aria-label="Close">×</button>
		</header>

		<div class="scrollback">
			{#if !lastQuestion && info?.greeting}
				<p class="npc">{info.greeting}</p>
				<div class="suggestions">
					<button type="button" onclick={() => ask('Any hints for my quest at the HQ building?')}>
						💡 Quest Hint
					</button>
					<button type="button" onclick={() => ask('Tell me about yourself and this city!')}>
						🏙️ About Bengaluru
					</button>
				</div>
			{/if}

			{#if lastQuestion}
				<p class="you">{lastQuestion}</p>
			{/if}
			{#if loading}
				<div class="loading-state">
					<div class="spinner" aria-label="Loading"></div>
					<span>Thinking via Anakin...</span>
				</div>
			{:else if errorText}
				<p class="error">{errorText}</p>
			{:else if reply}
				<p class="npc">{reply}</p>
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
		</form>
	</div>
{/if}

<style>
	.panel {
		position: absolute;
		right: 1.5rem;
		bottom: 1.5rem;
		width: min(90vw, 24rem);
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1rem;
		border-radius: 0.75rem;
		background: rgb(0 0 0 / 0.75);
		color: white;
		font-family: system-ui, sans-serif;
	}
	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.close {
		background: none;
		border: none;
		color: inherit;
		font-size: 1.5rem;
		line-height: 1;
		cursor: pointer;
	}
	.scrollback {
		max-height: 40vh;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.scrollback p {
		margin: 0;
		white-space: pre-wrap;
	}
	.you {
		align-self: flex-end;
		opacity: 0.8;
		font-style: italic;
	}
	.error {
		color: #ff8a8a;
	}
	.title {
		font-size: 0.85rem;
		opacity: 0.7;
		font-weight: normal;
	}
	.suggestions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-top: 0.3rem;
	}
	.suggestions button {
		background: rgb(255 255 255 / 0.15);
		border: 1px solid rgb(255 255 255 / 0.25);
		color: #e8ecff;
		padding: 0.3rem 0.6rem;
		border-radius: 0.5rem;
		font-size: 0.78rem;
		cursor: pointer;
		transition: background 0.15s;
	}
	.suggestions button:hover {
		background: rgb(255 255 255 / 0.3);
	}
	.loading-state {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		font-size: 0.85rem;
		opacity: 0.8;
	}
	.spinner {
		width: 1.25rem;
		height: 1.25rem;
		border: 2px solid rgb(255 255 255 / 0.3);
		border-top-color: white;
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
	}
	input {
		flex: 1;
		padding: 0.5rem 0.75rem;
		border-radius: 0.5rem;
		border: 1px solid rgb(255 255 255 / 0.2);
		background: rgb(255 255 255 / 0.1);
		color: white;
		outline: none;
	}
	input:focus {
		border-color: #7fc4c6;
	}
	button[type='submit'] {
		padding: 0.5rem 0.9rem;
		border-radius: 0.5rem;
		border: none;
		background: #7fc4c6;
		color: #1a2a30;
		font-weight: bold;
		cursor: pointer;
	}
	button[type='submit']:disabled {
		opacity: 0.4;
		cursor: default;
	}
</style>
