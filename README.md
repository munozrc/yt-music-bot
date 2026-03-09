# yt-music-bot

🎵 A Discord music bot built with TypeScript that streams music from YouTube 🔥

## ✨ Features

- 🔥 Play music directly from YouTube links or search queries
- 🔁 Autoplay: automatically plays related songs after the queue ends
- ⏯️ Controls: play, pause, skip, stop, volume, queue
- 📜 Slash command support (`/play`, `/skip`, etc.)

## 🚀 Getting Started

### Clone the repository

```bash
git clone https://github.com/munozrc/yt-music-bot.git
cd yt-music-bot
```

### Install dependencies

```bash
pnpm install
```

## ⚙️ Configure your bot

1. Fill in your Discord bot token and other configs in `.env`.

| Variable        | Description                                                |
| --------------- | ---------------------------------------------------------- |
| `DISCORD_TOKEN` | Your Discord bot token.                                    |
| `CLIENT_ID`     | Your bot’s application client ID.                          |
| `GUILD_ID`      | (Optional) Guild ID for testing slash commands.            |
| `DEBUG`         | (Optional) Enable detailed debug logs (`true` or `false`). |

## ▶️ Run the bot

```bash
pnpm run start
```

## 📜 Commands

| Command           | Description                                                               |
| ----------------- | ------------------------------------------------------------------------- |
| `/play <query>`   | Play a song or add it to the queue (YouTube URL or search term, required) |
| `/skip`           | Skip the current track                                                    |
| `/stop`           | Stop playback and clear the queue (bot stays in channel)                  |
| `/leave`          | Disconnect the bot from the voice channel and clear the queue             |
| `/queue [page]`   | Show the current queue (optional `page`, default: 1)                      |
| `/pause`          | Pause the current track                                                   |
| `/resume`         | Resume a paused track                                                     |
| `/volume <0-200>` | Set the playback volume (0–200)                                           |
| `/loop <mode>`    | Set loop mode — choices: `Off`, `Track`, `Queue`, `Autoplay`              |

Notes:

- Most voice/control commands require you to be in the same voice channel as the bot.

## 🛠️ Built With

- **Discord.js v14** – Interact with the Discord API
- **TypeScript** – Typed JavaScript
- **youtubei.js** – Download YouTube streams
- **dotenv** – Manage environment variables

## 📖 License

This project is licensed under the **AGPL-3.0 license**.

## 📫 Contact

Created with ❤️ by **@munozrc**
