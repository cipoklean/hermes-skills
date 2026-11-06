---
name: app-demo-recorder
description: Click through a web app in a real browser and record it as a polished demo video (visible cursor, click ripples, captions, optional voiceover/music, 16:9 or 9:16).
version: 1.0.0
author: cipoklean
license: MIT
platforms: [linux, macos]
prerequisites:
  commands: [node, ffmpeg]
metadata:
  hermes:
    tags: [demo, video, playwright, screen-recording, hackathon]
    category: creative
    requires_toolsets: [terminal]
    related_skills: [sayguard-voice, deep-build-plan]
---

# App Demo Recorder

Use when David asks for a demo video, walkthrough, or "record the app". It drives the app with Playwright
(headless Chromium) from a JSON shot list, so the clicks are real and repeatable.

## One-time setup
```bash
bash ~/.hermes/skills/creative/app-demo-recorder/scripts/setup.sh
```

## Procedure
1. Open the app yourself first (browser tool or curl) and note real selectors (ids, `text=...`, roles).
2. Write `shot.json`, keeping it to 30-90 s and one story: problem, action, result.
```json
{"url":"https://myapp.example/","viewport":{"width":1280,"height":720},"pace":1,
 "steps":[
  {"action":"type","selector":"#q","text":"My generator won't start","caption":"Describe the problem"},
  {"action":"click","selector":"#go","caption":"One tap finds help"},
  {"action":"waitFor","selector":"text=technicians","holdMs":1500},
  {"action":"scroll","y":600,"caption":"More results"},
  {"action":"click","selector":"#extra","optional":true,"timeoutMs":2000}
 ]}
```
   Actions: goto, click, hover, type, press, select, scroll, waitFor, wait, screenshot.
   Per step: `caption`, `holdMs`, `optional`, `timeoutMs`. Top level: `pace` (>1 slower),
   `colorScheme`, `storageState` (a saved login JSON for signed-in apps).
3. Record:
```bash
SK=~/.hermes/skills/creative/app-demo-recorder/scripts
node $SK/record.mjs shot.json ./demo-out
```
   Output: raw.webm, captions.srt, run-log.json, and fail-step-N.png for any failed step.
   A failed required step stops the run; fix the selector using the screenshot, then re-run.
4. Finish:
```bash
bash $SK/finish.sh ./demo-out --title "FixAm" [--voice vo.mp3] [--music bg.mp3] [--speed 1.25] [--vertical]
```
   Output: demo-out/demo.mp4 (H.264, 30 fps).
5. Voiceover: write the lines from the captions, then make vo.mp3 with the sayguard-voice skill.
   Use the stock voice by default. Use David's cloned voice ONLY if his current message asks for "my voice".
6. Before you send it, watch the result: extract 3-4 frames with ffmpeg and look at them, and check that run-log.json has no unexpected failures.

## Pitfalls
- Never record real secrets on screen; use a demo account.
- Use waitFor after any action that loads data, or the video shows spinners.
- Keep the videos real: no faked UI states unless David asks.
