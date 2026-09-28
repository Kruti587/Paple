<script lang="ts">
	import { quests, activeQuests, toasts } from '$lib/game/questManager';
	import { INITIAL_QUESTS } from '$lib/game/questRegistry';
	import { slide, fade } from 'svelte/transition';

	// Open checklist initially or when user toggles
	let open = $state(false);
	let expandedQuestId = $state<string | null>(null);

	function toggleOpen() {
		open = !open;
	}

	function toggleExpand(id: string) {
		expandedQuestId = expandedQuestId === id ? null : id;
	}

	// Read all quests from store
	let allQuests = $derived.by(() => {
		let list = INITIAL_QUESTS;
		quests.subscribe((val) => (list = val))();
		return list;
	});
</script>

<!-- Toasts overlay -->
<div class="toast-container">
	{#each $toasts as t (t.id)}
		<div class="toast-card" transition:slide={{ duration: 250 }}>
			<div class="toast-icon">{t.icon}</div>
			<div class="toast-text">
				<div class="toast-title">{t.title}</div>
				<div class="toast-msg">{t.message}</div>
			</div>
		</div>
	{/each}
</div>

<!-- Top-Right Checklist Icon Button (Matches Reference Image) -->
<button
	class="checklist-btn"
	class:active={open}
	onclick={toggleOpen}
	aria-label="Toggle Checklist"
	title="View City Quest Checklist"
>
	<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
		<line x1="9" y1="6" x2="20" y2="6"/>
		<line x1="9" y1="12" x2="20" y2="12"/>
		<line x1="9" y1="18" x2="20" y2="18"/>
		<circle cx="4.5" cy="6" r="1.5" fill="currentColor"/>
		<circle cx="4.5" cy="12" r="1.5" fill="currentColor"/>
		<circle cx="4.5" cy="18" r="1.5" fill="currentColor"/>
	</svg>
	{#if $activeQuests.length > 0}
		<span class="badge">{$activeQuests.length}</span>
	{/if}
</button>

<!-- Notebook Checklist Sheet (Matches Reference Image 3) -->
{#if open}
	<div
		class="checklist-backdrop"
		transition:fade={{ duration: 150 }}
		onclick={toggleOpen}
		onkeydown={(e) => { if (e.key === 'Escape') toggleOpen(); }}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<div
			class="checklist-paper"
			transition:slide={{ duration: 250 }}
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="document"
			aria-label="Quest Checklist"
		>
			<div class="paper-pin"></div>
			<div class="paper-header">
				<h2 class="checklist-title">CHECKLIST:</h2>
				<button class="close-paper-btn" onclick={toggleOpen} aria-label="Close">×</button>
			</div>

			<div class="quest-lines">
				{#each allQuests as q, idx (q.id)}
					{@const doneCount = q.tasks.filter((t) => t.done).length}
					{@const totalCount = q.tasks.length}
					{@const isFinished = doneCount === totalCount}
					<div class="quest-item" class:completed={isFinished}>
						<button class="quest-row-btn" onclick={() => toggleExpand(q.id)}>
							<div class="quest-line-text" class:crossed-out={isFinished}>
								<span class="num">{idx + 1}.</span>
								<span class="title">{q.title}</span>
								<span class="progress">({doneCount}/{totalCount})</span>
							</div>
							<span class="expand-icon">{expandedQuestId === q.id ? '▴' : '▾'}</span>
						</button>

						{#if expandedQuestId === q.id}
							<div class="subtasks-list" transition:slide={{ duration: 180 }}>
								{#each q.tasks as t (t.id)}
									<div class="subtask-row" class:done={t.done}>
										<div class="paper-checkbox" class:checked={t.done}>
											{#if t.done}
												<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3.5">
													<polyline points="20 6 9 17 4 12" />
												</svg>
											{/if}
										</div>
										<span class="subtask-label">{t.label}</span>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			</div>

			<div class="paper-footer">
				<span>Bengaluru Explorer Edition</span>
				<span class="close-hint">Press <kbd>Esc</kbd> or click outside to close</span>
			</div>
		</div>
	</div>
{/if}

<style>
	.toast-container {
		position: fixed;
		top: 24px;
		left: 50%;
		transform: translateX(-50%);
		z-index: 9999;
		display: flex;
		flex-direction: column;
		gap: 8px;
		pointer-events: none;
	}

	.toast-card {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 18px;
		background: rgba(22, 27, 34, 0.94);
		backdrop-filter: blur(12px);
		border: 1px solid rgba(76, 175, 80, 0.6);
		border-radius: 24px;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45);
		color: #ffffff;
		font-family: system-ui, -apple-system, sans-serif;
	}

	.toast-icon {
		font-size: 1.25rem;
	}

	.toast-title {
		font-size: 0.82rem;
		font-weight: 700;
		color: #4caf50;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.toast-msg {
		font-size: 0.88rem;
		color: #e0e0e0;
	}

	/* Top-Right Toggle Button (Matches Reference Image 2) */
	.checklist-btn {
		position: fixed;
		top: 1.25rem;
		right: 1.25rem;
		width: 3.2rem;
		height: 3.2rem;
		border-radius: 0.85rem;
		background: #ffffff;
		border: 2.5px solid #2d3748;
		box-shadow: 0 4px 0 #2d3748, 0 8px 16px rgba(0, 0, 0, 0.15);
		color: #2d3748;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 50;
		transition: transform 0.15s, box-shadow 0.15s, background 0.15s;
	}

	.checklist-btn:hover {
		transform: translateY(-2px);
		box-shadow: 0 6px 0 #2d3748, 0 10px 20px rgba(0, 0, 0, 0.2);
		background: #f8fafc;
	}

	.checklist-btn:active,
	.checklist-btn.active {
		transform: translateY(2px);
		box-shadow: 0 2px 0 #2d3748;
		background: #edf2f7;
	}

	.badge {
		position: absolute;
		top: -4px;
		right: -4px;
		background: #f97316;
		color: #ffffff;
		font-size: 0.72rem;
		font-weight: 800;
		min-width: 1.25rem;
		height: 1.25rem;
		border-radius: 999px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 2px solid #ffffff;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	}

	/* Paper Note Checklist (Matches Reference Image 3) */
	.checklist-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(15, 23, 42, 0.4);
		backdrop-filter: blur(4px);
		z-index: 100;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.5rem;
	}

	.checklist-paper {
		position: relative;
		width: min(92vw, 24rem);
		background: #ffffff;
		background-image: repeating-linear-gradient(
			to bottom,
			transparent 0px,
			transparent 27px,
			rgba(203, 213, 225, 0.45) 28px
		);
		border-radius: 0.5rem;
		padding: 1.8rem 1.6rem 1.4rem;
		box-shadow: 0 20px 40px -8px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(0, 0, 0, 0.08);
		transform: rotate(-0.5deg);
		font-family: 'Courier New', Courier, monospace, system-ui;
		color: #1e293b;
	}

	.paper-pin {
		position: absolute;
		top: -10px;
		left: 50%;
		transform: translateX(-50%);
		width: 38px;
		height: 16px;
		background: #cbd5e1;
		border-radius: 3px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
		border: 1px solid #94a3b8;
	}

	.paper-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1.2rem;
		border-bottom: 2px solid #1e293b;
		padding-bottom: 0.5rem;
	}

	.checklist-title {
		margin: 0;
		font-size: 1.35rem;
		font-weight: 900;
		letter-spacing: 0.08em;
		color: #0f172a;
	}

	.close-paper-btn {
		background: none;
		border: none;
		font-size: 1.6rem;
		line-height: 1;
		color: #64748b;
		cursor: pointer;
		padding: 0 0.2rem;
		transition: color 0.15s, transform 0.1s;
	}

	.close-paper-btn:hover {
		color: #0f172a;
		transform: scale(1.15);
	}

	.quest-lines {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		max-height: 60vh;
		overflow-y: auto;
		padding-right: 0.2rem;
	}

	.quest-row-btn {
		width: 100%;
		background: none;
		border: none;
		text-align: left;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.35rem 0.2rem;
		font-family: inherit;
		color: inherit;
		border-radius: 4px;
		transition: background 0.15s;
	}

	.quest-row-btn:hover {
		background: rgba(241, 245, 249, 0.6);
	}

	.quest-line-text {
		display: flex;
		align-items: baseline;
		gap: 0.45rem;
		font-size: 1.05rem;
		font-weight: 700;
		color: #1e293b;
	}

	.quest-line-text.crossed-out {
		text-decoration: line-through;
		text-decoration-thickness: 3px;
		text-decoration-color: #0f172a;
		color: #64748b;
		opacity: 0.85;
	}

	.num {
		font-weight: 800;
	}

	.title {
		letter-spacing: -0.01em;
	}

	.progress {
		font-size: 0.88rem;
		color: #475569;
		font-weight: 600;
	}

	.expand-icon {
		font-size: 0.8rem;
		color: #94a3b8;
		margin-left: 0.5rem;
	}

	.subtasks-list {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
		padding: 0.5rem 0 0.5rem 1.6rem;
		border-left: 2px dashed #cbd5e1;
		margin-left: 0.6rem;
		margin-top: 0.25rem;
	}

	.subtask-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.88rem;
		color: #334155;
	}

	.subtask-row.done {
		text-decoration: line-through;
		text-decoration-thickness: 2px;
		color: #94a3b8;
	}

	.paper-checkbox {
		width: 14px;
		height: 14px;
		border: 1.8px solid #475569;
		border-radius: 2px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #ffffff;
	}

	.paper-checkbox.checked {
		background: #16a34a;
		border-color: #16a34a;
		color: #ffffff;
	}

	.paper-footer {
		margin-top: 1.2rem;
		padding-top: 0.6rem;
		border-top: 1px dashed #cbd5e1;
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.72rem;
		color: #94a3b8;
	}

	.close-hint kbd {
		background: #e2e8f0;
		color: #334155;
		padding: 0.1rem 0.3rem;
		border-radius: 3px;
		font-size: 0.68rem;
	}
</style>
