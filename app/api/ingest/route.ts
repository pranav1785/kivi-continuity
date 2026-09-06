import { ingestTranscript } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const payload = await request.json() as { rawText?: string; formattedText?: string; app?: string; project?: string; occurredAt?: string };
    if (!payload.rawText?.trim() || !payload.app?.trim() || !payload.project?.trim()) return Response.json({ error: "rawText, app, and project are required" }, { status: 400 });
    return Response.json(await ingestTranscript({ rawText: payload.rawText, formattedText: payload.formattedText, app: payload.app, project: payload.project, occurredAt: payload.occurredAt }), { status: 201 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Unable to ingest transcript" }, { status: 500 }); }
}
