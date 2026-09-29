const fs = require("fs");
const path = require("path");
const MarkdownIt = require("markdown-it");

const CONTENT_ROOT = path.join(__dirname, "..", "..", "content", "lessons");
const SAFE_SEGMENT = /^[a-z0-9][a-z0-9-]*$/i;

const md = new MarkdownIt({ html: false, typographer: true });

function parseFrontMatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw };
  const meta = {};
  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return { meta, body: match[2] };
}

function slugFromFilename(filename) {
  return filename.replace(/\.md$/, "");
}

function listSubjects() {
  if (!fs.existsSync(CONTENT_ROOT)) return [];
  return fs
    .readdirSync(CONTENT_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function listLessons(subject) {
  if (!SAFE_SEGMENT.test(subject)) return null;
  const dir = path.join(CONTENT_ROOT, subject);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return null;

  const lessons = fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const raw = fs.readFileSync(path.join(dir, file), "utf8");
      const { meta } = parseFrontMatter(raw);
      const slug = slugFromFilename(file);
      return {
        slug,
        title: meta.title || slug,
        summary: meta.summary || "",
        order: Number(meta.order) || 0,
      };
    });

  lessons.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
  return lessons;
}

function getLesson(subject, slug) {
  if (!SAFE_SEGMENT.test(subject) || !SAFE_SEGMENT.test(slug)) return null;
  const filePath = path.join(CONTENT_ROOT, subject, `${slug}.md`);
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return null;

  const raw = fs.readFileSync(filePath, "utf8");
  const { meta, body } = parseFrontMatter(raw);
  return {
    slug,
    title: meta.title || slug,
    summary: meta.summary || "",
    order: Number(meta.order) || 0,
    html: md.render(body),
  };
}

module.exports = { listSubjects, listLessons, getLesson };
