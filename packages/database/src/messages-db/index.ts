import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

const db = drizzle(process.env.MESSAGES_DB_URL!, { schema });

export default db;
