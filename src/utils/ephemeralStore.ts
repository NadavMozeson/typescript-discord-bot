import crypto from "crypto";

type PAYLOAD_TYPES = InvestmentPayload | ListPickerPayload;

export type InvestmentPayload = {
  type: "investment";
  url: string; // keep your exact path, or just the id if you prefer
  risk: string; // keep full text (unchanged)
  priceDiff: string; // keep as number/string as you like
  card: string; // keep exact text (unchanged)
};

export type ListPickerPayload = {
  type: "listPicker";
  id: string;
  interaction: string;
  card: string;
};

type Entry = { payload: PAYLOAD_TYPES; expiresAt: number };

class EphemeralStore {
  private store = new Map<string, Entry>();
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(private defaultTtlMs = 10 * 60 * 1000) {
    // 10 min TTL
    this.startCleanup();
  }

  // Very short Base62 token (8–10 chars). Collision-checked.
  private generateToken(length = 9): string {
    const alphabet =
      "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    while (true) {
      const bytes = crypto.randomBytes(length);
      let token = "";
      for (let i = 0; i < length; i++)
        token += alphabet[bytes[i] % alphabet.length];
      if (!this.store.has(token)) return token;
    }
  }

  set(payload: PAYLOAD_TYPES, ttlMs = this.defaultTtlMs): string {
    const token = this.generateToken();
    const expiresAt = Date.now() + ttlMs;
    this.store.set(token, { payload, expiresAt });
    return token;
  }

  getAndDelete(token: string): PAYLOAD_TYPES | null {
    const entry = this.store.get(token);
    if (!entry) return null;
    this.store.delete(token); // single-use
    if (entry.expiresAt < Date.now()) return null;
    return entry.payload;
  }

  // Optional: if you want to explicitly delete after use elsewhere
  delete(token: string) {
    this.store.delete(token);
  }

  private startCleanup() {
    if (this.cleanupTimer) return;
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [k, v] of this.store)
        if (v.expiresAt < now) this.store.delete(k);
    }, 60 * 1000);
    this.cleanupTimer.unref?.();
  }
}

export const ephemeralStore = new EphemeralStore();
