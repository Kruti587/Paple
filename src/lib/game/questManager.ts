import { writable, derived } from 'svelte/store';
import { INITIAL_QUESTS, type Quest, type QuestTask } from './questRegistry';

export interface QuestToast {
	id: string;
	title: string;
	message: string;
	icon: string;
}

const questsStore = writable<Quest[]>(INITIAL_QUESTS);
const toastsStore = writable<QuestToast[]>([]);

let toastCounter = 0;

export function addToast(title: string, message: string, icon = '✓') {
	const id = `toast_${Date.now()}_${++toastCounter}`;
	toastsStore.update((list) => [...list, { id, title, message, icon }]);
	setTimeout(() => {
		toastsStore.update((list) => list.filter((t) => t.id !== id));
	}, 4000);
}

export const quests = {
	subscribe: questsStore.subscribe,

	activateQuest(questId: string) {
		questsStore.update((all) =>
			all.map((q) => {
				if (q.id === questId && !q.active) {
					addToast('New Quest Started!', q.title, q.icon);
					return { ...q, active: true };
				}
				return q;
			})
		);
	},

	completeTask(questId: string, taskId: string) {
		questsStore.update((all) =>
			all.map((q) => {
				if (q.id !== questId) return q;
				const updatedTasks = q.tasks.map((t) => {
					if (t.id === taskId && !t.done) {
						addToast('Task Complete!', t.label, '✓');
						return { ...t, done: true };
					}
					return t;
				});

				const allDone = updatedTasks.every((t) => t.done);
				if (allDone && !q.completed) {
					addToast('Quest Completed! 🎉', `${q.title} — ${q.reward}`, '🏆');
				}

				return {
					...q,
					active: true,
					tasks: updatedTasks,
					completed: allDone
				};
			})
		);
	},

	hasCompletedTask(questId: string, taskId: string): boolean {
		let res = false;
		questsStore.subscribe((all) => {
			const q = all.find((item) => item.id === questId);
			const t = q?.tasks.find((task) => task.id === taskId);
			res = !!t?.done;
		})();
		return res;
	},

	hasCompletedQuest(questId: string): boolean {
		let res = false;
		questsStore.subscribe((all) => {
			const q = all.find((item) => item.id === questId);
			res = !!q?.completed;
		})();
		return res;
	},

	reset() {
		questsStore.set(INITIAL_QUESTS);
	}
};

export const toasts = {
	subscribe: toastsStore.subscribe,
	remove(id: string) {
		toastsStore.update((list) => list.filter((t) => t.id !== id));
	}
};

export const activeQuests = derived(questsStore, ($quests) => $quests.filter((q) => q.active));
