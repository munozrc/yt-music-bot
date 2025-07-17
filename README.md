# yt-music-bot

🎵 A Discord music bot built with TypeScript that streams music from YouTube 🔥

## ✨ Features

- 🔥 Play music directly from YouTube links or search queries
- 🎶 Supports playlists and individual tracks
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
npm install
```

## ⚙️ Configure your bot

1. Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

2. Fill in your Discord bot token and other configs in `.env`.

| Variable        | Description                                                |
| --------------- | ---------------------------------------------------------- |
| `DISCORD_TOKEN` | Your Discord bot token.                                    |
| `CLIENT_ID`     | Your bot’s application client ID.                          |
| `GUILD_ID`      | (Optional) Guild ID for testing slash commands.            |
| `DEBUG`         | (Optional) Enable detailed debug logs (`true` or `false`). |


## ▶️ Run the bot

```bash
npm run dev
```

```bash
npm run build
npm start
```

## 📜 Commands

| Command           | Description                          |
| ----------------- | ------------------------------------ |
| `/play <query>`   | Play a song or playlist from YouTube |
| `/skip`           | Skip to the next track               |
| `/stop`           | Stop the music and clear the queue   |
| `/queue`          | Show current queue                   |
| `/pause`          | Pause playback                       |
| `/resume`         | Resume playback                      |
| `/volume <1-100>` | Set the playback volume              |

## 🛠️ Built With

- **Discord.js v14** – Interact with the Discord API
- **TypeScript** – Typed JavaScript
- **youtubei.js** – Download YouTube streams
- **dotenv** – Manage environment variables

## 📖 License

This project is licensed under the **AGPL-3.0 license**.

## 📫 Contact

Created with ❤️ by **@munozrc**
