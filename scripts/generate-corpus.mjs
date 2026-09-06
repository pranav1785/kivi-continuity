import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const projects = ["Atlas", "Beacon", "Cedar", "Drift", "Ember", "Fjord", "Grove", "Harbor", "Iris", "Juniper"];
const apps = ["Slack", "Gmail", "Docs", "Meeting", "Calendar"];
const owners = ["Rohan", "Maya", "Nina", "Omar", "Priya", "Sam", "Tara", "Vikram"];
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const records = [];

function add(index, rawAsr, formattedOutput, expected) {
  const project = projects[index % projects.length];
  records.push({
    id: `kivi-${String(index + 1).padStart(3, "0")}`,
    raw_asr: rawAsr,
    formatted_output: formattedOutput,
    app: apps[index % apps.length],
    project,
    occurred_at: new Date(Date.UTC(2026, 7, 1 + Math.floor(index / 20), 8 + (index % 10), (index * 7) % 60)).toISOString(),
    expected,
  });
}

for (let i = 0; i < 500; i++) {
  const project = projects[i % projects.length];
  const n = Math.floor(i / 10) + 1;
  const kind = i % 10;
  if (kind === 0) add(i, `we finally decided to ship ${project.toLowerCase()} in cohort ${n}`, `We finally decided to ship ${project} in cohort ${n}.`, { outcome: "created", kind: "decision", query: `What did we decide about ${project}?` });
  else if (kind === 1) add(i, `i will send the ${project.toLowerCase()} rollout note ${n}`, `I will send the ${project} rollout note ${n}.`, { outcome: "created", kind: "commitment", query: `What am I responsible for on ${project}?` });
  else if (kind === 2) add(i, `the ${project.toLowerCase()} review is due ${days[i % days.length]}`, `The ${project} review is due ${days[i % days.length]}.`, { outcome: "created", kind: "deadline", query: `When is the ${project} review due?` });
  else if (kind === 3) add(i, `${owners[i % owners.length]} leads workstream ${n} for ${project.toLowerCase()}`, `${owners[i % owners.length]} leads workstream ${n} for ${project}.`, { outcome: "created", kind: "fact", query: `Who leads workstream ${n} for ${project}?` });
  else if (kind === 4) add(i, `i prefer ${project.toLowerCase()} updates to use numbered sections ${n}`, `I prefer ${project} updates to use numbered sections ${n}.`, { outcome: "created", kind: "preference", query: `How do I prefer ${project} updates?` });
  else if (kind === 5) add(i, `maybe we decided to rename ${project.toLowerCase()} not sure yet`, `Maybe we decided to rename ${project}; I’m not sure yet.`, { outcome: "rejected", kind: "decision", query: `What did we decide about renaming ${project}?` });
  else if (kind === 6) add(i, `quick thought about ${project.toLowerCase()} icon spacing ${n}`, `Quick thought about ${project} icon spacing ${n}.`, { outcome: "ignored", kind: null, query: `What did we decide about ${project} icon spacing?` });
  else if (kind === 7) add(i, `could perhaps send a ${project.toLowerCase()} note ${n}`, `Could perhaps send a ${project} note ${n}.`, { outcome: "ignored", kind: null, query: `What did I commit to for ${project}?` });
  else if (kind === 8) add(i, `random search best lunch near office number ${n}`, `Random search: best lunch near office, result ${n}.`, { outcome: "ignored", kind: null, query: `What is my lunch preference?` });
  else add(i, `for the record ${project.toLowerCase()} uses european dates in report ${n}`, `For the record, ${project} uses European dates in report ${n}.`, { outcome: "created", kind: "fact", query: `Which date format does ${project} use?` });
}

await mkdir(path.join(root, "data"), { recursive: true });
await writeFile(path.join(root, "data", "corpus.jsonl"), `${records.map((record) => JSON.stringify(record)).join("\n")}\n`);
console.log(`Generated ${records.length} records at data/corpus.jsonl`);
