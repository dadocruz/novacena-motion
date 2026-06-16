import { mkdir, readFile, rename, writeFile } from 'fs/promises';
import { randomBytes } from 'crypto';
import { tmpdir } from 'os';
import path from 'path';

type LambdaRenderSlot = {
  reservationId: string;
  renderId?: string;
  bucketName?: string;
  saasUserId?: string;
  tokenChargedAt?: number;
  status: 'starting' | 'rendering';
  startedAt: number;
  updatedAt: number;
};

const STATE_DIR = path.join(tmpdir(), 'novacena-motion');
const STATE_FILE = path.join(STATE_DIR, 'lambda-render-slots.json');
const SLOT_TTL_MS = Number(process.env.NOVACENA_LAMBDA_SLOT_TTL_MS || 2 * 60 * 1000);

let mutex: Promise<void> = Promise.resolve();

function maxActiveLambdaRenders() {
  const raw = Number(process.env.NOVACENA_MAX_ACTIVE_LAMBDA_RENDERS || 1);
  return Math.max(1, Math.floor(Number.isFinite(raw) ? raw : 1));
}

function retryAfterSeconds(slots: LambdaRenderSlot[]) {
  if (!slots.length) return 10;
  const oldest = slots.reduce((min, slot) => Math.min(min, slot.updatedAt || slot.startedAt), Date.now());
  const ageSec = Math.max(0, Math.round((Date.now() - oldest) / 1000));
  return ageSec > 120 ? 8 : 15;
}

async function withStateLock<T>(fn: () => Promise<T>): Promise<T> {
  const previous = mutex;
  let release = () => {};
  mutex = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    return await fn();
  } finally {
    release();
  }
}

async function readSlotsUnlocked() {
  const raw = await readFile(STATE_FILE, 'utf8').catch(() => '');
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const now = Date.now();
    return parsed.filter((slot: LambdaRenderSlot) => {
      const updatedAt = Number(slot?.updatedAt || slot?.startedAt || 0);
      return slot?.reservationId && now - updatedAt < SLOT_TTL_MS;
    }) as LambdaRenderSlot[];
  } catch {
    return [];
  }
}

async function writeSlotsUnlocked(slots: LambdaRenderSlot[]) {
  await mkdir(STATE_DIR, { recursive: true });
  const tmpFile = `${STATE_FILE}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmpFile, JSON.stringify(slots, null, 2), 'utf8');
  await rename(tmpFile, STATE_FILE);
}

export async function reserveLambdaRenderSlot() {
  return withStateLock(async () => {
    const slots = await readSlotsUnlocked();
    const maxActive = maxActiveLambdaRenders();
    if (slots.length >= maxActive) {
      await writeSlotsUnlocked(slots);
      return {
        ok: false as const,
        activeRenders: slots.length,
        maxActiveRenders: maxActive,
        retryAfterSec: retryAfterSeconds(slots),
      };
    }

    const reservationId = `lambda-slot-${Date.now()}-${randomBytes(4).toString('hex')}`;
    slots.push({
      reservationId,
      status: 'starting',
      startedAt: Date.now(),
      updatedAt: Date.now(),
    });
    await writeSlotsUnlocked(slots);
    return {
      ok: true as const,
      reservationId,
      activeRenders: slots.length,
      maxActiveRenders: maxActive,
    };
  });
}

export async function activateLambdaRenderSlot(
  reservationId: string,
  renderId: string,
  bucketName: string,
  saasUserId?: string | null,
) {
  await withStateLock(async () => {
    const slots = await readSlotsUnlocked();
    const index = slots.findIndex((slot) => slot.reservationId === reservationId);
    const nextSlot: LambdaRenderSlot = {
      reservationId,
      renderId,
      bucketName,
      saasUserId: saasUserId ?? slots[index]?.saasUserId,
      tokenChargedAt: slots[index]?.tokenChargedAt,
      status: 'rendering',
      startedAt: index >= 0 ? slots[index].startedAt : Date.now(),
      updatedAt: Date.now(),
    };

    if (index >= 0) {
      slots[index] = nextSlot;
    } else {
      slots.push(nextSlot);
    }

    await writeSlotsUnlocked(slots);
  });
}

export async function claimLambdaRenderTokenCharge(renderId: string, bucketName: string) {
  return withStateLock(async () => {
    const slots = await readSlotsUnlocked();
    const index = slots.findIndex((slot) => slot.renderId === renderId && slot.bucketName === bucketName);
    if (index < 0) return null;

    const slot = slots[index];
    if (!slot.saasUserId || slot.tokenChargedAt) return null;

    slots[index] = { ...slot, tokenChargedAt: Date.now(), updatedAt: Date.now() };
    await writeSlotsUnlocked(slots);

    return {
      reservationId: slot.reservationId,
      renderId: slot.renderId,
      bucketName: slot.bucketName,
      saasUserId: slot.saasUserId,
    };
  });
}

export async function heartbeatLambdaRenderSlot(renderId: string, bucketName: string) {
  await withStateLock(async () => {
    const slots = await readSlotsUnlocked();
    const index = slots.findIndex((slot) => slot.renderId === renderId && slot.bucketName === bucketName);
    if (index >= 0) {
      slots[index] = { ...slots[index], updatedAt: Date.now() };
      await writeSlotsUnlocked(slots);
    }
  });
}

export async function releaseLambdaRenderSlot(match: { reservationId?: string; renderId?: string; bucketName?: string }) {
  await withStateLock(async () => {
    const slots = await readSlotsUnlocked();
    const nextSlots = slots.filter((slot) => {
      if (match.reservationId && slot.reservationId === match.reservationId) return false;
      if (match.renderId && slot.renderId === match.renderId) {
        if (!match.bucketName || slot.bucketName === match.bucketName) return false;
      }
      return true;
    });

    if (nextSlots.length !== slots.length) {
      await writeSlotsUnlocked(nextSlots);
    }
  });
}
