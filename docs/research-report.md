# Building an AI Content Agent for a New Instagram Page — Research Report

*Researched 30 Oct 2026. Star counts and last-push dates come from GitHub on that day.*

---

## 1. TL;DR

- You don't need one repo that does everything. The good setup puts together **3–4 well-maintained open-source pieces** and an LLM "brain" that ties them together.
- **Recommended stack:**
  1. **Claude (or another LLM)** for niche research, ideas, scripts and captions.
  2. **An HTML-to-PNG carousel renderer** for image posts (the `open-carrusel` approach).
  3. **MoneyPrinterTurbo** or **short-video-maker** for faceless Reels.
  4. **Postiz** (self-hosted) or the **official Instagram Graph API** for scheduling and publishing.
  5. **A human-approval step** before anything goes live, at least for the first 4–6 weeks.
- **Avoid "private API" bots** (instagrapi, anti-detection tools, auto-follow/like bots) on an account you care about. They break Instagram's Terms and are the most common way new automated accounts get banned.

---

## 2. What the GitHub landscape looks like

### A. Full "autopilot" Instagram agents (all-in-one)

| Repo | Stars | Last push | What it does | Verdict |
|---|---|---|---|---|
| [alsk1992/instagram-ai-agent](https://github.com/alsk1992/instagram-ai-agent) | 58 | Apr 2026 | Generates carousels, memes, quote cards, Reels from stock or AI footage. Posts on a schedule, replies to comments, follows back, has a "warmup ramp" and an "anti-detection layer". Free-tier LLM router (Groq, Gemini, OpenRouter), ComfyUI/Flux for images. | Very feature-rich and worth **reading for ideas** (content formats, warmup, niche config). Its posting uses cookie/private-API login with anti-detection, which carries **high ban risk**. Small project with no pushes since April. |
| [np5555/ai-posting-agent-for-instagram](https://github.com/np5555/ai-posting-agent-for-instagram) | small | — | Node.js: Gemini writes the caption and hashtags, Unsplash supplies the image, then it posts on a schedule with topic rotation. | A good **minimal reference** (~200 lines) to see the whole loop. Output is too generic to grow a page. |
| [avnsh1111/instagram-reels-scraper-auto-poster](https://github.com/avnsh1111/instagram-reels-scraper-auto-poster) | — | — | Scrapes other people's Reels and Shorts and reposts them. | **Don't use.** Reposting others' content leads to copyright strikes and no original value. |

### B. Short-video / Reels generators (the "content engine")

| Repo | Stars | Last push | Notes |
|---|---|---|---|
| [harry0703/MoneyPrinterTurbo](https://github.com/harry0703/MoneyPrinterTurbo) | **136k** | Oct 2026 (active) | Topic in, finished 9:16 video out: LLM script, stock footage (Pexels/Pixabay), TTS voiceover, subtitles and music. Has a web UI and an API, MIT licence. **The most mature open-source faceless-video tool.** |
| [gyoridavid/short-video-maker](https://github.com/gyoridavid/short-video-maker) | 1.4k | Jun 2025 | Makes short videos through **MCP and a REST API** using Remotion, Kokoro TTS and Pexels. Easy for an AI agent (Claude, n8n) to call as a tool. Docker-ready. |
| [RayVentura/ShortGPT](https://github.com/RayVentura/ShortGPT) | 8k | Feb 2025 | An earlier framework (editing engine, translation, voice). Largely **unmaintained** now. |
| [FujiwaraChoki/MoneyPrinterV2](https://github.com/FujiwaraChoki/MoneyPrinterV2) | 32k | Sep 2026 | Mostly YouTube Shorts, Twitter and outreach. AGPL licence. Not Instagram-focused. |
| [remotion-dev/remotion](https://github.com/remotion-dev/remotion) | 69k | Oct 2026 | "Videos as React code." Use it to build **your own branded Reel templates** once you outgrow stock-footage videos. Company licence needed at scale. |

### C. Carousel / image-post builders

| Repo | Stars | Notes |
|---|---|---|
| [Hainrixz/open-carrusel](https://github.com/Hainrixz/open-carrusel) | 504 | Next.js app where **Claude designs slides as HTML**, and Puppeteer exports them as PNGs at exact Instagram sizes. Includes brand config, templates and Google Fonts. Active (Oct 2026), MIT licence. **The best pattern for carousels**, which are often the highest-saving format for educational niches. |

### D. Strategy / "brain" layers (prompts and skills)

| Repo | Stars | Notes |
|---|---|---|
| [Ootto-AI/claude-content-skills](https://github.com/Ootto-AI/claude-content-skills) | 324 | Claude Code skills covering niche and trend scouting (Reddit), viral-reel analysis, hook writing, scripts, captions and hashtags, a 2-week calendar, and comment replies. A ready-made **content-strategist** layer. |
| [contains-studio/agents → instagram-curator.md](https://github.com/contains-studio/agents/blob/main/marketing/instagram-curator.md) | — | A single system prompt for an "Instagram Curator" agent covering content pillars, grid planning, Reels hooks and hashtags. Easy to adapt. |

### E. Publishing / scheduling

| Option | Stars | Notes |
|---|---|---|
| [gitroomhq/postiz-app](https://github.com/gitroomhq/postiz-app) | **40k** | Self-hostable "agentic" social scheduler. Handles Instagram posts, carousels, Reels and Stories, plus TikTok and YouTube from the same queue. Has an **API and an MCP server**, so your agent can schedule posts directly. AGPL licence (fine for personal or internal use). Uses the official Meta API underneath. |
| Official **Instagram Graph API** | — | Free. Needs a Business or Creator account and a Meta developer app. You can call it yourself in about 50 lines of code (details in section 5). |
| [subzeroid/instagrapi](https://github.com/subzeroid/instagrapi) | 7k | Private, reverse-engineered API. Powerful, but it breaks Terms of Service and **risks your account**. Use it only for read-only research on a throwaway account, if at all. |

---

## 3. Recommended architecture

```
                   ┌──────────────────────────────────────────┐
                   │        ORCHESTRATOR (cron / n8n /         │
                   │   Claude Agent SDK / Claude Code loop)    │
                   └──────────────────────────────────────────┘
                                      │
  ┌─────────────┐   ┌──────────────┐  │  ┌────────────────┐   ┌──────────────┐
  │ 1. RESEARCH │──▶│ 2. IDEATION  │──┼─▶│ 3. PRODUCTION  │──▶│ 4. REVIEW    │
  │ Reddit,     │   │ pillars →    │     │ carousel: HTML │   │ approval     │
  │ Google      │   │ ideas → hook │     │  → PNG         │   │ queue (you,  │
  │ Trends,     │   │ → script →   │     │ reel: Money-   │   │ 2 min/day)   │
  │ competitor  │   │ caption +    │     │  PrinterTurbo/ │   └──────┬───────┘
  │ top posts   │   │ hashtags     │     │  short-video-  │          │
  └─────────────┘   └──────────────┘     │  maker         │          ▼
        ▲                                └────────────────┘   ┌──────────────┐
        │                                                     │ 5. PUBLISH   │
        │            ┌──────────────────────────┐             │ Postiz or    │
        └────────────│ 6. LEARN: Insights API → │◀────────────│ Graph API    │
                     │ what got saves/shares →  │             │ (scheduled)  │
                     │ feed back into ideation  │             └──────────────┘
                     └──────────────────────────┘
```

### The six stages

1. **Research.** The agent pulls trending questions in your niche (Reddit, Google Trends, YouTube comments, and the top posts of 5–10 competitor accounts you choose). It outputs a ranked list of topics.
2. **Ideation and writing.** The LLM writes against a **brand file**: voice, audience, 3–5 content pillars, banned topics and visual style. Output per post: format (carousel or Reel), hook, slide text or script, caption, and 3–5 niche hashtags.
3. **Production.**
   - *Carousels:* the LLM writes HTML for each slide from your template, and Puppeteer or Playwright renders 1080×1350 PNGs.
   - *Reels:* send the script to MoneyPrinterTurbo's API, or to short-video-maker over MCP. Add AI images (Flux, Imagen, etc.) for a stronger look.
4. **Review.** Drafts land in a queue: a folder, a Notion or Sheets row, or a Telegram message with Approve/Reject buttons. **Keep this step.** It catches factual mistakes and generic "AI slop", which hurts reach.
5. **Publish.** Approved posts go to Postiz, or straight to the Graph API, at your chosen time slots.
6. **Learn.** Each week, pull Insights (reach, saves, shares, follows per post) and feed the best and worst performers back into the ideation prompt.

---

## 4. Three ways to build it (pick one)

| | **Option A: Low-code** | **Option B: Assemble open source (recommended)** | **Option C: Fork an autopilot repo** |
|---|---|---|---|
| How | n8n or Make workflow: LLM node → image/video API → Postiz | Small Python/TS orchestrator + MoneyPrinterTurbo + carousel renderer + Postiz, all in Docker on one VPS | Clone `instagram-ai-agent`, set the niche config, run the daemon |
| Effort | 1–2 days | 1–2 weeks | Hours |
| Control and quality | Medium | **High** | Medium |
| Account safety | High (official API) | **High** (official API) | **Low** (private API) |
| Cost | ~$20–50/mo | ~$10–40/mo (VPS + LLM + TTS) | ~$5–20/mo |

**Recommendation:** go with **Option B**, and borrow the content-format ideas and warmup logic from Option C's repo.

---

## 5. Instagram API facts that matter

- **Account type:** you need an Instagram **Business or Creator** account. The older flow also needs a linked Facebook Page.
- **Meta setup:** create a Meta developer app with the `instagram_business_content_publish` permission (or `instagram_content_publish` on the Facebook-login flow). For your **own** account you can use it in development mode. App Review is only needed if you publish for other people's accounts.
- **How publishing works:** it is a two-step container flow.
  1. `POST /{ig-user-id}/media` with `image_url` or `video_url` and `media_type=REELS` or `CAROUSEL`.
  2. For video, poll `status_code` until it reads `FINISHED`.
  3. `POST /{ig-user-id}/media_publish`.
- **Media hosting:** the media has to be at a **public URL**. Use an S3 or R2 bucket, or let Postiz handle it.
- **Carousels:** up to 10 items (Meta's reference now says up to 20). Each item is its own child container with `is_carousel_item=true`.
- **Reels:** H.264 video with AAC audio, 3 seconds to 15 minutes, 9:16 aspect ratio. Reels cannot go inside carousels.
- **Rate limit:** Meta's docs now say **100 API-published posts per rolling 24 hours** per account (older guides say 25). Check what's left with `GET /{ig-user-id}/content_publishing_limit`. In practice you'll post 1–3 times a day.
- **What the API can't do:** trending audio and some music features. If a Reel depends on trending audio, post it by hand.

---

## 6. Phased build plan

**Week 0: Decide the niche and brand (the most important step)**
- Pick a niche with (a) a clear audience pain point, (b) content that people save or share, and (c) a monetisation path (affiliate, digital product, sponsorships).
- Write `brand.md`: audience, voice, 4 content pillars, colour palette and fonts, 10 example "great posts".

**Week 1: MVP for carousels only (cheapest, highest-saving format)**
- Script: topic → LLM → slide JSON → HTML template → PNG → caption.
- Generate 15 posts and review them by hand. Post manually, or through Postiz.

**Week 2: Add Reels**
- Run MoneyPrinterTurbo (or short-video-maker) in Docker and call its API from the orchestrator.
- Add TTS (Edge-TTS is free; ElevenLabs costs more but sounds better) and burned-in subtitles.

**Week 3: Automate the loop**
- Use a cron job or n8n to generate 7 drafts every Sunday.
- Send drafts to an approval queue (Telegram bot or Notion).
- Approved drafts go into the Postiz schedule.

**Week 4+: Feedback and scale**
- Weekly Insights pull feeds into a "what worked" memory file that the ideation prompt reads.
- Optional add-ons:
  - Comment replies through the official API (keep them human-sounding and rate-limited).
  - Cross-posting to TikTok and YouTube Shorts from the same Postiz queue.

---

## 7. Rough monthly cost (1–2 posts/day)

| Item | Cost |
|---|---|
| VPS (4 GB RAM, for MoneyPrinterTurbo + Postiz) | $6–15 |
| LLM API (Claude Sonnet / Haiku for writing) | $5–20 |
| Image generation (optional) | $0–15 |
| TTS (Edge-TTS free / ElevenLabs) | $0–22 |
| Stock footage (Pexels / Pixabay API) | Free |
| **Total** | **~$10–70/mo** |

---

## 8. Risks and how to avoid them

| Risk | Mitigation |
|---|---|
| Account ban | Use the official API only. No auto-follow, auto-like or mass DMs. Warm up a new account by posting manually for the first 1–2 weeks. |
| Generic "AI slop" gets no reach | Keep a strong brand file and real examples, research real questions, keep human review, and use original templates. |
| Copyright | Use only royalty-free footage and music. Never repost others' content. |
| AI-content labelling | Instagram may label AI-generated imagery. Use the "AI info" label where it applies. |
| Wrong facts (health, finance and similar niches) | Make the agent cite sources in its drafts, and fact-check before approving. |

---

## 9. Next decisions needed from you

1. **What niche?** It drives the brand file, content formats and research sources.
2. **Faceless or with a persona?** For example, a consistent AI character, or your own voice.
3. **Carousels first, Reels first, or both?**
4. **Do you have a VPS, or should this run locally or on a free tier?**
5. **How much hands-on time?** Fully automated, or a 5-minute daily approval.

Once these are answered, the next step is scaffolding the Option B codebase: the brand file, carousel renderer, MoneyPrinterTurbo integration, approval bot and Postiz publishing.
