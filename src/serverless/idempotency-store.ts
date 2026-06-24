export class IdempotencyStore {
  private readonly items = new Map<string, number>();

  constructor(private readonly ttlSeconds: number) {}

  checkAndStore(fingerprint: string, now: number): "fresh" | "duplicate" {
    this.prune(now);
    if (this.items.has(fingerprint)) return "duplicate";
    this.items.set(fingerprint, now + this.ttlSeconds);
    return "fresh";
  }

  clear(): void {
    this.items.clear();
  }

  private prune(now: number): void {
    for (const [fingerprint, expiresAt] of this.items.entries()) {
      if (expiresAt <= now) this.items.delete(fingerprint);
    }
  }
}
