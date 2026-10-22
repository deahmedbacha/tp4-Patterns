
export class RetryQuote {
  constructor(inner, { attempts = 3 } = {}) {
    this.inner = inner;
    this.attempts = attempts;
  }

  async getQuote(parcel) {
    let lastError;

    for (let i = 0; i < this.attempts; i++) {
      try {
        return await this.inner.getQuote(parcel);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError;
  }
}

export class CachedQuote {
  constructor(inner, { ttlMs = 60000, now = Date.now } = {}) {
    this.inner = inner;
    this.ttlMs = ttlMs;
    this.now = now;
    this.cache = new Map();
  }

  async getQuote(parcel) {
    const key = `${parcel.weightKg}|${parcel.zip}`;
    const cached = this.cache.get(key);

    if (cached && this.now() < cached.expiresAt) {
      return cached.quote;
    }

    const quote = await this.inner.getQuote(parcel);

    this.cache.set(key, {
      quote,
      expiresAt: this.now() + this.ttlMs
    });

    return quote;
  }
}
