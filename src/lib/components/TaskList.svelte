<script lang="ts">
	import { quests, activeQuests, toasts } from '$lib/game/questManager';
	import { slide } from 'svelte/transition';

	let collapsed = $state(false);

	function toggleCollapse() {
		collapsed = !collapsed;
	}
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

<!-- Task List Widget -->
<div class="task-widget">
	<button class="header-btn" onclick={toggleCollapse} aria-expanded={!collapsed}>
		<div class="header-left">
			<span class="icon">📋</span>
			<span class="title">Active Quests</span>
			<span class="badge">{$activeQuests.length}</span>
		</div>
		<span class="chevron">{collapsed ? '▼' : '▲'}</span>
	</button>

	{#if !collapsed}
		<div class="quest-content" transition:slide={{ duration: 200 }}>
			{#if $activeQuests.length === 0}
				<div class="empty-state">
					Explore Bangalore and speak with residents to discover quests!
				</div>
			{:else}
				{#each $activeQuests as q (q.id)}
					<div class="quest-group" class:all-done={q.completed}>
						<div class="quest-header">
							<span class="quest-icon">{q.icon}</span>
							<span class="quest-title">{q.title}</span>
							{#if q.completed}
								<span class="completed-pill">Done</span>
							{/if}
						</div>
						<div class="task-items">
							{#each q.tasks as t (t.id)}
								<div class="task-row" class:done={t.done}>
									<div class="check-box" class:checked={t.done}>
										{#if t.done}
											<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3">
												<polyline points="20 6 9 17 4 12" />
											</svg>
										{/if}
									</div>
									<span class="task-label">{t.label}</span>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			{/if}
		</div>
	{/if}
</div>

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
		background: rgba(22, 27, 34, 0.92);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border: 1px solid rgba(76, 175, 80, 0.5);
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

	.task-widget {
		position: fixed;
		top: 18px;
		right: 18px;
		width: 320px;
		max-width: calc(100vw - 36px);
		background: rgba(18, 22, 28, 0.88);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		border: 1px solid rgba(255, 255, 255, 0.14);
		border-radius: 14px;
		box-shadow: 0 10px 36px rgba(0, 0, 0, 0.4);
		z-index: 1200;
		overflow: hidden;
		font-family: system-ui, -apple-system, sans-serif;
		color: #ffffff;
	}

	.header-btn {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 14px;
		background: transparent;
		border: none;
		color: inherit;
		cursor: pointer;
		font-size: 0.92rem;
		font-weight: 600;
	}

	.header-btn:hover {
		background: rgba(255, 255, 255, 0.05);
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.badge {
		background: #ff9800;
		color: #000000;
		font-size: 0.72rem;
		font-weight: 800;
		padding: 1px 7px;
		border-radius: 10px;
	}

	.chevron {
		font-size: 0.75rem;
		color: #aaaaaa;
	}

	.quest-content {
		max-height: 420px;
		overflow-y: auto;
		padding: 0 12px 12px;
	}

	.empty-state {
		font-size: 0.82rem;
		color: #999;
		padding: 12px 6px;
		text-align: center;
	}

	.quest-group {
		margin-top: 10px;
		padding: 10px;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 10px;
	}

	.quest-group.all-done {
		border-color: rgba(76, 175, 80, 0.35);
		background: rgba(76, 175, 80, 0.06);
	}

	.quest-header {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 0.86rem;
		font-weight: 700;
		margin-bottom: 8px;
	}

	.completed-pill {
		margin-left: auto;
		background: #2e7d32;
		color: #fff;
		font-size: 0.65rem;
		padding: 2px 6px;
		border-radius: 4px;
		text-transform: uppercase;
		font-weight: 800;
	}

	.task-items {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.task-row {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		font-size: 0.8rem;
		color: #d8d8d8;
		line-height: 1.35;
	}

	.check-box {
		width: 16px;
		height: 16px;
		min-width: 16px;
		border-radius: 4px;
		border: 1.5px solid rgba(255, 255, 255, 0.35);
		margin-top: 1px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.2);
		transition: all 0.2s ease;
	}

	.check-box.checked {
		background: #4caf50;
		border-color: #4caf50;
		color: #ffffff;
		transform: scale(1.05);
	}

	.task-row.done .task-label {
		text-decoration: line-through;
		color: #888888;
	}
</style>
