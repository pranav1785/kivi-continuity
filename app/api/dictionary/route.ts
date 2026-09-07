import { NextResponse } from "next/server";
import { addDictionaryEntry, removeDictionaryEntry } from "@/lib/store";

export async function POST(request: Request) {
  try { return NextResponse.json(await addDictionaryEntry(await request.json())); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save dictionary entry" }, { status: 400 }); }
}

export async function DELETE(request: Request) {
  try { const body = await request.json() as { id?: number }; return NextResponse.json(await removeDictionaryEntry(Number(body.id))); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not remove dictionary entry" }, { status: 400 }); }
}
