const Redis = require('redis');
const client = Redis.createClient({
  url: process.env.REDIS_URL
});

client.connect();

class CacheService {
  static async get(key) {
    return await client.get(key);
  }

  static async set(key, value, ttl = 3600) {
    await client.set(key, value, { EX: ttl });
  }
}

module.exports = CacheService;
