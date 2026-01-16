// Rate limiting for API endpoints
export class RateLimiter {
  constructor(maxRequests = 10, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map();
    
    // Clean up old entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  check(identifier) {
    const now = Date.now();
    const userRequests = this.requests.get(identifier) || [];
    
    // Remove old requests outside the window
    const validRequests = userRequests.filter(
      timestamp => now - timestamp < this.windowMs
    );

    if (validRequests.length >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetIn: this.windowMs - (now - validRequests[0]),
        retryAfter: Math.ceil((this.windowMs - (now - validRequests[0])) / 1000)
      };
    }

    validRequests.push(now);
    this.requests.set(identifier, validRequests);

    return {
      allowed: true,
      remaining: this.maxRequests - validRequests.length,
      resetIn: this.windowMs,
      limit: this.maxRequests
    };
  }

  reset(identifier) {
    this.requests.delete(identifier);
  }
  
  cleanup() {
    const now = Date.now();
    for (const [identifier, timestamps] of this.requests.entries()) {
      const validRequests = timestamps.filter(
        timestamp => now - timestamp < this.windowMs
      );
      
      if (validRequests.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, validRequests);
      }
    }
  }
}

// Create rate limiter middleware
export function createRateLimitMiddleware(limiter, identifier = (req) => req.ip) {
  return (req, res, next) => {
    const id = typeof identifier === 'function' ? identifier(req) : identifier;
    const result = limiter.check(id);
    
    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', result.limit || limiter.maxRequests);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', Date.now() + result.resetIn);
    
    if (!result.allowed) {
      res.setHeader('Retry-After', result.retryAfter);
      return res.status(429).json({ 
        error: 'Rate limit exceeded',
        message: `Too many requests. Please try again in ${result.retryAfter} seconds.`,
        retryAfter: result.retryAfter
      });
    }
    
    next();
  };
}
