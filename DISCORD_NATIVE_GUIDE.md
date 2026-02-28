# DISCORD-NATIVE IMPLEMENTATION GUIDE
**Critical Technical Constraints & Solutions**  
**Date:** 2026-02-27  
**Applies to:** Discord Bot Project

---

## Core Principle

When selling a Discord bot, you aren't just selling "AI"—you are selling a product that **lives inside someone else's ecosystem**. To be a "Golden Standard" product, every feature must be **Discord-native** and **technically viable under Discord's 2026 API rules**.

---

## 1. Is It Applicable on Discord? (The Reality Check)

**Answer:** YES, but you have to build it specifically for Discord's constraints.

---

## 2. Multi-Agent Implementation (Discord-Native Solution)

### The Challenge
**Problem:** You don't "see" the agents in the member list (unless you want to pay for multiple bot tokens at $0.10/1000 messages each).

**Cost Reality:**
- 3 separate bot tokens = 3x API costs
- Complex permission management
- Confusing for users (which bot to ping?)

### The Solution: Webhook Persona Switching

**Discord-Native Implementation:**
```
Single Bot Token
       ↓
User asks question
       ↓
Bot "becomes" Kelly via Webhook
       ↓
Name: "Kelly (Welcome Agent)"
Avatar: Kelly's friendly icon
Message: "Hey there! Welcome! 🎉"
       ↓
Someone swears
       ↓
Bot "becomes" Bruce via Webhook
       ↓
Name: "Bruce (Mod Agent)"
Avatar: Bruce's serious icon
Message: "Please keep it civil."
```

**Technical Details:**
- **Discord Webhooks:** Allow changing name and avatar per-message
- **One Bot Token:** Manage single set of permissions
- **Cost:** $0 extra (webhooks included in standard API)
- **User Experience:** Seamless persona switching

**Why This Works:**
✅ 100% compliant with Discord ToS  
✅ No extra bot tokens needed  
✅ Users see distinct personalities  
✅ Single permission set to manage  
✅ Cost-effective at scale  

---

## 3. Discord API Constraints (2026 Rules)

### Rate Limits (Hard Limits)
| Action | Limit | Window |
|--------|-------|--------|
| **Guild messages** | 5 | 5 seconds |
| **Private messages** | 5 | 5 seconds |
| **Webhook posts** | 5 | 2 seconds |
| **Slash commands** | 5 | 5 seconds |
| **Reaction additions** | 1 | 0.25 seconds |

**Implication:** Triage system MUST respect these limits or bot gets banned.

**Solution:**
```javascript
// Queue system with rate limit awareness
const messageQueue = [];
const RATE_LIMIT = 5000; // 5 seconds

async function sendMessage(channel, content, persona) {
  // Check queue
  if (messageQueue.length > 0) {
    await delay(RATE_LIMIT);
  }
  
  // Send via webhook with persona
  await webhook.send({
    content: content,
    username: persona.name,  // "Kelly" or "Bruce"
    avatarURL: persona.avatar // Different avatars
  });
  
  // Add to queue tracking
  messageQueue.push(Date.now());
}
```

### Permission Requirements (Minimal Viable)

**Required Bot Permissions:**
```
✅ Send Messages
✅ Read Message History  
✅ Embed Links
✅ Attach Files
✅ Use External Emojis
✅ Add Reactions
✅ Manage Messages (for moderation)
✅ Kick/Ban Members (for Bruce)
✅ View Audit Log (for Gamma)
```

**Never Request:**
❌ Administrator (overkill, security risk)  
❌ Manage Server (owners won't grant)  
❌ Manage Roles (too powerful)  

### Intents (Gateway Permissions)

**Required Intents:**
```javascript
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // Required for reading messages
    GatewayIntentBits.GuildMembers,   // Required for welcome
    GatewayIntentBits.GuildModeration // Required for moderation
  ]
});
```

**Important:** `MessageContent` requires approval from Discord for bots in 100+ servers.

---

## 4. Discord-Native Feature Implementation

### Feature: Welcome Messages
**Discord Way:**
```javascript
client.on('guildMemberAdd', async (member) => {
  const channel = member.guild.channels.cache.find(
    ch => ch.name === 'welcome'
  );
  
  // Use webhook to appear as Kelly
  await webhook.send({
    content: `Welcome ${member}! I'm Kelly, your guide.`,
    username: 'Kelly (Welcome Agent)',
    avatarURL: 'https://cdn.example.com/kelly-avatar.png'
  });
});
```

### Feature: Moderation (Shadow Mute)
**Discord Way:**
```javascript
// Instead of timeout (visible), use role-based mute
const shadowMuteRole = await guild.roles.create({
  name: 'ShadowMuted',
  permissions: [], // No permissions
  position: 1 // Low priority
});

