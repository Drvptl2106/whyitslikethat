# v3 plan — "Why It's Like That"

## Host character: Dr. Actually (working name)

An original character with that "insufferable genius" energy, built for this page.

| | |
|---|---|
| **Real name** | Dr. Ambrose Atwell. Everyone calls him "Dr. Actually", because every explanation starts with "Well… actually." |
| **Personality** | Precise, fussy, mildly offended by everyday ignorance, secretly delighted to explain. Never mean to the viewer, just smug about the facts. |
| **Look** | Tall and thin, round oversized glasses, perfectly combed side part, mustard sweater vest over a white shirt with a bow tie, always holding a telescoping pointer. Flat 2D cartoon style, consistent across every video. |
| **Voice** | Designed in ElevenLabs Voice Design (not a clone of anyone): crisp, slightly nasal, fast and precise, with a dry delivery. |
| **Catchphrases** | Opens with "Well… actually." Says "Try to keep up." when he speeds up. Closes with "You're welcome." Running gag: he's the only person who uses the "correct" term. |

The look and the voice deliberately avoid Sheldon's signature traits (layered superhero t-shirts, "Bazinga", his voice), so the character is ours to own.

## Script v3: why your 1TB drive shows 931GB

| Scene | Line | Background image |
|---|---|---|
| hook (POV) | "You buy a 1 terabyte laptop. You open your files… 931 gigabytes. Wait. Did they scam you?" | (laptop UI, already built) |
| reveal | **Dr. A:** "Well… actually, no. And frankly, I'm a little offended you'd assume that." | — (character intro, sonic logo) |
| langs | "Your drive and your computer simply count in two different languages. Try to keep up." | modern drive factory clean room vs. a computer motherboard |
| binary | "Computers think in powers of two. Two to the tenth is 1,024. Early engineers looked at that and said: close enough to a thousand. Call it a kilobyte. Sloppy. But here we are." | 1960s engineers in a room-sized mainframe hall, tape reels, punch cards |
| gap | "The problem? That tiny rounding error grows. 2% at kilobytes. 7% at gigabytes. Nearly 10% at terabytes." | stacks of hard drives growing in size through the decades |
| math | "Your drive maker uses proper metric: one trillion bytes. Windows divides by 1,024 three times, gets 931, and calls it gigabytes. Which is, technically, wrong." | chalkboard full of equations |
| court | "People were so confused they sued. Western Digital settled in 2006. Seagate offered refunds in 2007." | 2000s courtroom, a hard drive in an evidence bag |
| fix | "There is a correct word for it: the gibibyte. Nobody uses it. Except me. And Macs switched to decimal in 2009, so there your drive is a perfectly respectable 1 terabyte." | close-up of an old dictionary page |
| outro | "So nothing was stolen. You were simply counting wrong. You're welcome. Follow for more things you've been getting wrong." | — (character sign-off) |

## Image style (one style for the whole page)
- Backgrounds: cinematic, slightly desaturated, film grain, shallow depth of field. They sit behind the animated graphics, darkened to about 35% brightness with a slow push-in.
- Character: flat 2D cartoon (one model sheet with 6 poses: talking, pointing, smug, shocked, facepalm, waving), reused across every video so he stays consistent.

## What's needed to switch it on
1. **ElevenLabs:** add the API key as a network secret or env var named `ELEVENLABS_API_KEY`, and add `api.elevenlabs.io` to Allowed domains.
2. **Weave (images):** link your Figma account at app.weavy.ai → Settings → Profile.
