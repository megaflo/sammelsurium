# Sammelsurium

Small tools, served with GitHub Pages. Each tool lives in its own directory under `tools/` and is published at `/<name>/`. The landing page is generated from the tools' metadata.

## Add a tool

1. Copy `tools/example` to `tools/<name>`.
2. Edit `index.html` (any static HTML/JS/CSS; use relative paths).
3. Edit `tool.json` (`title`, `description`).
4. Push to `main`. The workflow builds and deploys the site.

## Preview locally

```sh
node scripts/build.mjs
python3 -m http.server -d _site
```

## Tests

```sh
node --test tests/
```

## One-time setup

In the repository settings under Pages, set the source to **GitHub Actions**.
