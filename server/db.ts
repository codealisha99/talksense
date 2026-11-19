import { neon } from '@neondatabase/serverless'

const url = process.env.DATABASE_URL

export const sql = url ? neon(url) : ((() => {
  const dummy = () => Promise.resolve([])
  return dummy
}) as any)

export async function migrate() {
  if (!url) return
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

  // Speech Intelligence Engine v1 Extensions
  await sql`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS speech_report jsonb`
  await sql`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS recording_id uuid`
  await sql`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS audio_duration double precision`
  await sql`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS word_timestamps jsonb`
  await sql`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS speech_analyzed_at timestamptz`

  // Dedicated recordings management for retention & privacy compliance
  await sql`
    CREATE TABLE IF NOT EXISTS recordings (
      id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id       uuid NOT NULL,
      device_id        uuid NOT NULL,
      storage_key      text NOT NULL,
      format           text NOT NULL,
      size_bytes       bigint NOT NULL,
      duration_seconds double precision NOT NULL DEFAULT 0,
      consent_given    boolean NOT NULL DEFAULT true,
      created_at       timestamptz NOT NULL DEFAULT now(),
      deleted_at       timestamptz
    )`
  await sql`CREATE INDEX IF NOT EXISTS recordings_device_idx ON recordings (device_id, created_at DESC)`
  await sql`CREATE INDEX IF NOT EXISTS recordings_session_idx ON recordings (session_id)`
}
