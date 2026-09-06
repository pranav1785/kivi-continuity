import { resetAndSeed } from "@/lib/store";

export async function POST() {
  try { return Response.json(await resetAndSeed()); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Unable to reset" }, { status: 500 }); }
}
