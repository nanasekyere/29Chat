import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './packages/database/src/messages-db/migrations',
  schema: './packages/database/src/messages-db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.MESSAGES_DB_URL!,
  },
});
