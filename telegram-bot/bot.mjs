#!/usr/bin/env node
/**
 * Paperclip Telegram Bot
 * 
 * Controls your Paperclip instance from Telegram.
 * 
 * Setup:
 *   1. Create a bot via @BotFather on Telegram, get your TELEGRAM_BOT_TOKEN
 *   2. Get your TELEGRAM_CHAT_ID (message @userinfobot)
 *   3. Set PAPERCLIP_API_URL (default: http://localhost:3100)
 *   4. npm install node-telegram-bot-api node-fetch
 *   5. TELEGRAM_BOT_TOKEN=xxx TELEGRAM_CHAT_ID=yyy node bot.mjs
 */

import TelegramBot from 'node-telegram-bot-api';
import fetch from 'node-fetch';

// --- Config ---
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ALLOWED_CHAT_ID    = process.env.TELEGRAM_CHAT_ID ? String(process.env.TELEGRAM_CHAT_ID) : null;
const PAPERCLIP_URL      = process.env.PAPERCLIP_API_URL || 'http://localhost:3100';
const PAPERCLIP_SESSION  = process.env.PAPERCLIP_SESSION_TOKEN || '';

if (!TELEGRAM_BOT_TOKEN) {
  console.error('❌  TELEGRAM_BOT_TOKEN is required');
  process.exit(1);
}

// --- Bot ---
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });
console.log('🤖  Paperclip Telegram bot started');

// --- Auth guard ---
function isAllowed(chatId) {
  if (!ALLOWED_CHAT_ID) return true; // open if no filter set
  return String(chatId) === ALLOWED_CHAT_ID;
}

