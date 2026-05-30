/**
 * Google Calendar integration — per-user OAuth tokens
 * Each user connects their own Google Calendar.
 * Tokens stored in data/calendar/{userId}.json
 */
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { DATA_DIR } from './storage';

const CAL_DIR = path.join(DATA_DIR, 'calendar');

export interface CalendarTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  calendarId?: string; // user can pick a specific calendar, defaults to 'primary'
  connectedAt: string;
}

function tokenFile(userId: string) {
  return path.join(CAL_DIR, `${userId}.json`);
}

export async function getCalendarTokens(userId: string): Promise<CalendarTokens | null> {
  try {
    const raw = await readFile(tokenFile(userId), 'utf-8');
    return JSON.parse(raw) as CalendarTokens;
  } catch {
    return null;
  }
}

export async function saveCalendarTokens(userId: string, tokens: CalendarTokens): Promise<void> {
  await mkdir(CAL_DIR, { recursive: true });
  await writeFile(tokenFile(userId), JSON.stringify(tokens, null, 2), 'utf-8');
}

export async function deleteCalendarTokens(userId: string): Promise<void> {
  try {
    const { unlink } = await import('fs/promises');
    await unlink(tokenFile(userId));
  } catch { /* file may not exist */ }
}

// ── OAuth helpers ──────────────────────────────────

function clientId() { return process.env.GOOGLE_CLIENT_ID || ''; }
function clientSecret() { return process.env.GOOGLE_CLIENT_SECRET || ''; }

export function calendarOAuthUrl(appOrigin: string, userId: string): string {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId());
  url.searchParams.set('redirect_uri', `${appOrigin}/api/auth/google/calendar-callback`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar.events');
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('state', userId);
  return url.toString();
}

export async function exchangeCalendarCode(code: string, appOrigin: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId(),
      client_secret: clientSecret(),
      redirect_uri: `${appOrigin}/api/auth/google/calendar-callback`,
      grant_type: 'authorization_code',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google token exchange failed: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: Number(data.expires_in) || 3600,
  };
}

async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId(),
      client_secret: clientSecret(),
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) throw new Error('Failed to refresh Google token');
  const data = await res.json();
  return { accessToken: data.access_token, expiresIn: Number(data.expires_in) || 3600 };
}

async function getValidAccessToken(userId: string): Promise<string> {
  const tokens = await getCalendarTokens(userId);
  if (!tokens) throw new Error('Google Agenda nao conectada. Conecte nas configuracoes.');

  // Token still valid (with 60s buffer)
  if (Date.now() < tokens.expiresAt - 60_000) {
    return tokens.accessToken;
  }

  // Refresh
  const refreshed = await refreshAccessToken(tokens.refreshToken);
  tokens.accessToken = refreshed.accessToken;
  tokens.expiresAt = Date.now() + refreshed.expiresIn * 1000;
  await saveCalendarTokens(userId, tokens);
  return tokens.accessToken;
}

// ── Calendar API ──────────────────────────────────

export interface CalendarEventInput {
  summary: string;
  description?: string;
  date: string; // YYYY-MM-DD
  colorId?: string;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description: string;
  start: string;
  htmlLink: string;
}

export async function createCalendarEvent(userId: string, input: CalendarEventInput): Promise<CalendarEvent> {
  const accessToken = await getValidAccessToken(userId);
  const tokens = await getCalendarTokens(userId);
  const calendarId = tokens?.calendarId || 'primary';

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: input.summary,
        description: input.description || '',
        start: { date: input.date },
        end: { date: input.date },
        colorId: input.colorId || '9', // blueberry
        reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 60 }] },
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Erro ao criar evento: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  return {
    id: data.id,
    summary: data.summary,
    description: data.description || '',
    start: data.start?.date || data.start?.dateTime || '',
    htmlLink: data.htmlLink || '',
  };
}

export async function deleteCalendarEvent(userId: string, eventId: string): Promise<void> {
  const accessToken = await getValidAccessToken(userId);
  const tokens = await getCalendarTokens(userId);
  const calendarId = tokens?.calendarId || 'primary';

  await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
}

export async function listCalendarEvents(userId: string, maxResults = 20): Promise<CalendarEvent[]> {
  const accessToken = await getValidAccessToken(userId);
  const tokens = await getCalendarTokens(userId);
  const calendarId = tokens?.calendarId || 'primary';

  const now = new Date().toISOString();
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?maxResults=${maxResults}&timeMin=${encodeURIComponent(now)}&orderBy=startTime&singleEvents=true&q=NovaCena`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) return [];
  const data = await res.json();
  return (data.items || []).map((e: Record<string, unknown>) => ({
    id: e.id as string,
    summary: (e.summary as string) || '',
    description: (e.description as string) || '',
    start: ((e.start as Record<string, string>)?.date || (e.start as Record<string, string>)?.dateTime) || '',
    htmlLink: (e.htmlLink as string) || '',
  }));
}
