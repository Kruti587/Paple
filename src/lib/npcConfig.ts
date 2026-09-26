// Maps in-scene NPC identifiers to their Anakin apps.
// App IDs are placeholders until the 5 Anakin apps are created — substitute the real IDs here.
export const npcConfig: Record<string, { appId: string; name: string }> = {
	alien: { appId: 'ANAKIN_APP_ID_ALIEN', name: 'Alien' },
	chef: { appId: 'ANAKIN_APP_ID_CHEF', name: 'Chef' },
	caveman: { appId: 'ANAKIN_APP_ID_CAVEMAN', name: 'Caveman' },
	diver: { appId: 'ANAKIN_APP_ID_DIVER', name: 'Diver' },
	musician: { appId: 'ANAKIN_APP_ID_MUSICIAN', name: 'Musician' }
};

/** Shared client + server cap to protect the API budget. */
export const MAX_MESSAGE_LENGTH = 500;
