import { NextResponse } from "next/server";
import { updateSettings } from "@/lib/store";
export async function POST(request:Request){try{return NextResponse.json(await updateSettings(await request.json()))}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Could not update settings"},{status:400})}}
