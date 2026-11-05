// Creates one GitHub milestone per phase and one issue per task in PLAN.md §3.
// Safe to re-run: milestones and issues that already exist are skipped.
// Usage, from the repo root: node scripts/create-issues.mjs [--dry-run]
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const TITLE_MAX = 90;
const dryRun = process.argv.includes("--dry-run");

function gh(...args) {
  return execFileSync("gh", args, { encoding: "utf8" }).trim();
}

function makeTitle(n, text) {
  const plain = text.replaceAll("**", "").replaceAll("*", "");
  const prefix = `[P${n}] `;
  if (prefix.length + plain.length <= TITLE_MAX) return prefix + plain;
  const cut = plain.slice(0, TITLE_MAX - prefix.length - 1);
  return `${prefix}${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

function parsePlan(markdown) {
  const phases = [];
  let phase = null;
  let section = null;
  let task = null;

  for (const line of markdown.split(/\r?\n/)) {
    const heading = line.match(/^### (Phase (\d+) — .+?) \(/);
    if (heading) {
      phase = { milestone: heading[1], n: heading[2], tasks: [] };
      phases.push(phase);
      section = null;
      task = null;
    } else if (/^#{1,3} /.test(line)) {
      phase = null;
    } else if (!phase) {
      continue;
    } else if (line.startsWith("**Exit:** ")) {
      const text = line.slice("**Exit:** ".length);
      phase.tasks.push({ title: `[P${phase.n}] Exit criteria`, text, section: null });
      task = null;
    } else if (/^\*\*.+\*\*$/.test(line)) {
      section = line.replaceAll("**", "");
      task = null;
    } else if (line.startsWith("- ")) {
      const text = line.slice(2);
      task = { title: makeTitle(phase.n, text), text, section };
      phase.tasks.push(task);
    } else if (task && /^\s+- /.test(line)) {
      task.text += `\n${line}`;
    }
  }
  return phases;
}

function issueBody(phase, task) {
  const source = [`Source: PLAN.md §3, ${phase.milestone}`, task.section].filter(Boolean);
  return `${task.text}\n\n${source.join(" · ")}`;
}

const phases = parsePlan(readFileSync("PLAN.md", "utf8"));
const titles = phases.flatMap((phase) => phase.tasks.map((task) => task.title));
const duplicates = titles.filter((title, i) => titles.indexOf(title) !== i);
if (duplicates.length > 0) throw new Error(`Duplicate titles: ${duplicates.join(", ")}`);

if (dryRun) {
  for (const phase of phases) {
    console.log(`\n${phase.milestone} (${phase.tasks.length} issues)`);
    for (const task of phase.tasks) console.log(`  ${task.title}`);
  }
  console.log(`\nTotal: ${phases.length} milestones, ${titles.length} issues. Nothing was created.`);
  process.exit(0);
}

gh("label", "create", "in-progress", "--color", "573DFE", "--description", "Claimed; see assignee", "--force");

const milestones = gh("api", "repos/{owner}/{repo}/milestones?state=all&per_page=100", "--paginate", "--jq", ".[].title").split("\n");
const existing = JSON.parse(gh("issue", "list", "--state", "all", "--limit", "1000", "--json", "title")).map((issue) => issue.title);

for (const phase of phases) {
  if (!milestones.includes(phase.milestone)) {
    gh("api", "repos/{owner}/{repo}/milestones", "-f", `title=${phase.milestone}`);
    console.log(`Milestone: ${phase.milestone}`);
  }
  for (const task of phase.tasks) {
    if (existing.includes(task.title)) {
      console.log(`Skipped: ${task.title}`);
      continue;
    }
    gh("issue", "create", "--title", task.title, "--body", issueBody(phase, task), "--milestone", phase.milestone);
    console.log(`Created: ${task.title}`);
    // GitHub rate-limits rapid content creation.
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
  }
}
