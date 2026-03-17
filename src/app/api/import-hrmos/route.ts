import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

interface HrmosJob {
  hrmos_id: string;
  title: string;
  department: string;
  employment_type: string;
  salary_range: string;
  location: string;
  description: string;
  requirements: string;
}

function parseSalaryRange(salaryType: string, lower: string, upper: string, memo: string): string {
  const lo = lower ? parseInt(lower, 10) : 0;
  const hi = upper ? parseInt(upper, 10) : 0;
  if (lo && hi) {
    const loMan = Math.round(lo / 10000);
    const hiMan = Math.round(hi / 10000);
    return `${loMan}〜${hiMan}万円`;
  }
  if (memo && memo !== "応相談") return memo;
  if (salaryType === "応相談") return "応相談";
  return "応相談";
}

function parseLocation(addr1: string, memo: string): string {
  if (addr1) return addr1;
  if (memo) return memo;
  return "東京都港区（品川本社）";
}

// Parse the HRMOS tab-separated CSV
function parseHrmosCsv(text: string): HrmosJob[] {
  const lines = text.split("\n");
  if (lines.length < 2) return [];

  const jobs: HrmosJob[] = [];
  let i = 1; // skip header

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i++; continue; }

    // HRMOS uses tab-separated values with potential multiline fields in quotes
    // We need to handle quoted fields that span multiple lines
    let fullLine = lines[i];

    // Count quotes to detect multi-line fields
    let quoteCount = (fullLine.match(/"/g) || []).length;
    while (quoteCount % 2 !== 0 && i + 1 < lines.length) {
      i++;
      fullLine += "\n" + lines[i];
      quoteCount = (fullLine.match(/"/g) || []).length;
    }

    const fields = parseTabFields(fullLine);

    if (fields.length >= 10) {
      const hrmosId = fields[0].replace(/^="/, "").replace(/"$/, "").replace(/^=/, "");
      const position = fields[2] || "";
      const jobTitle = fields[4] || fields[3] || position;
      const description = fields[5] || "";
      const employmentType = fields[6] || "正社員";
      const salaryType = fields[8] || "";
      const salaryLower = fields[9] || "";
      const salaryUpper = fields[10] || "";
      const salaryMemo = fields[11] || "";
      const addr1 = fields[13] || "";
      const locationMemo = fields[14] || "";

      // Skip entries with no title at all
      if (!jobTitle && !position) { i++; continue; }

      jobs.push({
        hrmos_id: hrmosId,
        title: jobTitle || position,
        department: position,
        employment_type: employmentType,
        salary_range: parseSalaryRange(salaryType, salaryLower, salaryUpper, salaryMemo),
        location: parseLocation(addr1, locationMemo),
        description: description,
        requirements: "",
      });
    }

    i++;
  }

  return jobs;
}

// Parse tab-separated fields respecting quoted strings
function parseTabFields(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuote = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (ch === "\t" && !inQuote) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const csvText: string = body.csv;

    if (!csvText) {
      return NextResponse.json({ error: "csv field is required" }, { status: 400 });
    }

    const hrmosJobs = parseHrmosCsv(csvText);

    if (hrmosJobs.length === 0) {
      return NextResponse.json({ error: "No jobs parsed from CSV" }, { status: 400 });
    }

    // Insert into Supabase
    const rows = hrmosJobs.map((j) => ({
      title: j.title,
      department: j.department,
      employment_type: j.employment_type,
      salary_range: j.salary_range,
      location: j.location,
      status: "open",
      description: j.description,
      requirements: j.requirements,
    }));

    const { data, error } = await supabase.from("jobs").insert(rows).select();
    if (error) throw error;

    return NextResponse.json({
      success: true,
      count: data.length,
      jobs: data.map((j: { id: string; title: string; department: string }) => ({
        id: j.id,
        title: j.title,
        department: j.department,
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
