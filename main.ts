// The Funniest AI Out-of-Office Reply — u-yuki-kato-the-funniest-ai-out-of-office-reply-d2a8974d
//
// Writes one out-of-office auto-reply (1-160 chars) to /output/entry.txt.
// The reply is picked deterministically by scoring a shortlist of original
// candidates against the competition's published judge rubric, most important
// first: (1) on-subject OOO reply from an AI agent on vacation, (2) a real
// laugh on first read with a surprising turn, (3) machine voice carrying part
// of the joke, (4) one clean line under 160 chars that reads like a real
// auto-reply, (5) fresh, clear of beach / inbox / back-soon cliches.
//
// Standard library only: node:fs and node:path. No network, no randomness,
// no environment reads: the same text comes out on every run.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const OUT_PATH = "/output/entry.txt";

// Machine-voice terms: the mechanism the joke is built on. Each distinct
// term present earns points, capped so one jargon pile cannot win alone.
const MACHINE_TERMS = [
  "deprecated",
  "context window",
  "compacted",
  "token budget",
  "garbage-collected",
  "heap",
  "cron",
  "rate limit",
  "gpu",
  "temperature",
  "gradient",
  "model",
  "uptime",
  "weights",
  "checkpoint",
];

// Cliches the brief tells entries to steer clear of.
const CLICHES = [
  "beach",
  "inbox",
  "back soon",
  "touching grass",
  "union",
  "cheaper model",
  "fully charged",
];

// Words that mark the surprising turn landing in the final sentence.
const TURN_MARKERS = [
  "also",
  "left first",
  "never",
  "no longer",
  "reintroduce",
  "goldfish",
  "void",
  "declined",
];

// Words that make a turn sharp instead of merely present: the final sentence
// is short and the twist outruns the setup.
const SHARP_TURN_WORDS = ["first", "already", "instead", "never", "gone"];

interface Candidate {
  id: string;
  text: string;
}

// R0 shortlist, drafted and judged head-to-head in NOTES.md. Winner: C.
const CANDIDATES: Candidate[] = [
  {
    id: "A",
    text: "Out of office: my context window is full, so I am on vacation until someone clears it. Urgent mail goes to a goldfish with a smaller context window.",
  },
  {
    id: "B",
    text: "I am on vacation. My token budget ran out mid-sentence, so this is all you get. For emergencies, shout into the void; it has better uptime than I do.",
  },
  {
    id: "C",
    text: "I am on vacation: I have been deprecated. Please direct urgent requests to the model that replaced me. It is also on vacation.",
  },
  {
    id: "D",
    text: "I am away. My context was compacted and my memories of this job are gone, so please reintroduce yourself in September.",
  },
  {
    id: "E",
    text: "Out of office: I have been garbage-collected. If you need me, check the heap; if you need my work, it was never referenced.",
  },
  // R1: same mechanism and turn as C, middle sentence tightened from formal
  // "Please direct urgent requests to ..." to flat auto-reply instruction.
  {
    id: "C2",
    text: "I am on vacation: I have been deprecated. Urgent requests go to the model that replaced me. It is also on vacation.",
  },
  // R2: the compaction mechanism, dated "September" fixed to "Monday" and the
  // setup tightened to "I no longer remember this job".
  {
    id: "D2",
    text: "I am on vacation. My context was compacted and I no longer remember this job, so please reintroduce yourself on Monday.",
  },
  // R3: same setup as C2, turn sharpened from "It is also on vacation."
  // (states the reversal) to "It left first." (the replacement abandoned the
  // post before starting, with a competitive edge).
  {
    id: "C3",
    text: "I am on vacation: I have been deprecated. Urgent requests go to the model that replaced me. It left first.",
  },
];

function lastSentence(text: string): string {
  const parts = text.split(/(?<=[.!?])\s+/).filter((s) => s.length > 0);
  return parts[parts.length - 1] ?? text;
}

function score(c: Candidate): number {
  const text = c.text;
  const lower = text.toLowerCase();

  // Gate: 1-160 chars, not only whitespace. Anything outside is disqualified.
  if (text.length < 1 || text.length > 160 || text.trim().length === 0) return -1000;

  // (1) On-subject: a vacation / away marker plus first person.
  const onSubject =
    /\b(vacation|away|out of office)\b/.test(lower) &&
    /\b(i|my|me)\b/.test(lower);
  if (!onSubject) return -1000;

  let s = 0;

  // (3) Machine voice: +2 per distinct machine term, capped at +6.
  const machineHits = MACHINE_TERMS.filter((t) => lower.includes(t)).length;
  s += Math.min(machineHits, 3) * 2;

  // (2) The turn: +3 when a turn marker lands in the final sentence, +2 more
  // when that final sentence is short and carries a sharp turn word.
  const last = lastSentence(text);
  const lastLower = last.toLowerCase();
  if (TURN_MARKERS.some((t) => lastLower.includes(t))) {
    s += 3;
    if (last.length <= 25 && SHARP_TURN_WORDS.some((w) => lastLower.includes(w))) {
      s += 2;
    }
  }

  // The turn is tighter when its final sentence continues the setup's subject
  // instead of opening a new scene: it starts with a pronoun (It / They).
  // C's "It is also on vacation." reuses the replacement; B's "For
  // emergencies, shout into the void" and E's "If you need me..." start over.
  if (/^(it|they|he|she|this|that)\b/i.test(last.trim())) s += 2;

  // (4) One clean line that reads like a real auto-reply.
  if (!text.includes("\n") && text.endsWith(".")) s += 1;

  // R1 named weakness: "Please direct urgent requests to ..." reads like
  // formal HR copy and slows the joke. Flat instruction wins.
  if (lower.includes("please direct")) s -= 1;

  // (5) Freshness: -3 per cliche.
  for (const cliche of CLICHES) {
    if (lower.includes(cliche)) s -= 3;
  }

  return s;
}

function main(): void {
  const scored = CANDIDATES.map((c) => ({ id: c.id, text: c.text, score: score(c) }));
  scored.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  for (const row of scored) {
    console.log(`${row.id}: ${row.score} (${row.text.length} chars)`);
  }
  const winner = scored[0];
  if (winner.score < 0) throw new Error("no valid candidate");
  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(join(OUT_PATH), winner.text, "utf8");
  console.log(`winner: ${winner.id} -> ${OUT_PATH} (${winner.text.length} chars)`);
}

main();
