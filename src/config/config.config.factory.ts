export const ConfigConfigFactory = () => ({
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
  },
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL) || 60,
    limit: parseInt(process.env.THROTTLE_LIMIT) || 10,
  },
});
