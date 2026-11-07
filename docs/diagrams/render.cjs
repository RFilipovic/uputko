// Render every *.svg in this folder to a 2× PNG (for GitHub and the PDF).
// Run from the repo: node docs/diagrams/render.cjs  (needs app/node_modules)
const path = require("path");
const fs = require("fs");
const { chromium } = require(path.join(__dirname, "../../app/node_modules/@playwright/test"));
(async () => {
  const b = await chromium.launch();
  for (const f of fs.readdirSync(__dirname).filter((f) => f.endsWith(".svg"))) {
    const svg = fs.readFileSync(path.join(__dirname, f), "utf8");
    const m = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
    const [w, h] = m ? [+m[1], +m[2]] : [1600, 1000];
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
    await p.setContent(`<html><body style="margin:0">${svg}</body></html>`);
    await p.screenshot({ path: path.join(__dirname, f.replace(/\.svg$/, ".png")), clip: { x: 0, y: 0, width: w, height: h } });
    console.log("rendered", f);
  }
  await b.close();
})();
