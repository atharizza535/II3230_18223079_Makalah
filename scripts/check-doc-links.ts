import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const root = resolve(".");
const files = [join(root, "README.md"), ...walk(join(root, "docs")).filter((file) => file.endsWith(".md"))];
const linkPattern = /\[[^\]]+\]\(([^)]+)\)/g;
const missing: string[] = [];

for (const file of files) {
  const text = readFileSync(file, "utf8");
  for (const match of text.matchAll(linkPattern)) {
    const target = match[1];
    if (/^[a-z]+:\/\//i.test(target) || target.startsWith("#")) continue;
    const cleanTarget = target.split("#")[0];
    if (!cleanTarget) continue;
    const resolved = resolve(dirname(file), cleanTarget);
    if (!existsSync(resolved)) missing.push(`${file.replace(`${root}\\`, "")} -> ${target}`);
  }
}

if (missing.length > 0) {
  console.error(`Missing documentation links:\n${missing.join("\n")}`);
  process.exit(1);
}

console.log(`Checked ${files.length} Markdown files; all local links exist.`);
