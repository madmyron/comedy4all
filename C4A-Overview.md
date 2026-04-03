# Comedy 4 All (C4A) — Full Feature Overview
**Version 10.1**

---

## 🔐 Accounts & Login
Full login system with sign-in via email/password, Google, or phone number (SMS code). Connected to **Supabase** — a backend service that stores jokes and data in the cloud for cross-device sync.

---

## 📊 Dashboard
Home base. Shows stats (total jokes, active sets, average rating, stage time), top performing jokes, upcoming shows, quick action buttons, and a **Brooks AI insight card**.

---

## 📝 Joke Manager
Full library of all jokes. Features:
- Write, edit, delete, or archive jokes
- Rate jokes (1–5 stars)
- Rank by tier: **A-Tier, B-Tier, C-Tier**
- Tag jokes (Travel, Tech, Dating, Family, Work, custom tags)
- Search and filter
- View version history of individual jokes

---

## 📋 Set Builder
Drag jokes from your library into a set list. Tracks total runtime, gives a "flow score," and shows Brooks AI notes on set order and pacing.

---

## 🎭 Rehearsal Mode
Flashcard-style practice mode. Go through your set one joke at a time, reveal the punchline, rate how it went (Killed / Okay / Bombed), and track a live timer.

---

## 🎙️ Recording
Record yourself performing — **audio or video** — directly in the browser. Playback recordings, take notes, and download files. Shows a performance score with Energy, Pace, and Confidence ratings.

---

## ✍️ Writing Studio
Script writing tool for bigger projects:
- TV/Film scripts (e.g. Late Night Pilot)
- Short films, comedy specials
- Long-form writing (memoir, corporate roast)
- Proper screenplay-style formatting (TV Script, Film Script, Stage Notes)
- Brooks AI suggestions panel on the right side

---

## 🤖 Brooks AI
Personal AI comedy writing assistant. Full chat interface. Capabilities:
- Punch up jokes
- Analyze set order and energy arc
- Generate new joke premises
- Find and fix weak jokes
- Write strong set closers
- **Story Mining** — scans all jokes to find potential **sitcom ideas, movie ideas, or a full comedy special arc**
- Powered by the **Claude/Anthropic API** (user pastes their own API key)

---

## 📈 Analytics
Charts and stats including:
- Show scores over time
- Performance by joke category (Tech, Travel, Dating, etc.)
- Heatmap by day of week
- Joke ranking table

---

## 📅 Show History
Log every show. Track venue, date, set length, overall rating, and how each individual joke landed with the crowd. Brooks analyzes patterns across shows.

---

## 🕰️ Version History
See all versions of a specific joke over time, with a "diff view" showing exactly what changed between versions.

---

## ⚙️ Settings
- Profile
- Subscription plan
- Notifications
- Brooks AI API key setup
- Mobile sync
- Data export
- Keyboard shortcuts

---

## 🏗️ Technical Notes
- **Single file app** — entire app lives in one `index.html` file
- Runs entirely in the browser (no install needed)
- Backend: **Supabase** (auth + database)
- AI: **Anthropic Claude API** (called directly from browser)
- Dark mode supported
- Mobile responsive
