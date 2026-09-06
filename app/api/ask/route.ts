import { answerQuestion } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const { question } = await request.json() as { question?: string };
    if (!question?.trim()) return Response.json({ error: "question is required" }, { status: 400 });
    return Response.json(await answerQuestion(question));
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Unable to answer" }, { status: 500 }); }
}
