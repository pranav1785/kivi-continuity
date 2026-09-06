import { NextResponse } from "next/server";
import { ingestTranscript } from "@/lib/store";

type CorpusRecord = { raw_asr?: string; formatted_output?: string; app?: string; project?: string; occurred_at?: string };

export async function POST(request: Request) {
  try {
    const body = await request.json() as { records?: CorpusRecord[] };
    if (!Array.isArray(body.records) || body.records.length === 0 || body.records.length > 500) {
      return NextResponse.json({ error: "Provide between 1 and 500 corpus records." }, { status: 400 });
    }
    const results = [];
    for (const record of body.records) {
      if (!record.raw_asr?.trim() || !record.app?.trim() || !record.project?.trim()) {
        return NextResponse.json({ error: "Every record needs raw_asr, app, and project." }, { status: 400 });
      }
      results.push(await ingestTranscript({ rawText: record.raw_asr, formattedText: record.formatted_output, app: record.app, project: record.project, occurredAt: record.occurred_at }));
    }
    return NextResponse.json({ imported: results.length, decisions: results.flatMap((result) => result.decisions) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Import failed" }, { status: 500 });
  }
}
