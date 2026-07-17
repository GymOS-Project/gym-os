import type { NextFunction, Request, Response } from "express";

type RateLimitOptions = {
  windowMs: number;
  maxRequests: number;
  message: string;
  statusCode?: number;
  skip?: (req: Request) => boolean;
};

type RateLimitEntry = {
  count: number;
  resetTime: number;
};

const PRUNE_INTERVAL = 200;

export function createRateLimit(options: RateLimitOptions) {
  const entries = new Map<string, RateLimitEntry>();
  const statusCode = options.statusCode ?? 429;
  let requestsSincePrune = 0;

  function pruneExpiredEntries(now: number) {
    if (++requestsSincePrune < PRUNE_INTERVAL) {
      return;
    }

    requestsSincePrune = 0;

    for (const [key, entry] of entries.entries()) {
      if (entry.resetTime <= now) {
        entries.delete(key);
      }
    }
  }

  return (req: Request, res: Response, next: NextFunction) => {
    if (options.skip?.(req)) {
      return next();
    }

    const now = Date.now();
    pruneExpiredEntries(now);

    const key = req.ip || req.socket.remoteAddress || "unknown";
    const currentEntry = entries.get(key);

    if (!currentEntry || currentEntry.resetTime <= now) {
      entries.set(key, {
        count: 1,
        resetTime: now + options.windowMs,
      });

      res.setHeader("X-RateLimit-Limit", String(options.maxRequests));
      res.setHeader("X-RateLimit-Remaining", String(Math.max(options.maxRequests - 1, 0)));
      res.setHeader("X-RateLimit-Reset", String(Math.ceil((now + options.windowMs) / 1000)));

      return next();
    }

    currentEntry.count += 1;

    const remaining = Math.max(options.maxRequests - currentEntry.count, 0);
    res.setHeader("X-RateLimit-Limit", String(options.maxRequests));
    res.setHeader("X-RateLimit-Remaining", String(remaining));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(currentEntry.resetTime / 1000)));

    if (currentEntry.count > options.maxRequests) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((currentEntry.resetTime - now) / 1000)
      );

      res.setHeader("Retry-After", String(retryAfterSeconds));
      return res.status(statusCode).json({ message: options.message });
    }

    return next();
  };
}
