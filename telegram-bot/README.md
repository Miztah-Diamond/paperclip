# Paperclip Telegram Bot

Control your [Paperclip](https://github.com/paperclipai/paperclip) instance from Telegram.

## Setup

### 1. Create a Telegram Bot

1. Open Telegram and message [@BotFather](https://t.me/BotFather)
2. Send `/newbot` and follow the prompts
3. Copy the **Bot Token** (looks like `123456:ABC-DEF...`)

### 2. Get your Chat ID

1. Message [@userinfobot](https://t.me/userinfobot) on Telegram
2. It will reply with your **Chat ID** (a number like `987654321`)

### 3. Install dependencies

```bash
cd telegram-bot
npm install
```

### 4. Run the bot

```bash
TELEGRAM_BOT_TOKEN=<your-token> \
TELEGRAM_CHAT_ID=<your-chat-id> \
PAPERCLIP_API_URL=http://localhost:3100 \
node bot.mjs
```

Or set environment variables in a `.env` file and use a tool like `dotenv`.

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `TELEGRAM_BOT_TOKEN` | ✅ | — | Token from @BotFather |
| `TELEGRAM_CHAT_ID` | Recommended | — | Your chat ID — restricts bot to only respond to you |
| `PAPERCLIP_API_URL` | — | `http://localhost:3100` | URL of your Paperclip server |
| `PAPERCLIP_SESSION_TOKEN` | — | — | Bearer token if your Paperclip instance requires auth |

## Commands

| Command | Description |
|---|---|
| `/help` | Show all commands |
| `/status` | Check Paperclip connection |
| `/companies` | List all companies |
| `/agents [companyId]` | List agents |
| `/tasks <companyId>` | List open tickets |
| `/goals <companyId>` | List company goals |
| `/approvals <companyId>` | Show pending approvals |
| `/approve <ids> <companyId>` | Approve one or more issues |
| `/addtask <companyId> <title>` | Create a new task |
| `/costs <companyId>` | View agent spending |

## Example Session

```
You: /companies
Bot: 🏢 Acme Corp — `abc123`

You: /tasks abc123
Bot: 🔵 Build landing page
     ↳ `issue_001`
     🟡 Set up CI pipeline
     ↳ `issue_002`

You: /approvals abc123
Bot: ⏳ Hire Frontend Engineer
     ↳ IDs: `issue_003`

You: /approve issue_003 abc123
Bot: ✅ Approved 1 issue(s).
```
