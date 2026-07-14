import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Types ──

export interface SyncEvent {
  id: string;
  type: 'game_result' | 'leaderboard_score';
  data: Record<string, unknown>;
  retryCount: number;
  nextRetryAt: string | null; // ISO timestamp, null = can retry now
  createdAt: string; // ISO timestamp
}

// ── Constants ──

const QUEUE_KEY = 'sync_queue';
/** Transient Firestore outages can last longer than 3 short retries. */
const MAX_RETRIES = 6;

// ── Hash helpers ──

/**
 * Deterministic djb2 hash for idempotent event IDs.
 * Not cryptographic — sufficient for single-device queue dedup (D-136 deviation).
 */
function djb2Hash(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) | 0; // hash * 33 + char
  }
  // Convert to unsigned hex string
  return (hash >>> 0).toString(16);
}

function generateEventId(type: string, data: Record<string, unknown>): string {
  // Use session ID if available, otherwise fall back to JSON data hash
  const sessionId = (data.sessionId as string) ?? JSON.stringify(data);
  return djb2Hash(`${sessionId}:${type}`);
}

// ── Queue helpers ──

/**
 * Read the full queue from AsyncStorage.
 * Returns an empty array on any error (missing key, parse failure).
 */
async function readQueue(): Promise<SyncEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as SyncEvent[];
  } catch {
    return [];
  }
}

/**
 * Write the queue to AsyncStorage.
 * Silently fails if storage is unavailable.
 */
async function writeQueue(queue: SyncEvent[]): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // AsyncStorage failures are silent — queue loss is accepted for extreme edge cases
  }
}

// ── Exported functions ──

/**
 * Enqueue a sync event to the offline queue.
 * If an event with the same ID already exists, skip (idempotent) — D-136.
 * Returns true if enqueued, false if duplicate skipped.
 */
export async function enqueueEvent(
  type: SyncEvent['type'],
  data: Record<string, unknown>,
  id?: string,
): Promise<boolean> {
  try {
    const eventId = id ?? generateEventId(type, data);
    const queue = await readQueue();

    // Idempotent dedup — skip if event with same ID already exists
    if (queue.some((event) => event.id === eventId)) {
      return false;
    }

    const now = new Date().toISOString();
    const event: SyncEvent = {
      id: eventId,
      type,
      data,
      retryCount: 0,
      nextRetryAt: null,
      createdAt: now,
    };

    queue.push(event);
    await writeQueue(queue);
    return true;
  } catch {
    return false;
  }
}

/**
 * Drain the queue: iterate through all pending events, call handler for each.
 *
 * - On handler success: remove event from queue.
 * - On handler failure: increment retryCount, set nextRetryAt.
 * - Discard events with retryCount >= MAX_RETRIES (exhausted) — D-148.
 * - If an event's nextRetryAt is in the future, skip it this pass.
 *
 * Returns number of events processed (success + discarded).
 */
export async function drainQueue(
  handler: (event: SyncEvent) => Promise<boolean>,
): Promise<number> {
  try {
    const queue = await readQueue();
    if (queue.length === 0) return 0;

    const remaining: SyncEvent[] = [];
    let processed = 0;
    const now = Date.now();

    for (const event of queue) {
      // Skip events not yet ready for retry
      if (event.nextRetryAt) {
        const retryTime = new Date(event.nextRetryAt).getTime();
        if (retryTime > now) {
          remaining.push(event);
          continue;
        }
      }

      // Discard events that have exceeded max retries
      if (event.retryCount >= MAX_RETRIES) {
        processed++;
        continue;
      }

      try {
        const success = await handler(event);
        if (success) {
          processed++;
        } else {
          // Increment retry and schedule next attempt with exponential backoff
          const nextRetryCount = event.retryCount + 1;
          // Exponential backoff with a floor that tolerates brief Firestore outages
          // (unavailable): ~3s, 6s, 12s, 24s, 48s …
          const delayMs = Math.pow(2, nextRetryCount) * 1500;

          if (nextRetryCount >= MAX_RETRIES) {
            // Max retries reached — discard
            processed++;
          } else {
            remaining.push({
              ...event,
              retryCount: nextRetryCount,
              nextRetryAt: new Date(now + delayMs).toISOString(),
            });
          }
          processed++;
        }
      } catch {
        // Handler threw — treat as failure, increment retry
        const nextRetryCount = event.retryCount + 1;
        const delayMs = Math.pow(2, nextRetryCount) * 1500;

        if (nextRetryCount >= MAX_RETRIES) {
          processed++;
        } else {
          remaining.push({
            ...event,
            retryCount: nextRetryCount,
            nextRetryAt: new Date(now + delayMs).toISOString(),
          });
        }
        processed++;
      }
    }

    await writeQueue(remaining);
    return processed;
  } catch {
    return 0;
  }
}

/**
 * Get the number of pending events in the queue.
 */
export async function getQueueLength(): Promise<number> {
  const queue = await readQueue();
  return queue.length;
}

/**
 * Clear all events from the queue (for testing/admin).
 */
export async function clearQueue(): Promise<void> {
  await writeQueue([]);
}

/**
 * Remove all queued events of a given type — used to supersede stale
 * `game_result` entries once a freshly-merged profile has been pushed
 * (D-4/playerProfileSync), so a queued pre-merge snapshot can't later
 * clobber the merged cloud doc.
 * Returns the number of events removed.
 */
export async function removeEventsByType(
  type: SyncEvent['type'],
): Promise<number> {
  const queue = await readQueue();
  const next = queue.filter((e) => e.type !== type);
  const removed = queue.length - next.length;
  if (removed > 0) await writeQueue(next);
  return removed;
}
