# Namma Planet 🌏

A tiny, walkable planet version of Bengaluru, built with SvelteKit + Three.js. It has toon-shaded streets, auto-rickshaws, chai stalls, and a cast of characters who know what's happening in the real city right now, because every conversation pulls in **live web data from [Anakin.io](https://anakin.io)**.

## Powered by Anakin.io

Anakin.io is what connects this little world to the real web. The planet is 50 metres across, but its characters have access to the whole internet.

### 🗣️ NPCs that know what's happening today

Every time you talk to a character, Namma Planet runs a **real-time Anakin web search** (`POST /v1/search`) on your question, framed around Bengaluru. The top results are passed to the character before they reply, so their answers are based on current information instead of stale training data.

- Ask Chef Ramesh where to get the best filter coffee and he'll point you to real places people are talking about right now.
- Ask Zylar-9 about Bengaluru traffic and the alien will analyse whatever the web is saying about it today.
- Every answer shows a **"🔎 Live intel via Anakin"** panel with source links, so you can check any claim yourself.

Five characters (Chef Ramesh, Vidwan Sundaram, Zylar-9, Captain Mani and Grog the Ancient) all share the same Anakin connection, each in their own voice.

### 💻 The `SCAN` command: the quest terminal's view of the real web

The security kiosk outside **ANAKIN HQ** isn't just a PIN pad. Type `SCAN <topic>` and the terminal runs a live Anakin search, then prints the real findings as retro CRT scan output, one line per finding.

```
> SCAN bengaluru metro
[ANAKIN] Scanning the live web...
```

Type `SCAN` on its own for Bengaluru tech news.

### 🛡️ Built to keep working if Anakin is unavailable

Anakin calls run on the server with an 8-second timeout, and your API key never reaches the browser. If a search fails, characters keep talking without the web context, so the game never stalls because a search didn't return.

## The quest

1. Wander the planet and talk to the locals. Each one has a clue about the tall glass **ANAKIN HQ** across from the starting junction.
2. Sneak inside. The lift is broken, so take the stairs up to the 3rd-floor pantry.
3. Find the yellow post-it on the fridge with the 4-digit override code.
4. Get past the security staff (hold **Shift** to sprint) and enter the code at the outdoor terminal.

Stuck? Type `HINT` or `HELP` at the terminal, or ask any character for a quest hint.

## Controls

| Action           | Key               |
| ---------------- | ----------------- |
| Walk             | WASD / arrow keys |
| Sprint           | Shift             |
| Talk / interact  | E or click        |
| Close a dialogue | Esc               |

## Setup

```sh
npm install
cp .env.example .env
```

Fill in `.env` (server-only, never prefix these with `PUBLIC_`):

| Variable         | What it does                                                              |
| ---------------- | ------------------------------------------------------------------------- |
| `ANAKIN_API_KEY` | Your [Anakin.io](https://anakin.io) key. Powers live web intel and `SCAN` |
| `GROQ_API_KEY`   | LLM key used to write the character dialogue                              |

Then start the dev server:

```sh
npm run dev
```

## Building & deploying

```sh
npm run build
npm run preview
```

The project uses `@sveltejs/adapter-vercel` when built on Vercel (and `adapter-auto` everywhere else). Add both keys to your Vercel project's environment variables.

## Project layout

```
src/lib/server/anakin.ts        Anakin.io live web search client
src/routes/api/npc/[npcId]/     NPC dialogue endpoint (Anakin search + LLM reply)
src/routes/api/quest/terminal/  Quest terminal endpoint (SCAN → Anakin)
src/lib/npcConfig.ts            Character personas and quest knowledge
src/lib/world/                  The planet: roads, buildings, traffic, day/night cycle
src/lib/game/                   Quest logic, HQ interior, security guards
```
