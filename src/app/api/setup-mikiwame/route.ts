import { NextResponse } from "next/server";

export async function GET() {
  const sql = `
CREATE TABLE IF NOT EXISTS mikiwame_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  department TEXT DEFAULT '',
  role TEXT DEFAULT '',
  employment_type TEXT DEFAULT '',
  hire_year INT,
  personality_type TEXT DEFAULT '',
  traits JSONB DEFAULT '{}',
  match_scores JSONB DEFAULT '{}',
  assessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mikiwame_email ON mikiwame_results(email);
CREATE INDEX IF NOT EXISTS idx_mikiwame_department ON mikiwame_results(department);
CREATE INDEX IF NOT EXISTS idx_mikiwame_personality ON mikiwame_results(personality_type);

ALTER TABLE mikiwame_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "mikiwame_all" ON mikiwame_results FOR ALL USING (true) WITH CHECK (true);
  `.trim();

  return NextResponse.json({
    message: "以下のSQLをSupabaseのSQL Editorで実行してください",
    sql,
  });
}
