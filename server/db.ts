import { neon } from '@neondatabase/serverless'

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL is not set')

export const sql = neon(url)

export async function migrate() {
  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      device_id       uuid NOT NULL,
      topic           text NOT NULL,
      minutes         int  NOT NULL CHECK (minutes IN (15, 20, 30)),
      brief           jsonb NOT NULL,
      created_at      timestamptz NOT NULL DEFAULT now(),
      started_at      timestamptz,
      transcript      text,
      grade           jsonb,
      score           int CHECK (score BETWEEN 0 AND 100),
      level           text,
      studied_minutes int,
      graded_at       timestamptz
    )`
  await sql`CREATE INDEX IF NOT EXISTS sessions_device_graded_idx ON sessions (device_id, graded_at DESC)`
}