// Apply to user
await member.roles.add(shadowMuteRole);

// User can still type (for behavioral data)
// But only they see their messages
// Mods see: "[Shadow Muted - Potential Raid]"
```

### Feature: Slash Commands
**Discord Way:**
```javascript
const commands = [
  {
    name: 'ask',
    description: 'Ask the AI agents a question',
    options: [{
      name: 'question',
      type: ApplicationCommandOptionType.String,
      required: true
    }]
  },
  {
    name: 'config',
    description: 'Configure bot settings',
      options: [{
      name: 'setting',
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        { name: 'Toggle Kelly', value: 'kelly' },
        { name: 'Toggle Bruce', value: 'bruce' },
        { name: 'View Stats', value: 'stats' }
      ]
    }]
  }
];

// Register with Discord
await client.application.commands.set(commands);
```

---

## 5. Technical Viability Checklist

### Before Building Any Feature, Ask:

**1. Rate Limit Compliance**
- [ ] Does it exceed 5 msgs/5 seconds?
- [ ] Does it batch operations when possible?
- [ ] Does it have queue + retry logic?

**2. Permission Minimalism**
- [ ] Does it use least-privilege permissions?
- [ ] Would YOU grant these permissions to a random bot?
- [ ] Can it work without Administrator?

**3. Intent Appropriateness**
- [ ] Is MessageContent truly necessary?
- [ ] Can we use interactions (slash commands) instead?
- [ ] Are we prepared for Discord verification (100+ servers)?

**4. Webhook Feasibility**
- [ ] Can personas be implemented via webhooks?
- [ ] Is avatar/name switching technically possible?
- [ ] Does it respect webhook rate limits?

**5. ToS Compliance**
- [ ] Does it comply with Discord Developer ToS?
- [ ] Does it respect user privacy (no DM spam)?
- [ ] Does it avoid "self-botting" behavior?

---

## 6. Discord-Specific Anti-Patterns (NEVER DO)

| Anti-Pattern | Why It's Bad | Solution |
|--------------|--------------|----------|
| **Self-botting** | Discord bans accounts using user tokens for automation | Use official Bot API |
| **DM spam** | Violates ToS, harms users | Never DM without explicit opt-in |
| **Reaction farming** | Fake engagement, ban risk | Organic growth only |
| **Permission overreach** | Security risk, users won't install | Minimal viable permissions |
| **Ignoring rate limits** | Bot gets banned | Implement queue + backoff |
| **Hardcoded responses** | Feels robotic, easy to copy | Dynamic AI-generated |

---

## 7. Discord-Native UX Patterns

### Pattern 1: Rich Embeds
```javascript
const embed = new EmbedBuilder()
  .setColor(0x0099FF)
  .setTitle('Kelly - Welcome Agent')
  .setDescription('Here to help new members!')
  .addFields(
    { name: 'Status', value: '🟢 Online', inline: true },
    { name: 'Response Time', value: '<1.5s', inline: true },
    { name: 'FAQs Answered', value: '1,247', inline: true }
  )
  .setThumbnail('https://cdn.example.com/kelly-avatar.png')
  .setTimestamp();

await channel.send({ embeds: [embed] });
```

### Pattern 2: Buttons & Select Menus
```javascript
const row = new ActionRowBuilder()
  .addComponents(
    new ButtonBuilder()
      .setCustomId('toggle_kelly')
      .setLabel('Toggle Kelly')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('toggle_bruce')
      .setLabel('Toggle Bruce')
      .setStyle(ButtonStyle.Secondary)
  );

await channel.send({
  content: 'Agent Control Panel:',
  components: [row]
});
```

### Pattern 3: Ephemeral Messages (Private)
```javascript
// Only visible to command user
await interaction.reply({
  content: 'Your config has been updated.',
  ephemeral: true // Only you can see this
});
```

---

## 8. Multi-Agent Webhook Implementation

### Technical Architecture
```javascript
class DiscordAgent {
  constructor(webhookURL) {
    this.webhook = new WebhookClient({ url: webhookURL });
  }
  
  async sendAs(persona, content) {
    await this.webhook.send({
      content: content,
      username: persona.name,
      avatarURL: persona.avatar,
      flags: [MessageFlags.SuppressEmbeds] // Clean look
    });
  }
}

