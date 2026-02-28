# 🎮 Discord Bot Setup Guide — Step-by-Step

Follow these steps to get your Discord Community Agent online.

---

## Step 1: Create Discord Application

1. Go to **[discord.com/developers/applications](https://discord.com/developers/applications)**
2. Click **"New Application"**
3. Name it: `Community Agent` (or your preferred name)
4. Accept the ToS → Click **Create**

---

## Step 2: Create the Bot

1. In your application, click **"Bot"** in the left sidebar
2. Click **"Add Bot"** → Confirm
3. Under **Token**, click **"Reset Token"** → Copy the token
4. Paste into your `.env` file:
   ```
   DISCORD_TOKEN=paste_your_token_here
   ```

### Bot Settings (on the same page)
| Setting | Value |
|---------|-------|
| **Public Bot** | ✅ ON (so others can add it) |
| **Requires OAuth2 Code Grant** | ❌ OFF |
| **MESSAGE CONTENT INTENT** | ✅ ON (required — bot reads messages) |
| **SERVER MEMBERS INTENT** | ✅ ON (required — welcome new members) |
| **PRESENCE INTENT** | ❌ OFF (not needed) |

> ⚠️ **MESSAGE CONTENT INTENT** — Discord requires verification when your bot joins 100+ servers. You'll need a privacy policy URL and Terms of Service URL at that point.

---

## Step 3: Copy Client ID & Secret

1. Click **"OAuth2"** in the left sidebar
2. Copy **Client ID** → paste into `.env`:
   ```
   DISCORD_CLIENT_ID=paste_here
   ```
3. Click **"Reset Secret"** → Copy **Client Secret** → paste into `.env`:
   ```
   DISCORD_CLIENT_SECRET=paste_here
   ```

---

## Step 4: Generate Bot Invite Link

1. Still in **OAuth2**, click **"URL Generator"**
2. Select these **Scopes**:
   - ✅ `bot`
   - ✅ `applications.commands`
3. Select these **Bot Permissions**:

| Permission | Why |
|-----------|-----|
| ✅ Send Messages | Bot can respond |
| ✅ Send Messages in Threads | Thread support |
| ✅ Embed Links | Rich embeds |
| ✅ Attach Files | Send files |
| ✅ Read Message History | Context for AI |
| ✅ Use External Emojis | Better formatting |
| ✅ Add Reactions | Interactive features |
| ✅ Manage Messages | Moderation (delete toxic) |
| ✅ Manage Webhooks | Multi-agent personas |
| ✅ Kick Members | Moderation (Bear agent) |
| ✅ Ban Members | Moderation (Bear agent) |
| ✅ Moderate Members | Timeout/mute |
| ✅ View Audit Log | Analytics (Owl agent) |

4. Copy the **Generated URL** at the bottom
5. Open it in browser → Select your test server → **Authorize**

---

## Step 5: Configure External Services

### Firebase (Database)
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create a new project (or use existing)
3. Go to **Project Settings** → **Service Accounts**
4. Click **"Generate new private key"** → download JSON
5. Copy values into `.env`:
   ```
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...your key...\n-----END PRIVATE KEY-----\n"
   ```

### Google Gemini API (AI)
1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Click **"Create API key"**
3. Copy and paste into `.env`:
   ```
   GEMINI_API_KEY=paste_here
   ```

### Redis (Caching) — Optional for dev
- For local development: install Redis (`brew install redis` on Mac) and start it (`redis-server`)
- Or use a cloud service like [Upstash](https://upstash.com) (free tier available)
- Default works if Redis is running locally:
  ```
  REDIS_URL=redis://localhost:6379
  ```

---

## Step 6: Install & Run

```bash
# In the project directory
npm install

# Start in development mode (auto-restarts on changes)
npm run dev

# Or start in production mode
npm start
```

**Expected output:**
```
🚀 Starting Community Bot...
🟢 Firebase initialized
🟢 Redis connected
🟢 Logged in as CommunityAgent#1234
📊 Serving 1 servers
🤖 Multi-agent system active: Kelly, Bruce, Gamma
✅ Registered 5 slash commands
```

---

## Step 7: Test It

In your Discord server, try these commands:

| Command | What it does |
|---------|-------------|
| `/help` | Shows the help menu with all commands |
| `/ask What are the rules?` | Tests AI Q&A (should match FAQ) |
| `/stats` | Shows real-time bot statistics |
| `/config view` | Shows current agent toggles |
| `/faq add "test question" "test answer"` | Adds a custom FAQ |
| `/faq list` | Lists all FAQs |

Also try sending regular messages — the bot should respond via the appropriate agent persona (Otter for welcome/general, Bear for moderation topics, Owl for analytics).

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Bot doesn't come online | Check `DISCORD_TOKEN` is correct, check intents are enabled |
| Slash commands don't appear | Wait up to 1 hour (global registration) or restart bot |
| "Missing Permissions" errors | Re-invite bot with correct permissions (Step 4) |
| Firebase errors | Check service account JSON values, ensure Firestore is enabled |
| Redis connection refused | Start Redis locally or set `ENABLE_CACHE=false` in `.env` |
| AI responses fail | Check `GEMINI_API_KEY` is valid and has quota |
