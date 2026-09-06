import { NextResponse } from "next/server";
import { resolveClarification } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { clarificationId?: number; selectedMemoryId?: number };
    if (!Number.isInteger(body.clarificationId) || !Number.isInteger(body.selectedMemoryId)) {
      return NextResponse.json({ error: "Choose one of the memories to keep." }, { status: 400 });
    }
    return NextResponse.json(await resolveClarification(body.clarificationId!, body.selectedMemoryId!));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not resolve clarification" }, { status: 400 });
  }
}
