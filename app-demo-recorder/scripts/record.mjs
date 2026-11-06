#!/usr/bin/env node
// app-demo-recorder: drive a web app from a JSON shot list and record a demo video
// with a visible cursor, click ripples, typing at human speed, and timed captions.
// Usage: node record.mjs shotlist.json [outDir]
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const shotFile = process.argv[2];
if (!shotFile) { console.error('usage: node record.mjs shotlist.json [outDir]'); process.exit(1); }
const shot = JSON.parse(fs.readFileSync(shotFile, 'utf8'));
const outDir = path.resolve(process.argv[3] || shot.outDir || './demo-out');
fs.mkdirSync(outDir, { recursive: true });

const W = shot.viewport?.width ?? 1280;
const H = shot.viewport?.height ?? 720;
const PACE = shot.pace ?? 1;            // >1 = slower, <1 = faster
const sleep = (ms) => new Promise(r => setTimeout(r, ms * PACE));

// Fake cursor + click ripple + caption bar, injected into every page and frame.
const overlay = `
(() => {
  if (window.__demoOverlay) return; window.__demoOverlay = true;
  const css = \`
    #__dc{position:fixed;top:0;left:0;width:22px;height:22px;z-index:2147483647;pointer-events:none;
      transform:translate(-3px,-2px);transition:transform .02s linear}
    .__dr{position:fixed;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;
      border:3px solid rgba(255,80,60,.9);z-index:2147483646;pointer-events:none;animation:__dr .6s ease-out forwards}
    @keyframes __dr{from{transform:scale(.4);opacity:1}to{transform:scale(3.2);opacity:0}}
    #__cap{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);max-width:80%;z-index:2147483645;
      background:rgba(0,0,0,.78);color:#fff;font:600 22px/1.35 system-ui,Segoe UI,Roboto,sans-serif;
      padding:10px 18px;border-radius:12px;pointer-events:none;opacity:0;transition:opacity .25s}\`;
  const add = () => {
    const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);
    const c = document.createElement('div'); c.id='__dc';
    c.innerHTML='<svg width="22" height="22" viewBox="0 0 24 24"><path d="M3 2l7 19 2.5-7.5L20 11z" fill="#111" stroke="#fff" stroke-width="1.6"/></svg>';
    document.body.appendChild(c);
    const cap = document.createElement('div'); cap.id='__cap'; document.body.appendChild(cap);
    addEventListener('mousemove', e => { c.style.left=e.clientX+'px'; c.style.top=e.clientY+'px'; }, true);
    addEventListener('mousedown', e => { const r=document.createElement('div'); r.className='__dr';
      r.style.left=e.clientX+'px'; r.style.top=e.clientY+'px'; document.body.appendChild(r); setTimeout(()=>r.remove(),700); }, true);
    window.__caption = (t) => { cap.textContent = t || ''; cap.style.opacity = t ? 1 : 0; };
  };
  if (document.body) add(); else addEventListener('DOMContentLoaded', add);
})();`;

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({
  viewport: { width: W, height: H },
  deviceScaleFactor: 1,
  recordVideo: { dir: outDir, size: { width: W, height: H } },
  colorScheme: shot.colorScheme ?? 'light',
  storageState: shot.storageState && fs.existsSync(shot.storageState) ? shot.storageState : undefined,
});
await context.addInitScript(overlay);
const page = await context.newPage();
const t0 = Date.now();
const cues = [];        // captions for the SRT
const log = [];
let mouse = { x: W / 2, y: H / 2 };
let openCue = null;

