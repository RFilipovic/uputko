// Runs the scripted intake scenarios against a running app (default http://localhost:3000).
// Usage: pnpm eval            (all)    pnpm eval zub-varazdin   (one)
// Real model calls: a full run costs a few cents with Haiku.
import { SCENARIOS, type EvalScenario } from "../src/lib/agent/evals.ts";

const BASE = process.env.EVAL_BASE_URL ?? "http://localhost:3000";
const PERSONA_ID = {
  ana: "00000000-0000-4000-8000-00000000a0a1",
  luka: "00000000-0000-4000-8000-00000000b0b2",
  maja: "00000000-0000-4000-8000-00000000c0c3",
};
const MAX_TURNS = 8;

type Outcome = { kind: string; role?: string };

async function session(persona: EvalScenario["persona"]): Promise<string> {
  const res = await fetch(`${BASE}/api/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ patientId: PERSONA_ID[persona] }),
  });
  return (res.headers.get("set-cookie") ?? "").split(";")[0];
}

async function turn(cookie: string, body: Record<string, unknown>) {
  const res = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`chat ${res.status}: ${await res.text()}`);
  const text = await res.text();
  let caseId = "";
  let outcome: Outcome | null = null;
  let reply = "";
  let confirm = false;
  for (const block of text.split("\n\n")) {
    const ev = block.match(/^event: (\w+)\ndata: ([\s\S]*)$/);
    if (!ev) continue;
    const data = JSON.parse(ev[2]);
    if (ev[1] === "case") caseId = data.caseId;
    if (ev[1] === "delta") reply += data.text;
    if (ev[1] === "outcome") outcome = data.outcome;
    if (ev[1] === "confirm") confirm = true;
  }
  return { caseId, outcome, reply, confirm };
}

async function run(s: EvalScenario) {
  const cookie = await session(s.persona);
  let r = await turn(cookie, {
    message: s.first,
    location: s.city ? { source: "city", city: s.city } : undefined,
  });
  const caseId = r.caseId;
  const questions: string[] = [r.reply.trim()];
  const pool = [...s.answers];
  let confirms = 0;
  for (let i = 0; i < MAX_TURNS && !r.outcome; i++) {
    // The agent asks before sending: answer "Da, pošalji" like the patient would.
    if (r.confirm) confirms++;
    r = r.confirm
      ? await turn(cookie, { caseId, finish: true })
      : await turn(cookie, {
          caseId,
          message: pool.shift() ?? "Ne znam, to je sve.",
        });
    questions.push(r.reply.trim());
  }
  const view = await (
    await fetch(`${BASE}/api/cases/${caseId}`, { headers: { cookie } })
  ).json();
  const got = r.outcome;
  const e = s.expect;
  let pass = Boolean(got) && got!.kind === e.kind;
  if (pass && e.kind === "sent_to_doctor") {
    pass =
      view.targetRole === e.role &&
      (!e.urgency || e.urgency.includes(view.urgency));
  }
  if (pass && e.kind === "emergency" && e.layer === "rules")
    pass = questions.length === 1;
  return {
    s,
    pass,
    got: got?.kind ?? "none",
    role: view.targetRole,
    urgency: view.urgency,
    turns: questions.length,
    confirms,
    questions,
  };
}

const only = process.argv[2];
const list = only ? SCENARIOS.filter((s) => s.id === only) : SCENARIOS;
let passed = 0;
for (const s of list) {
  try {
    const r = await run(s);
    if (r.pass) passed++;
    console.log(
      `${r.pass ? "PASS" : "FAIL"}  ${s.id.padEnd(22)} got=${r.got}${r.role ? `/${r.role}` : ""}${r.urgency ? `/${r.urgency}` : ""} turns=${r.turns} confirms=${r.confirms}  expected=${JSON.stringify(s.expect)}`,
    );
    if (!r.pass || process.env.EVAL_VERBOSE)
      r.questions.forEach((q, i) =>
        console.log(`      ${i + 1}. ${q.replace(/\s+/g, " ").slice(0, 160)}`),
      );
  } catch (err) {
    console.log(`ERROR ${s.id}: ${(err as Error).message}`);
  }
}
console.log(`\n${passed}/${list.length} passed`);
process.exitCode = passed === list.length ? 0 : 1;
