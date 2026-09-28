export interface QuestTask {
	id: string;
	label: string;
	done: boolean;
}

export interface Quest {
	id: string;
	title: string;
	icon: string;
	giver: string;
	description: string;
	tasks: QuestTask[];
	reward: string;
	completed: boolean;
	active: boolean;
}

export const INITIAL_QUESTS: Quest[] = [
	{
		id: 'musician_veena',
		title: 'The Sacred Veena',
		icon: '🪕',
		giver: 'musician',
		description: 'Vidwan Sundaram needs the sacred Divine Veena from Sri Ganesha Temple to complete his evening raga.',
		active: true,
		completed: false,
		reward: 'Rhythm Bell — Highlights nearby secrets',
		tasks: [
			{ id: 'talk_musician', label: 'Talk to Vidwan Sundaram on the Promenade', done: false },
			{ id: 'get_veena', label: 'Retrieve the Divine Veena from Sri Ganesha Temple', done: false },
			{ id: 'deliver_veena', label: 'Deliver the Divine Veena back to Vidwan Sundaram', done: false }
		]
	},
	{
		id: 'chef_chai_rush',
		title: 'The Hot Chai Rush',
		icon: '☕',
		giver: 'chef',
		description: 'Chef Ramesh has VIP orders that must reach customers before they go cold!',
		active: false,
		completed: false,
		reward: 'Filter Coffee Boost (+25% run speed)',
		tasks: [
			{ id: 'talk_chef', label: 'Meet Chef Ramesh at Ramesh Grand Hotel', done: false },
			{ id: 'deliver_musician', label: 'Deliver hot filter coffee to Vidwan Sundaram', done: false },
			{ id: 'deliver_mani', label: 'Deliver cutting chai to Captain Mani at Ulsoor Lake', done: false },
			{ id: 'return_chef', label: 'Return to Chef Ramesh for your reward', done: false }
		]
	},
	{
		id: 'alien_ufo_repair',
		title: 'Galactic UFO Repair',
		icon: '🛸',
		giver: 'alien',
		description: 'Zylar-9 crash-landed in Cubbon Park. Collect rare materials to repair the flying saucer!',
		active: false,
		completed: false,
		reward: 'Cosmic Scanner — Scans interactables through walls',
		tasks: [
			{ id: 'inspect_ufo', label: 'Inspect the broken flying saucer in Cubbon Park', done: false },
			{ id: 'steal_strut', label: 'Acquire Quantum Titanium Strut from the Science Museum', done: false },
			{ id: 'buy_capacitor', label: 'Get Crystal Capacitor from Kaveri Electronics', done: false },
			{ id: 'repair_ufo', label: 'Help Zylar-9 install parts into the saucer', done: false }
		]
	},
	{
		id: 'mani_lake_revival',
		title: 'Revive the Lotus Lake',
		icon: '🪷',
		giver: 'diver',
		description: 'Captain Mani wants to clear the clogging from Ulsoor Lake to let the lotus blossoms bloom.',
		active: false,
		completed: false,
		reward: 'Lotus Walk — Glide across lily pads',
		tasks: [
			{ id: 'talk_mani', label: 'Speak with Captain Mani at Ulsoor Lake bank', done: false },
			{ id: 'clear_debris', label: 'Wade into the lake and retrieve 2 sunken debris items', done: false },
			{ id: 'open_sluice', label: 'Turn the ancient lake sluice wheel', done: false }
		]
	},
	{
		id: 'grog_ancient_spark',
		title: 'The Primordial Spark',
		icon: '🔥',
		giver: 'caveman',
		description: 'Grog the Ancient needs flint from the Precambrian Boulders to rekindle the sacred fire.',
		active: false,
		completed: false,
		reward: 'Stone Throw — Distract guards and bypass obstacles',
		tasks: [
			{ id: 'talk_grog', label: 'Greet Grog at the Precambrian Boulders', done: false },
			{ id: 'find_flint', label: 'Find a sharp flint stone among the rock outcrops', done: false },
			{ id: 'light_fire', label: 'Help Grog spark the ancient boulder bonfire', done: false }
		]
	}
];
