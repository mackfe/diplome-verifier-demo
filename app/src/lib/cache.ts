
// src/lib/cache.ts
import crypto from 'crypto';

export const codeVer = '2025.10.23';
export const normalizeVer = 'v2-90-70-40-0';

export function sha256OfDataUri(dataUri: string) {
  const b64 = dataUri.split(',')[1] ?? '';
  return crypto.createHash('sha256').update(b64).digest('hex');
}

type Entry = { value: any; expiresAt: number };

export class LRUCache {
  private map = new Map<string, Entry>();
  constructor(private maxEntries = 10_000) {}

  get(key: string) {
    const e = this.map.get(key);
    if (!e) return null;
    if (Date.now() > e.expiresAt) { this.map.delete(key); return null; }
    // touch LRU
    this.map.delete(key);
    this.map.set(key, e);
    return e.value;
  }
  set(key: string, value: any, ttlMs: number) {
    if (this.map.size >= this.maxEntries) {
      // evict LRU (primero en el Map)
      const first = this.map.keys().next().value;
      if (first) this.map.delete(first);
    }
    this.map.set(key, { value, expiresAt: Date.now() + ttlMs });
  }
}

export const cache = new LRUCache(Number(process.env.CACHE_MAX_ENTRIES) || 10_000);

// evita “stampede”: corridas duplicadas para la misma clave
const inflight = new Map<string, Promise<any>>();

export async function withCache(key: string, ttlSec: number, producer: ()=>Promise<any>) {
  const hit = cache.get(key);
  if (hit) return hit;

  if (inflight.has(key)) return inflight.get(key)!;

  const p = (async () => {
    try {
      const val = await producer();
      // No caches si la señal __NO_CACHE__ está presente.
      if (val && val.__NO_CACHE__) {
        return val.res;
      }
      cache.set(key, val, ttlSec * 1000);
      return val;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, p);
  return p;
}
