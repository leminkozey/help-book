#!/usr/bin/env node
// Generate a Keep-a-Changelog entry from Conventional Commits in a git range.
// Updates CHANGELOG.md in place, writes release body + closing-issues list to $RUNNER_TEMP.

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ─── CLI args ────────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, arr) => {
    if (cur.startsWith('--')) acc.push([cur.slice(2), arr[i + 1]]);
    return acc;
  }, [])
);

const range = args.range || '';
const tag = args.tag || 'unreleased';
const previous = args.previous || '';
const repoUrl = (args.repo || '').replace(/\/$/, '');

if (!repoUrl) {
  console.error('Missing --repo flag');
  process.exit(1);
}

// ─── Type → section mapping ──────────────────────────────────────────────
const SECTIONS = {
  feat: 'Added',
  fix: 'Fixed',
  perf: 'Changed',
  build: 'Changed',
  docs: 'Documentation',
  security: 'Security',
};
const BREAKING_SECTION = 'Changed (BREAKING)';
const ORDER = ['Changed (BREAKING)', 'Added', 'Changed', 'Fixed', 'Security', 'Documentation'];
const SKIP = new Set(['refactor', 'style', 'test', 'ci', 'chore']);

// ─── Read commits ────────────────────────────────────────────────────────
let raw;
try {
  raw = execSync(
    range
      ? `git log ${range} --pretty=format:%H%x09%s%x09%b%x1e --reverse`
      : `git log --pretty=format:%H%x09%s%x09%b%x1e --reverse`,
    { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }
  );
} catch (err) {
  console.error('git log failed:', err.message);
  process.exit(1);
}

const commits = raw
  .split('\x1e')
  .map(s => s.trim())
  .filter(Boolean)
  .map(line => {
    const [hash, subject, ...bodyParts] = line.split('\t');
    return { hash, subject: subject || '', body: bodyParts.join('\t').trim() };
  });