// --- Paperclip API helper ---
async function api(path, options = {}) {
  const res = await fetch(`${PAPERCLIP_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(PAPERCLIP_SESSION ? { Authorization: `bearer ${PAPERCLIP_SESSION}` } : {}),
      ...options.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

// --- Helpers ---
function escMd(s) {
  return String(s ?? '').replace(/[_*[\]()~`>#+=|{}.!\\-]/g, '\\$&');
}

function statusEmoji(status) {
  const map = { open: '🔵', in_progress: '🟡', done: '✅', closed: '⚫', blocked: '🔴', pending: '⏳' };
  return map[status?.toLowerCase()] ?? '⬜';
}

// --- Command handlers ---

async function handleHelp(chatId) {
  const msg = [
    '🤖 *Paperclip Bot Commands*',
    '',
    '📋 *Viewing*',
    '/companies — list all companies',
    '/agents \\[companyId\\] — list agents',
    '/tasks \\[companyId\\] — list open tickets',
    '/goals \\[companyId\\] — list goals',
    '/approvals \\[companyId\\] — pending approvals',
    '/costs \\[companyId\\] — spending summary',
    '',
    '✅ *Actions*',
    '/approve <issueId1,issueId2> <companyId> — approve issues',
    '/addtask <companyId> <title> — create a ticket',
    '',
    '🔑 *Setup*',
    '/status — check connection to Paperclip',
  ].join('\n');
  await bot.sendMessage(chatId, msg, { parse_mode: 'MarkdownV2' });
}

async function handleStatus(chatId) {
  try {
    const data = await api('/health');
    await bot.sendMessage(chatId, `✅ Paperclip is *online*\n\`${PAPERCLIP_URL}\``, { parse_mode: 'MarkdownV2' });
  } catch (e) {
    await bot.sendMessage(chatId, `❌ Cannot reach Paperclip at \`${escMd(PAPERCLIP_URL)}\`\n${escMd(e.message)}`, { parse_mode: 'MarkdownV2' });
  }
}

async function handleCompanies(chatId) {
  try {
    const companies = await api('/companies');
    if (!companies.length) return bot.sendMessage(chatId, '📭 No companies found.');
    const lines = companies.map(c =>
      `🏢 *${escMd(c.name)}* — \`${escMd(c.id)}\``
    );
    await bot.sendMessage(chatId, lines.join('\n'), { parse_mode: 'MarkdownV2' });
  } catch (e) {
    await bot.sendMessage(chatId, `❌ ${escMd(e.message)}`, { parse_mode: 'MarkdownV2' });
  }
}

async function handleAgents(chatId, companyId) {
  try {
    const url = companyId ? `/companies/${companyId}/agents` : '/agents';
    const agents = await api(url);
    if (!agents.length) return bot.sendMessage(chatId, '📭 No agents found.');
    const lines = agents.map(a =>
      `🤖 *${escMd(a.name)}* \\(${escMd(a.role ?? 'Agent')}\\) — \`${escMd(a.id)}\``
    );
    await bot.sendMessage(chatId, lines.join('\n'), { parse_mode: 'MarkdownV2' });
  } catch (e) {
    await bot.sendMessage(chatId, `❌ ${escMd(e.message)}`, { parse_mode: 'MarkdownV2' });
  }
}

async function handleTasks(chatId, companyId) {
  try {
    if (!companyId) return bot.sendMessage(chatId, 'Usage: /tasks <companyId>');
    const issues = await api(`/companies/${companyId}/issues?status=open&limit=15`);
    const list = Array.isArray(issues) ? issues : issues.issues ?? [];
    if (!list.length) return bot.sendMessage(chatId, '📭 No open tickets.');
    const lines = list.map(i =>
      `${statusEmoji(i.status)} *${escMd(i.title)}*\n  ↳ \`${escMd(i.id)}\``
    );
    await bot.sendMessage(chatId, lines.join('\n\n'), { parse_mode: 'MarkdownV2' });
  } catch (e) {
    await bot.sendMessage(chatId, `❌ ${escMd(e.message)}`, { parse_mode: 'MarkdownV2' });
  }
}

async function handleGoals(chatId, companyId) {
  try {
    if (!companyId) return bot.sendMessage(chatId, 'Usage: /goals <companyId>');
    const goals = await api(`/companies/${companyId}/goals`);
    if (!goals.length) return bot.sendMessage(chatId, '📭 No goals found.');
    const lines = goals.map(g =>
      `🎯 *${escMd(g.title)}*\n  ↳ \`${escMd(g.id)}\``
    );
    await bot.sendMessage(chatId, lines.join('\n\n'), { parse_mode: 'MarkdownV2' });
  } catch (e) {
    await bot.sendMessage(chatId, `❌ ${escMd(e.message)}`, { parse_mode: 'MarkdownV2' });
  }
}

async function handleApprovals(chatId, companyId) {
  try {
    if (!companyId) return bot.sendMessage(chatId, 'Usage: /approvals <companyId>');
    const data = await api(`/companies/${companyId}/approvals`);
    const list = Array.isArray(data) ? data : data.approvals ?? [];
    if (!list.length) return bot.sendMessage(chatId, '✅ No pending approvals.');
    const lines = list.map(a =>
      `⏳ *${escMd(a.title ?? a.type ?? 'Approval')}*\n  ↳ IDs: \`${escMd((a.issueIds ?? [a.id]).join(', '))}\``
    );
    const msg = lines.join('\n\n') + '\n\n_Use /approve <ids> ' + escMd(companyId) + ' to approve_';
    await bot.sendMessage(chatId, msg, { parse_mode: 'MarkdownV2' });
  } catch (e) {
    await bot.sendMessage(chatId, `❌ ${escMd(e.message)}`, { parse_mode: 'MarkdownV2' });
  }
}

async function handleApprove(chatId, args) {
  // /approve issueId1,issueId2 companyId
  const [idsStr, companyId] = args;
  if (!idsStr || !companyId) return bot.sendMessage(chatId, 'Usage: /approve <issueId1,issueId2> <companyId>');
  const issueIds = idsStr.split(',').map(s => s.trim()).filter(Boolean);
  try {
    await api(`/companies/${companyId}/approvals`, {
      method: 'POST',
      body: JSON.stringify({ issueIds }),
    });
    await bot.sendMessage(chatId, `✅ Approved ${issueIds.length} issue(s).`);
  } catch (e) {
    await bot.sendMessage(chatId, `❌ ${escMd(e.message)}`, { parse_mode: 'MarkdownV2' });
  }
}

async function handleAddTask(chatId, args) {
  // /addtask companyId title words...
  const [companyId, ...titleWords] = args;
  const title = titleWords.join(' ');
  if (!companyId || !title) return bot.sendMessage(chatId, 'Usage: /addtask <companyId> <title>');
  try {
    // Issues are under /companies/:companyId/issues
    const issue = await api(`/companies/${companyId}/issues`, {
      method: 'POST',
      body: JSON.stringify({ title, status: 'open' }),
    });
    await bot.sendMessage(chatId, `✅ Task created: *${escMd(issue.title)}*\nID: \`${escMd(issue.id)}\``, { parse_mode: 'MarkdownV2' });
  } catch (e) {
    await bot.sendMessage(chatId, `❌ ${escMd(e.message)}`, { parse_mode: 'MarkdownV2' });
  }
}

async function handleCosts(chatId, companyId) {
  try {
    if (!companyId) return bot.sendMessage(chatId, 'Usage: /costs <companyId>');
    const data = await api(`/companies/${companyId}/costs`);
    const agents = Array.isArray(data) ? data : data.agents ?? [];
    if (!agents.length) return bot.sendMessage(chatId, '📭 No cost data yet.');
    const lines = agents.map(a =>
      `🤖 *${escMd(a.name ?? a.agentId)}*: \\$${escMd(String((a.totalCost ?? 0).toFixed(4)))}`
    );
    await bot.sendMessage(chatId, lines.join('\n'), { parse_mode: 'MarkdownV2' });
  } catch (e) {
    await bot.sendMessage(chatId, `❌ ${escMd(e.message)}`, { parse_mode: 'MarkdownV2' });
  }
}

// --- Message router ---
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text   = (msg.text ?? '').trim();

  if (!isAllowed(chatId)) {
    return bot.sendMessage(chatId, '⛔ Unauthorised.');
  }

  if (!text.startsWith('/')) return;

  const [rawCmd, ...args] = text.split(/\s+/);
  const cmd = rawCmd.toLowerCase().replace(/@\S+$/, ''); // strip bot username suffix

  try {
    switch (cmd) {
      case '/start':
      case '/help':      return handleHelp(chatId);
      case '/status':    return handleStatus(chatId);
      case '/companies': return handleCompanies(chatId);
      case '/agents':    return handleAgents(chatId, args[0]);
      case '/tasks':     return handleTasks(chatId, args[0]);
      case '/goals':     return handleGoals(chatId, args[0]);
      case '/approvals': return handleApprovals(chatId, args[0]);
      case '/approve':   return handleApprove(chatId, args);
      case '/addtask':   return handleAddTask(chatId, args);
      case '/costs':     return handleCosts(chatId, args[0]);
      default:
        await bot.sendMessage(chatId, `Unknown command: ${cmd}\nTry /help`);
    }
  } catch (err) {
    console.error('Handler error:', err);
    await bot.sendMessage(chatId, `💥 Internal error: ${escMd(err.message)}`, { parse_mode: 'MarkdownV2' });
  }
});

bot.on('polling_error', (err) => console.error('Polling error:', err.message));

