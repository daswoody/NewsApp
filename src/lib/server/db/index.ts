import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';
import * as schema from './schema';

const connectionString =
	env.DATABASE_URL ?? 'postgres://newsapp:newsapp@localhost:5432/newsapp';

// Kept small on purpose: the app targets low-resource servers.
const client = postgres(connectionString, { max: 5 });

export const db = drizzle(client, { schema });
