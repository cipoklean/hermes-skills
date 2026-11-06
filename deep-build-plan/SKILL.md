---
name: deep-build-plan
description: Turn a hackathon brief or product idea into a deep, demo-first build plan (rules, judges, scope, architecture, milestones, risks, demo script) before writing any code.
version: 1.0.0
author: cipoklean
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [planning, hackathon, spec, architecture]
    category: software-development
    related_skills: [grill-me, dynamic-workflow, subagent-driven-development, app-demo-recorder]
---

# Deep Build Plan

Plan like the judges are reading over your shoulder. No code until PLAN.md exists and the user approves it.

## When to Use
- "Plan this build", "help me win this hackathon", a pasted Devpost/DoraHacks/Luma link, or any
  new project with a deadline.

## Procedure
1. **Facts first (write them down, cite the page).** Open the hackathon page and rules. Record:
   deadline with timezone (convert to Africa/Lagos), required deliverables (repo, video length, deploy
   URL, deck), tracks and prize amounts, judging criteria with weights, banned/required tech, team and
   country rules. Never guess a deadline.
2. **What wins here.** Look at past winners of this event or sponsor (Devpost "winners" tab, sponsor
   blog). Note 3 patterns: what they built, how polished, what the demo showed.
3. **Three ideas, one pick.** Give 3 concepts scored 1-5 on: criteria fit, sponsor-tech depth,
   demo wow in 10 seconds, buildable solo in the time left, originality. Pick one and say why.
4. **Grill it.** Run the `grill-me` skill (if installed) or ask yourself: who exactly uses this, what
   breaks first, what would a judge say is fake, what is the smallest thing that still impresses.
5. **Scope with a knife.** Split into MUST (the demo path), SHOULD, WON'T. The MUST list is only what
   appears in the demo video.
6. **Architecture.** Components, data flow, external APIs and their free limits, where it runs
   (Oracle ARM VM: 2 OCPU / 12 GB, so no heavy local models), secrets in `.env` only.
   Draw it as a mermaid block in PLAN.md.
7. **Milestones by clock time**, demo-first:
   M0 skeleton deployed (hello world live URL) → M1 demo path works end to end with fake data →
   M2 real integrations → M3 polish + README → M4 record video (`app-demo-recorder`) → M5 submit
   with 3+ hours buffer. Each milestone has a "done when" check.
8. **Risks.** Top 5 with a fallback each (API down → cached fixture; rate limit → smaller model).
9. **Demo script.** 6-10 beats, one caption line each, under the required video length. This becomes
   the shot.json for `app-demo-recorder`.
10. **Write PLAN.md** in the repo root with sections: Facts, Pick & why, Scope, Architecture,
    Milestones, Risks, Demo script, Submission checklist. Show it to the user and wait for a yes.
11. **Execute** with `subagent-driven-development` or milestone by milestone; tick PLAN.md as you go.

## Rules
- Commits are authored by the user only: no Co-authored-by, no agent identity.
- Ask before anything public (pushing a public repo, posting, submitting) or anything that costs money.
- If the time left is under 24h, skip step 2 and cut SHOULD entirely.
