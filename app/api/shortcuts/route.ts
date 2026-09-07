import { NextResponse } from "next/server";
import { addShortcut, removeShortcut } from "@/lib/store";

export async function POST(request: Request) {
  try { return NextResponse.json(await addShortcut(await request.json())); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save shortcut" }, { status: 400 }); }
}

export async function DELETE(request: Request) {
  try { const body = await request.json() as { id?: number }; return NextResponse.json(await removeShortcut(Number(body.id))); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not remove shortcut" }, { status: 400 }); }
}
