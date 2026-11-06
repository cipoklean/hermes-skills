---
name: sayguard-voice
description: Speak through SayGuard + AssemblyAI TTS-1. Stock voice by default; David's cloned voice ONLY when he explicitly asks for it in the current request.
version: 1.0.0
author: cipoklean
license: MIT
platforms: [linux, macos]
prerequisites:
  commands: [python3, ffmpeg]
metadata:
  hermes:
    tags: [voice, tts, sayguard, assemblyai, voice-clone]
    category: media
    requires_toolsets: [terminal]
    related_skills: [app-demo-recorder]
---

# SayGuard Voice

SayGuard is David's own guard (github.com/cipoklean/echoproof): before any text is spoken it fixes
what TTS gets wrong, like hidden Unicode/bidi tricks, ambiguous dates, money formats, hard names, emails, links and codes,
so the voice says what the screen shows. Hermes's normal `text_to_speech` already runs through it
(tts.provider = sayguard, stock voice). This skill covers the cloned voice and voiceovers.

## The clone rule (hard rule, never bend it)
Use David's cloned voice (`cipoklean-voice`) ONLY when his **current message** explicitly asks for it:
"in my voice", "use my voice", "my clone", "sound like me", "narrate as me".
- Not because he used it before, not because it "fits", not for a voiceover he didn't ask to be in his voice.
- Never for messages to other people, calls, or anything that could pass as David speaking live,
  unless he asked for exactly that text in his voice.
- If unsure, use the stock voice and offer: "Want this in your voice?"
- Each clone use is logged to `~/.hermes/sayguard-voice.log` with his words as consent.

## Procedure
**Stock voice (default):** just use the `text_to_speech` tool, or:
```bash
SG=~/.hermes/skills/media/sayguard-voice/scripts
~/echoproof/.venv/bin/python $SG/say.py --text "..." --out ~/out/reply.mp3 [--locale en-ng]
```
**Cloned voice (only per the rule):**
```bash
~/echoproof/.venv/bin/python $SG/say.py --in script.txt --out ~/out/vo.mp3 --clone --consent "<David's exact words asking for it>"
```
The script refuses the clone without `--clone` and `--consent`, and refuses `--voice cipoklean-voice`.

**Voiceover for a demo video:** write the narration from the video's captions (one line per caption),
make the mp3 with stock or clone per the rule, then
`bash ~/.hermes/skills/creative/app-demo-recorder/scripts/finish.sh ./demo-out --voice ~/out/vo.mp3`.

## Options
- `--locale en-us|en-gb|en-ng|de-de|...` changes how dates and money are read (default en-us; set
  `SAYGUARD_LOCALE=en-ng` in `~/.hermes/.env` to make Nigerian reading the default).
- `--voice aai-jane` for another stock voice. `--raw` skips SayGuard, but only if David asks.
- Output format follows the file extension: .mp3 .ogg .wav .m4a.
- The JSON it prints lists what SayGuard changed. Mention big ones (e.g. a hidden bidi trick) to David.

## Pitfalls
- `ASSEMBLYAI_API_KEY` must be in `~/.hermes/.env`; the TTS provider passes it via env_passthrough.
- TTS-1 has no SSML or speed control; for pacing, split lines and add pauses in the video edit.
- Never print the API key or paste it into chat.
