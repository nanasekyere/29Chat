import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './packages/database/src/auth-db/schema.ts',
  out: './packages/database/src/auth-db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.AUTH_DB_URL!,
  },
});
