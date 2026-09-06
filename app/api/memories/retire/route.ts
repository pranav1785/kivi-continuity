import { NextResponse } from "next/server";
import { retireMemory } from "@/lib/store";
export async function POST(request:Request){try{const {memoryId}=await request.json() as {memoryId?:number};if(!Number.isInteger(memoryId))return NextResponse.json({error:"Choose a memory to retire."},{status:400});return NextResponse.json(await retireMemory(memoryId!))}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Could not retire memory"},{status:400})}}
