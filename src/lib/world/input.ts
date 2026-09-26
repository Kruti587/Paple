export interface MoveInput {
	/** Strafe: -1 left … +1 right */
	x: number;
	/** Forward: -1 back … +1 forward */
	z: number;
	run: boolean;
}

const isTyping = (t: EventTarget | null) =>
	t instanceof HTMLInputElement ||
	t instanceof HTMLTextAreaElement ||
	(t instanceof HTMLElement && t.isContentEditable);

/** WASD / arrow keys (+ Shift to run). Ignores keys while typing in the dialogue box. */
export function createKeyboard(target: Window = window) {
	const down = new Set<string>();
	const onDown = (e: KeyboardEvent) => {
		if (isTyping(e.target)) return;
		down.add(e.code);
	};
	const onUp = (e: KeyboardEvent) => down.delete(e.code);
	const onBlur = () => down.clear();
	target.addEventListener('keydown', onDown);
	target.addEventListener('keyup', onUp);
	target.addEventListener('blur', onBlur);
	const has = (...codes: string[]) => codes.some((c) => down.has(c));

	return {
		read(): MoveInput {
			return {
				x: (has('KeyD', 'ArrowRight') ? 1 : 0) - (has('KeyA', 'ArrowLeft') ? 1 : 0),
				z: (has('KeyW', 'ArrowUp') ? 1 : 0) - (has('KeyS', 'ArrowDown') ? 1 : 0),
				run: has('ShiftLeft', 'ShiftRight')
			};
		},
		/** Clears held keys, e.g. when focus moves into the chat box mid-stride. */
		reset: () => down.clear(),
		dispose() {
			target.removeEventListener('keydown', onDown);
			target.removeEventListener('keyup', onUp);
			target.removeEventListener('blur', onBlur);
		}
	};
}