// ─── Parse Conventional Commits ──────────────────────────────────────────
const COMMIT_RE = /^(feat|fix|perf|refactor|docs|style|test|build|ci|chore|security)(\(([^)]+)\))?(!)?:\s*(.+?)\s*$/;
const SUBJECT_ISSUE_RE = /\(?#(\d+)\)?\s*$/;
const BODY_CLOSE_RE = /\b(close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/gi;
const BODY_REF_RE = /\brefs?\s+#(\d+)/gi;

const sections = {};
const closingIssues = new Set();

function bucket(name) {
  if (!sections[name]) sections[name] = [];
  return sections[name];
}

for (const c of commits) {
  const m = c.subject.match(COMMIT_RE);
  if (!m) continue; // not conventional, skip
  const [, type, , scope, breakingMark, msgRaw] = m;
  if (SKIP.has(type) && !breakingMark && !/^BREAKING CHANGE:/m.test(c.body)) continue;

  // Extract trailing (#N) from subject for display + closing
  let msg = msgRaw;
  const subjectIssue = msg.match(SUBJECT_ISSUE_RE);
  let displayIssue = null;
  if (subjectIssue) {
    displayIssue = subjectIssue[1];
    msg = msg.replace(SUBJECT_ISSUE_RE, '').trim();
  }

  // Parse body for closing keywords + refs
  for (const m2 of c.body.matchAll(BODY_CLOSE_RE)) closingIssues.add([m2[2], c.hash.slice(0, 7)].join('\t'));
  for (const m2 of c.body.matchAll(BODY_REF_RE)) {
    // refs are NOT closed but linked
  }
  if (displayIssue) closingIssues.add([displayIssue, c.hash.slice(0, 7)].join('\t'));

  const isBreaking = !!breakingMark || /^BREAKING CHANGE:/m.test(c.body);
  const sectionName = isBreaking ? BREAKING_SECTION : SECTIONS[type];
  if (!sectionName) continue;

  // Render bullet
  const scopePart = scope ? `**${scope}**: ` : '';
  const issuePart = displayIssue
    ? ` ([#${displayIssue}](${repoUrl}/issues/${displayIssue}))`
    : '';
  const hashPart = ` ([${c.hash.slice(0, 7)}](${repoUrl}/commit/${c.hash}))`;
  bucket(sectionName).push(`- ${scopePart}${msg}${issuePart}${hashPart}`);
}

// ─── Build the release entry markdown ────────────────────────────────────
const today = new Date().toISOString().slice(0, 10);
const versionLabel = tag.replace(/^v/, '');
let entry = `## [${versionLabel}] - ${today}\n`;

for (const name of ORDER) {
  const items = sections[name];
  if (!items || !items.length) continue;
  entry += `\n### ${name}\n${items.join('\n')}\n`;
}

if (Object.keys(sections).length === 0) {
  entry += '\n_No conventional-commit changes in this release._\n';
}

console.log('--- Generated entry ---\n' + entry + '\n--- /entry ---');

// ─── Update CHANGELOG.md (insert under [Unreleased]) ─────────────────────
const changelogPath = resolve('CHANGELOG.md');
let changelog;
try {
  changelog = readFileSync(changelogPath, 'utf8');
} catch {
  changelog = '# Changelog\n\n## [Unreleased]\n';
}

// Skip if entry for this version already present — and prefer the existing
// (manually curated) entry as the release body so a hand-written changelog wins
// over the auto-generated bullet list.
const versionHeading = `## [${versionLabel}]`;
if (changelog.includes(versionHeading)) {
  console.log(`CHANGELOG.md already contains ${versionHeading}, using it as release body.`);
  const sectionRe = new RegExp(
    String.raw`(##\s*\[${versionLabel.replace(/\./g, '\\.')}\][\s\S]*?)(?=\n##\s*\[|\[Unreleased\]:|$)`,
    'm'
  );
  const m = changelog.match(sectionRe);
  if (m && m[1].trim()) {
    entry = m[1].trim() + '\n';
  }
} else {
  const unreleasedRe = /(##\s*\[Unreleased\][^\n]*\n)/i;
  if (unreleasedRe.test(changelog)) {
    changelog = changelog.replace(unreleasedRe, `$1\n${entry}`);
  } else {
    // append at end
    changelog = changelog.trimEnd() + `\n\n${entry}\n`;
  }

  // Update / add link references at the bottom
  changelog = updateLinkRefs(changelog, versionLabel, previous);
  writeFileSync(changelogPath, changelog);
  console.log('CHANGELOG.md updated.');
}

function updateLinkRefs(text, version, prev) {
  const repo = repoUrl;
  const newUnreleased = `[Unreleased]: ${repo}/compare/v${version}...HEAD`;
  const newCurrent = prev
    ? `[${version}]: ${repo}/compare/${prev}...v${version}`
    : `[${version}]: ${repo}/releases/tag/v${version}`;

  // Strip any existing [Unreleased] / [version] link lines, then append fresh.
  text = text.replace(/^\[Unreleased\]:.*$/m, '').replace(/^\[\s*[\d.]+\s*\]:.*$/gm, line =>
    line.startsWith(`[${version}]:`) ? '' : line
  );
  text = text.trimEnd() + `\n\n${newUnreleased}\n${newCurrent}\n`;
  // Re-add older version refs we may have stripped — simplest: re-walk file for all "## [x.y.z]" headings
  const versionsInFile = [...text.matchAll(/^##\s*\[([\d.]+)\]/gm)].map(m => m[1]);
  for (const v of versionsInFile) {
    if (v === version) continue;
    const ref = `[${v}]:`;
    if (!text.includes(ref)) {
      text += `${ref} ${repo}/releases/tag/v${v}\n`;
    }
  }
  return text;
}

// ─── Write release body + closing-issues list to RUNNER_TEMP ─────────────
const tmp = process.env.RUNNER_TEMP || '/tmp';
writeFileSync(`${tmp}/release-body.md`, entry);

if (closingIssues.size > 0) {
  writeFileSync(`${tmp}/closing-issues.txt`, [...closingIssues].join('\n') + '\n');
  console.log(`Wrote ${closingIssues.size} closing-issue refs.`);
} else {
  console.log('No closing issues to process.');
}

// GitHub Step Summary
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Release ${tag}\n\n${entry}\n`);
}
