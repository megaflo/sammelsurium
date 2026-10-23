// Builds the GitHub Pages site into _site/.
// Every directory in tools/ becomes _site/<name>/ and is listed on the landing page
// using the title and description from its tool.json.
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const out = "_site";
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

const escape = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const tools = [];
for (const entry of await readdir("tools", { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const dir = `tools/${entry.name}`;
  if (!existsSync(`${dir}/index.html`)) throw new Error(`${dir}/index.html is missing`);
  const meta = existsSync(`${dir}/tool.json`) ? JSON.parse(await readFile(`${dir}/tool.json`, "utf8")) : {};
  tools.push({ name: entry.name, title: meta.title ?? entry.name, description: meta.description ?? "" });
  await cp(dir, `${out}/${entry.name}`, { recursive: true });
}
tools.sort((a, b) => a.title.localeCompare(b.title));

const items = tools
  .map((t) => `      <li><a href="${escape(t.name)}/"><strong>${escape(t.title)}</strong></a>${
    t.description ? `<span>${escape(t.description)}</span>` : ""}</li>`)
  .join("\n");

await writeFile(`${out}/index.html`, `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Sammelsurium</title>
  <style>
    :root { color-scheme: light dark; }
    body { font-family: system-ui, sans-serif; max-width: 40rem; margin: 3rem auto; padding: 0 1rem; line-height: 1.5; }
    ul { list-style: none; padding: 0; }
    li { margin: 1rem 0; }
    li span { display: block; opacity: .7; }
  </style>
</head>
<body>
  <h1>Sammelsurium</h1>
  <p>A collection of small tools.</p>
  <ul>
${items}
  </ul>
</body>
</html>
`);

console.log(`Built ${tools.length} tool(s) into ${out}/`);
