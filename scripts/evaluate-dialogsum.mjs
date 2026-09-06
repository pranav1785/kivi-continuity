import { writeFile, mkdir } from "node:fs/promises";
import { extractCandidates } from "../lib/memory-engine.ts";

const source="https://raw.githubusercontent.com/cylnlp/dialogsum/main/DialogSum_Data/dialogsum.test.jsonl";
const response=await fetch(source);
if(!response.ok)throw new Error(`DialogSum download failed: ${response.status}`);
const rows=(await response.text()).trim().split("\n").slice(0,100).map(JSON.parse);
const traces=rows.map((row,index)=>{
  // The current DialogSum test split exposes three reference summaries/topics
  // (`summary1`...`summary3`) rather than the singular fields used by older
  // mirrors. Prefer the first reference while keeping backward compatibility.
  const referenceSummary=row.summary??row.summary1??row.dialogue??"";
  const topic=row.topic??row.topic1??"DialogSum";
  const candidates=extractCandidates(referenceSummary,topic);
  return {id:`dialogsum-${index+1}`,topic,reference_summary:referenceSummary,candidate_count:candidates.length,candidates,measurement:"cue coverage only — DialogSum has summary labels, not semantic-memory labels"};
});
const summary={dataset:"DialogSum",source,license:"CC BY-NC-SA 4.0",sample_size:traces.length,records_with_memory_cues:traces.filter(row=>row.candidate_count>0).length,records_without_memory_cues:traces.filter(row=>row.candidate_count===0).length,metric_scope:"External stress test; descriptive coverage, not accuracy",generated_at:new Date().toISOString()};
await mkdir("data",{recursive:true});
await writeFile("data/dialogsum-traces.jsonl",`${traces.map(JSON.stringify).join("\n")}\n`);
await writeFile("data/dialogsum-results.json",`${JSON.stringify(summary,null,2)}\n`);
console.log(JSON.stringify(summary,null,2));