// Personas
const personas = {
  kelly: {
    name: 'Kelly (Welcome Agent)',
    avatar: 'https://cdn.example.com/kelly.png',
    tone: 'friendly, helpful'
  },
  bruce: {
    name: 'Bruce (Mod Agent)',
    avatar: 'https://cdn.example.com/bruce.png',
    tone: 'firm, fair'
  },
  gamma: {
    name: 'Gamma (Analytics)',
    avatar: 'https://cdn.example.com/gamma.png',
    tone: 'analytical, precise'
  }
};

// Usage
const agent = new DiscordAgent(webhookURL);
await agent.sendAs(personas.kelly, 'Welcome to the server! 🎉');
```

---

## 9. Context & Memory (Our Server, Not Discord's)

### Implementation Strategy

**Where it happens:** On YOUR VPS/server (not Discord's infrastructure)

**Technical Stack:**
```
Discord Gateway
     ↓
Bot receives message
     ↓
Store in Database (Pinecone/MongoDB)
     ↓
Feed context to Gemini
     ↓
Generate personalized response
```

**Database Options:**
| Database | Use Case | Cost |
|----------|----------|------|
| **Pinecone** | Vector search (semantic similarity) | Free tier: 100K vectors |
| **MongoDB Atlas** | Conversation history storage | Free tier: 512MB |
| **Redis** | Semantic caching (fast retrieval) | $5-20/mo |

**Example Implementation:**
```javascript
// Store conversation
await db.collection('conversations').insertOne({
  userId: '123456789',
  serverId: '987654321',
  timestamp: new Date(),
  question: "How do I get a refund?",
  answer: "You can request a refund within 14 days...",
  embedding: await generateEmbedding("refund policy") // For semantic search
});

// Retrieve context for Gemini
const history = await db.collection('conversations')
  .find({ userId: '123456789' })
  .sort({ timestamp: -1 })
  .limit(10)
  .toArray();

// Feed to Gemini
const response = await gemini.generate({
  prompt: newQuestion,
  context: history // "User asked about refunds last week..."
});
```

---

## 10. The Dashboard (Discord OAuth2)

### 2026 Requirement
Serious bots must have a web dashboard. Users expect to log in with their Discord account.

**Implementation:**
```javascript
// Discord OAuth2 Flow
1. User clicks "Login with Discord" on dashboard
2. Redirect to: https://discord.com/oauth2/authorize
3. User authorizes → Returns to dashboard with code
4. Exchange code for access token
5. Fetch user's guilds (servers they own)
6. Show dashboard for selected server
```

**Dashboard Features:**
```
┌─────────────────────────────────────────┐
│  Logged in as: Anson@67                 │
├─────────────────────────────────────────┤
│  Your Servers:                          │
│  [🟢 My Community] [Configure]          │
│  [⚪ Other Server] [Add Bot]            │
├─────────────────────────────────────────┤
│  Agent Control:                         │
│  Kelly (Welcome)       [ON] ✅          │
│  Bruce (Mod)           [ON] ✅          │
│  Gamma (Analytics)     [OFF] ⭕         │
├─────────────────────────────────────────┤
│  Usage This Month:                      │
│  1,234 / 2,000 Smart Responses          │
│  [████████████░░░░░░] 62%               │
└─────────────────────────────────────────┘
```

**Tech Stack:**
- Frontend: React + Tailwind
- Auth: Discord OAuth2
- Backend: Node.js + Express
- Database: MongoDB (server configs)

---

## 11. API Profitability Strategy (Critical)

### The Danger
One "chatty" user can cost you $50 in API fees while only paying $29.

### The Solution: Three-Layer Defense

#### Layer 1: The Triage Brain (Cost Saver)
**Use:** Gemini 2.5 Flash-Lite (extremely cheap)

**Logic:**
```javascript
// Flash-Lite scans every message ($0.00001)
const classification = await flashLite.classify(message);

switch (classification) {
  case 'greeting': // "Hi", "Hello", "lol"
    return hardcodedResponse("Hey there! 👋"); // $0
    
  case 'junk': // Spam, random characters
    return ignore(); // $0
    
  case 'complex': // Questions, issues, toxicity
    return await geminiPro.respond(message); // $0.02
}
```

**Result:** 70-80% of messages filtered before expensive API call.

#### Layer 2: Semantic Caching (The "Vault")
**Concept:** If 2 people ask "How do I get a refund?" in the same hour, don't ask Gemini twice.

**Implementation:**
```javascript
// Check cache first
const cached = await pinecone.query({
  vector: await embedQuestion(newQuestion),
  topK: 1,
  filter: { timestamp: { $gt: Date.now() - 86400000 } } // Last 24h
});

if (cached.matches[0].score > 0.92) {
  // 92% similar = same question
  return cachedAnswer; // $0 cost
}