const now = () => (Date.now() - t0) / 1000;
async function setCaption(text) {
  if (openCue) { openCue.end = now(); cues.push(openCue); openCue = null; }
  if (shot.burnCaptionsLive !== false) await page.evaluate(t => window.__caption && window.__caption(t), text || '').catch(() => {});
  if (text) openCue = { start: now(), text };
}
async function glideTo(x, y) {
  const steps = Math.max(12, Math.round(Math.hypot(x - mouse.x, y - mouse.y) / 18));
  await page.mouse.move(x, y, { steps });
  mouse = { x, y };
}
async function target(sel, s = {}) {
  const loc = page.locator(sel).first();
  await loc.waitFor({ state: 'visible', timeout: s.timeoutMs ?? shot.timeoutMs ?? 15000 });
  await loc.scrollIntoViewIfNeeded();
  const b = await loc.boundingBox();
  return { loc, x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

try {
  if (shot.url) { await page.goto(shot.url, { waitUntil: 'networkidle' }).catch(() => page.goto(shot.url)); }
  await sleep(shot.introMs ?? 1200);
  for (const [i, s] of (shot.steps || []).entries()) {
    if (s.caption !== undefined) await setCaption(s.caption);
    try {
      switch (s.action) {
        case 'goto': await page.goto(s.url, { waitUntil: 'networkidle' }).catch(() => {}); break;
        case 'click': { const t = await target(s.selector, s); await glideTo(t.x, t.y); await sleep(250);
          await page.mouse.down(); await sleep(90); await page.mouse.up(); break; }
        case 'hover': { const t = await target(s.selector, s); await glideTo(t.x, t.y); break; }
        case 'type': { const t = await target(s.selector, s); await glideTo(t.x, t.y);
          await page.mouse.click(t.x, t.y); if (s.clear) await t.loc.fill('');
          await page.keyboard.type(s.text ?? '', { delay: (s.delay ?? 55) * PACE }); break; }
        case 'press': await page.keyboard.press(s.key); break;
        case 'select': { const t = await target(s.selector, s); await glideTo(t.x, t.y); await t.loc.selectOption(s.value); break; }
        case 'scroll': { const dy = s.y ?? 500; const n = 15;
          for (let k = 0; k < n; k++) { await page.mouse.wheel(0, dy / n); await sleep(30); } break; }
        case 'waitFor': await page.locator(s.selector).first().waitFor({ state: 'visible', timeout: s.timeoutMs ?? 30000 }); break;
        case 'wait': break;
        case 'screenshot': await page.screenshot({ path: path.join(outDir, s.name || `shot-${i}.png`) }); break;
        default: throw new Error('unknown action ' + s.action);
      }
      log.push({ i, action: s.action, ok: true, t: now() });
    } catch (e) {
      log.push({ i, action: s.action, ok: false, error: String(e.message || e).slice(0, 300), t: now() });
      await page.screenshot({ path: path.join(outDir, `fail-step-${i}.png`) }).catch(() => {});
      if (!s.optional) throw e;
    }
    await sleep(s.holdMs ?? 900);
  }
  await setCaption('');
  await sleep(shot.outroMs ?? 1200);
} catch (e) {
  console.error('STOPPED:', e.message || e);
  process.exitCode = 2;
} finally {
  if (openCue) { openCue.end = now(); cues.push(openCue); }
  const video = page.video();
  await context.close(); await browser.close();
  const raw = await video.path();
  const final = path.join(outDir, 'raw.webm');
  fs.renameSync(raw, final);
  const ts = (x) => { const ms = Math.round(x * 1000); const h = String(Math.floor(ms / 3600000)).padStart(2, '0');
    const m = String(Math.floor(ms / 60000) % 60).padStart(2, '0'); const s2 = String(Math.floor(ms / 1000) % 60).padStart(2, '0');
    return `${h}:${m}:${s2},${String(ms % 1000).padStart(3, '0')}`; };
  fs.writeFileSync(path.join(outDir, 'captions.srt'),
    cues.map((c, k) => `${k + 1}\n${ts(c.start)} --> ${ts(c.end)}\n${c.text}\n`).join('\n'));
  fs.writeFileSync(path.join(outDir, 'run-log.json'), JSON.stringify({ duration: now(), steps: log }, null, 2));
  console.log(JSON.stringify({ video: final, captions: path.join(outDir, 'captions.srt'), log: path.join(outDir, 'run-log.json'),
    failed: log.filter(l => !l.ok).length }));
}
