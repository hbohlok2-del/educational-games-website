const fs = require("fs");
const os = require("os");
const path = require("path");

// Video lessons: a Course Notes lesson that names a video folder shows the video
// and a link to its interactive player, served from public/videos/<name>/
// (video.mp4, poster.jpg, index.html).
process.env.TURSO_DATABASE_URL = `file:${path.join(os.tmpdir(), `lesson-video-test-${process.pid}.db`)}`;
delete process.env.TURSO_AUTH_TOKEN;
process.env.PORT = process.env.PORT || 4011;

const server = require(path.join(__dirname, "..", "server.js"));
const lessons = require(path.join(__dirname, "..", "server", "content", "lessons.js"));

const base = `http://localhost:${process.env.PORT}`;
const MATH = path.join(__dirname, "..", "content", "lessons", "math");
const PROBE = path.join(MATH, "zz-video-probe.md");

let failures = 0;
function check(label, ok) {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}`);
  if (!ok) failures++;
}

async function main() {
  const lesson = lessons.getLesson("math", "area-and-surface-area");
  check("lesson names its video folder", lesson && lesson.video === "grade7-lesson-2-6");
  check("lessons without a video have none", lessons.getLesson("math", "quadratic-formula").video === "");

  // A video name that could leave public/videos/ is dropped, not passed to the page.
  fs.writeFileSync(PROBE, "---\ntitle: Probe\nvideo: ../../server\n---\nBody\n");
  try {
    check("unsafe video name is rejected", lessons.getLesson("math", "zz-video-probe").video === "");
  } finally {
    fs.unlinkSync(PROBE);
  }

  const page = await (await fetch(`${base}/lessons/math/area-and-surface-area`)).text();
  check("lesson page embeds the video", page.includes('src="/videos/grade7-lesson-2-6/video.mp4"'));
  check("lesson page links the interactive player", page.includes('href="/videos/grade7-lesson-2-6/"'));
  const plain = await (await fetch(`${base}/lessons/math/quadratic-formula`)).text();
  check("plain lesson page has no video block", !plain.includes("lesson-video"));

  const player = await fetch(`${base}/videos/grade7-lesson-2-6/`);
  const playerHtml = await player.text();
  check("interactive player is served", player.status === 200 && playerHtml.startsWith("<!doctype html>"));
  check("player loads the video beside it", playerHtml.includes('src="video.mp4"'));

  // Phones seek with range requests; the static server must answer them.
  const part = await fetch(`${base}/videos/grade7-lesson-2-6/video.mp4`, { headers: { Range: "bytes=0-1023" } });
  check("video answers range requests", part.status === 206 && part.headers.get("content-type") === "video/mp4");
  const poster = await fetch(`${base}/videos/grade7-lesson-2-6/poster.jpg`);
  check("poster image is served", poster.status === 200 && poster.headers.get("content-type") === "image/jpeg");

  server.close(() => {
    console.log(failures ? `LESSON VIDEO TEST FAILED (${failures})` : "LESSON VIDEO TEST PASSED");
    process.exit(failures ? 1 : 0);
  });
}

main().catch((e) => { console.error(e); process.exit(1); });

setTimeout(() => {
  console.log("TIMEOUT - test did not complete");
  process.exit(1);
}, 20000);
