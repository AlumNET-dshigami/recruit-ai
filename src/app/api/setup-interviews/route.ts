import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST() {
  // interview_records テーブルが無ければ作成（RPC経由）
  // Supabase JS SDK では DDL を直接実行できないため、
  // テーブルが存在するかチェックし、なければユーザーにSQLを案内
  const { error } = await supabase.from("interview_records").select("id").limit(1);

  if (error && error.code === "42P01") {
    // テーブルが存在しない
    return NextResponse.json({
      success: false,
      message: "interview_records テーブルが存在しません。SupabaseのSQL Editorで以下を実行してください。",
      sql: `CREATE TABLE interview_records (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_id uuid REFERENCES pipeline(id) ON DELETE CASCADE,
  interview_type text NOT NULL DEFAULT 'interview1',
  interviewer_name text DEFAULT '',
  interview_date timestamptz DEFAULT now(),
  transcript text DEFAULT '',
  notes text DEFAULT '',
  rating int,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE interview_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON interview_records FOR ALL USING (true) WITH CHECK (true);`,
    });
  }

  return NextResponse.json({ success: true, message: "interview_records テーブルは既に存在します" });
}