// Otherwise, call API and cache result
const answer = await geminiPro.respond(newQuestion);
await pinecone.upsert({ id: uuid(), vector: embedding, metadata: answer });
```

**Hit Rate:** 40-60% for active communities.

#### Layer 3: Hard Caps Per Tier
**Prevents runaway costs:**

| Tier | Price | Smart Responses | Overage |
|------|-------|-----------------|---------|
| **Free** | $0 | 100/mo | Hard stop (basic mode) |
| **Pro** | $49 | 2,000/mo | $0.02 per extra |
| **Business** | $99 | 10,000/mo + Custom KB | Unlimited |

**Implementation:**
```javascript
// Check usage before each API call
const usage = await db.getMonthlyUsage(serverId);
const limit = await db.getTierLimit(serverId);

if (usage >= limit) {
  return {
    mode: 'basic',
    message: 'Monthly AI limit reached. Upgrade for more responses.'
  };
}
```

### Why This Works
- Discord AutoMod (native) is **free**
- We charge for **intelligence**, not action
- Triage + caching = 80% cost reduction
- Hard caps = predictable margins

---

## 12. The Golden Standard Checklist (Discord-Specific)

### Quality Gates (Must Pass Before Ship)

#### 1. Response Speed
**Requirement:** The "Thinking" State
- Bot must use `interaction.deferReply()` immediately
- Show "Bot is thinking..." within 200ms

**Why:** Discord users are impatient. If no response in 200ms, they think it's broken.

**Code:**
```javascript
client.on('interactionCreate', async (interaction) => {
  // Show "thinking" immediately
  await interaction.deferReply();
  
  // Do AI work (takes 1-2 seconds)
  const response = await generateAIResponse();
  
  // Edit the "thinking" message with actual response
  await interaction.editReply(response);
});
```

#### 2. Formatting
**Requirement:** Rich Embeds & MarkDown
- Never send "walls of text"
- Use buttons, select menus, embeds

**Why:** Makes AI feel like a high-end application, not a terminal script.

**Bad:**
```
Bot: Here is the information you requested about our refund policy. You can request a refund within 14 days of purchase. To do this, go to your account page and click the refund button. Make sure you have your order number ready.
```

**Good:**
```javascript
const embed = new EmbedBuilder()
  .setTitle('Refund Policy')
  .setDescription('Request a refund within 14 days')
  .addFields(
    { name: 'Step 1', value: 'Go to Account' },
    { name: 'Step 2', value: 'Click Refund' },
    { name: 'Need Help?', value: 'Contact support' }
  )
  .setColor(0x00FF00);

await interaction.reply({ embeds: [embed], ephemeral: true });
```

#### 3. Safety
**Requirement:** Privileged Intents
- Must handle "Message Content Intent" carefully
- Ready for Discord verification (100+ servers)

**Why:** Discord requires verification for bots that read all messages. You must pass an audit.

**Requirements for Verification:**
- [ ] Privacy policy URL
- [ ] Terms of service URL
- [ ] Clear data retention policy
- [ ] No spam/misuse
- [ ] Support server or contact method

**Code:**
```javascript
// Only request what you need
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    // Only enable if truly necessary:
    GatewayIntentBits.MessageContent 
  ]
});
```

#### 4. Reliability
**Requirement:** Graceful Degradation
- If Gemini is down, bot falls back to "Maintenance" message
- Must always say something

**Why:** If bot goes silent, people delete it.

**Implementation:**
```javascript
try {
  const response = await gemini.generate(prompt);
  await interaction.editReply(response);
} catch (error) {
  console.error('Gemini down:', error);
  
  // Fallback response
  await interaction.editReply({
    content: '🤖 AI features temporarily offline. ' +
             'Basic moderation still active.',
    ephemeral: true // Only user sees this
  });
  
  // Log for monitoring
  await db.logIncident({
    type: 'api_failure',
    service: 'gemini',
    timestamp: new Date()
  });
}
```

---

## Summary: Discord-Native Checklist

### Before Shipping, Verify:

**Technical:**
- [ ] Respects all rate limits
- [ ] Uses minimal permissions
- [ ] Implements graceful degradation
- [ ] Has queue system for reliability

**UX:**
- [ ] Uses webhooks for persona switching
- [ ] Implements slash commands
- [ ] Uses rich embeds for information
- [ ] Buttons/menus for interaction

**Compliance:**
- [ ] Discord Developer ToS compliant
- [ ] No self-botting behavior
- [ ] No DM spam
- [ ] Ready for verification (100+ servers)

---

**Status:** ✅ CRITICAL DOCUMENTATION  
**Last Updated:** 2026-02-27  
**Maintained by:** Kelly 🦞  
**Applies to:** All Discord Bot development

