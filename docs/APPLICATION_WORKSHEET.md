# 📋 SKILLRADAR AI — APPLICATION DETAILS & SUBMISSION WORKSHEET

---

## 1. 📌 PROJECT SUMMARY & METADATA

| Field | Detail |
| :--- | :--- |
| **Project Title** | **SkillRadar AI** |
| **Tagline / Catchphrase** | *Discover What's Next. Learn What Matters.* |
| **Category / Track** | AI & Machine Learning • Google Cloud • Education & Developer Tools |
| **GitHub Repository** | [https://github.com/akhiljonnada1803-arch/Skill-Radar](https://github.com/akhiljonnada1803-arch/Skill-Radar) |
| **Primary Branch** | `main` |
| **Backend Architecture** | Containerized FastAPI on **Google Cloud Run** |
| **Database** | Serverless PostgreSQL on **Neon** (22 Relational Tables, JSONB support) |
| **Frontend Client** | **Expo React Native** (Universal: Web + Android + iOS) |
| **Active Telemetry Items** | **184+ Verified Frontier Discoveries** across arXiv, Google News AI, and Lab Releases |
| **Curated Competencies** | **39 Verified Industry Skills** with 132 structured chapters and hands-on AI missions |

---

## 2. 💡 THE ELEVATOR PITCH (EXECUTIVE SUMMARY)

> **SkillRadar AI** is an autonomous engineering telemetry radar and personalized learning companion. It continuously tracks real-time breakthroughs across research papers (arXiv) and frontier releases (Google News AI, Anthropic, OpenAI), breaks down dense academic jargon using **Google Gemini AI** with plain-English definitions and intuitive everyday analogies, attaches unforgeable primary citations, and allows students to slot emerging technologies directly into their personalized, prerequisite-aware study roadmap.

---

## 3. 🎯 THE PROBLEM & MARKET GAP

1. **Information Overload & Noisy Hype**: Computer science and engineering students are bombarded with endless tweets, press releases, and arXiv papers. Sifting signal from hype takes hours every day.
2. **Dense Academic Jargon**: Groundbreaking breakthroughs are locked behind impenetrable academic terminology (*"deterministic safety"*, *"verifiable provenance"*, *"zero-day exploit chaining"*). Learners lack an intuitive conceptual bridge before reading complex news.
3. **The "What Do I Do Next?" Disconnect**: Even when a student reads about a new breakthrough (e.g. React 19 Server Actions or Autonomous Agent Guardrails), they don't know the prerequisites to learn it, which courses to take, or how to build a hands-on project with it.

---

## 4. 🚀 THE SOLUTION & CORE VALUE CHAIN

SkillRadar AI turns raw frontier news into a clear, actionable education journey:

```
[Live Telemetry Streams] ──> [Jargon Buster (Terms Explained First)] ──> [Plain-English Synthesis] ──> [1-Tap Roadmap Enrollment] ──> [Hands-On AI Missions]
 (Google News AI & arXiv)        (Intuitive Real-World Analogies)             (Easy-to-Read Story)            (Prerequisite-Aware Graph)       (File Upload / Code Mission)
```

1. **Notification-Style Chronological Radar**: Shows breaking engineering telemetry sorted latest-first with exact timestamps (`Today at 11:08 AM`) and visual `💡 KEY IMPACT` summary callouts.
2. **Key Terms Explained First (Jargon Buster)**: Prominently displayed *before* the article starts, defining complex technical words in plain English paired with real-world analogies.
3. **Plain-English Synthesis**: Multi-paragraph breakdown of what actually happened, why it matters to developers, and 3 concrete production deployment vectors.
4. **Interactive Curriculum Roadmap**: 1-tap addition of extracted skills into an ordered, chapter-based roadmap with study notes and video briefings.
5. **AI Hands-On Missions**: File-upload project evaluations with deterministic rubric criteria and personalized feedback.

---

## 5. 🛠️ GOOGLE TECHNOLOGIES & CLOUD STACK

| Technology | Implementation Role |
| :--- | :--- |
| **Google Gemini AI (Flash)** | Dynamically ingests raw papers and news articles, demystifies complex terms into analogies, writes student-focused syntheses, and generates chapter study notes. |
| **Google Cloud Run** | Serverless, containerized production host for the FastAPI backend ([Dockerfile](file:///C:/PROJECTS/GDG/SkillRadar/backend/Dockerfile)), featuring auto-scaling from 0 to peak concurrency. |
| **Google Cloud Scheduler** | Automated hourly cron runner triggering serverless telemetry ingestion via secure admin tokens. |
| **Google News RSS Feeds** | Primary live stream for breaking frontier releases and enterprise AI shifts. |
| **FastAPI & Python 3.11+** | High-throughput asynchronous backend with Pydantic v2 validation, JWT authentication, and rate-limiting. |
| **PostgreSQL (Neon)** | Serverless database with native JSONB columns storing 184 enriched discoveries, evidence ledgers, and curriculum chapters. |
| **Expo / React Native** | Cross-platform client with universal Web, Android, and iOS support designed in the Crimson Monolith modern aesthetic. |

---

## 6. 🌟 KEY INNOVATIONS & COMPETITIVE ADVANTAGES

### A. Jargon Buster: Understand Concepts Before Reading
Unlike traditional news aggregators that paste dense paper abstracts, SkillRadar identifies technical buzzwords and explains them **first**:
* **Term**: *Autonomous Agent*
  * *Plain English*: An AI program designed to act like a digital worker that takes multi-step actions on its own rather than just answering questions.
  * *Analogy*: *Like an assistant you give a to-do list and company login to, rather than an encyclopedia you just look things up in.*

### B. Verifiable Evidence Ledger & Anti-Hallucination
* Preserves original canonical URLs, publisher bylines, and publication dates.
* Evidence level starts at `New` and dynamically upgrades to `Emerging` only when corroborated across **2+ distinct, independent publishers**.
* The AI is strictly sandboxed: Gemini synthesizes the story, but backend code attaches and verifies all URLs.

### C. Prerequisite-Aware Topological Roadmap
* Adding an advanced skill (e.g. *"Autonomous Agent Guardrails"*) automatically checks prerequisites (e.g. *"Python for AI"*, *"REST APIs"*) and slots it in the correct chapter sequence using directed graph traversal.

---

## 7. 🎬 STEP-BY-STEP DEMO SCRIPT (FOR JUDGES & REVIEWERS)

1. **Step 1: Domain Calibration**
   - User signs in and selects a domain: **AI Agents & Autonomous Systems**, **Mobile & Edge AI**, or **Full-Stack AI Engineering**.
2. **Step 2: Exploring the Live Telemetry Feed**
   - The user browses the **Discover Radar** tab.
   - Observes exact notification timestamps (`Today at 11:08 AM`), source badges (`Google News AI Live Radar`), and `💡 KEY IMPACT` summary callouts.
3. **Step 3: Opening the Editorial Dossier**
   - The user taps a discovery card (e.g., *Enterprise Software Shift: Building Verifiable Trust in Autonomous Agent Workers*).
   - Observes the **`🧠 TECHNICAL TERMS EXPLAINED FIRST`** card breaking down *Autonomous Agents*, *Deterministic Safety*, and *Verifiable Provenance*.
   - Reads the plain-English story, engineering takeaways, and real-world deployment scenarios.
4. **Step 4: One-Tap Roadmap Enrollment**
   - User taps **`+ Add to My Roadmap`**. The skill is slotted into their curriculum chapters.
5. **Step 5: Hands-on AI Mission**
   - Navigates to the **Roadmap** tab, opens the enrolled chapter, reads the study notes, and views the practical AI mission with rubric evaluation criteria.

---

## 8. 📊 VERIFICATION & QUALITY AUDIT METRICS

- **Backend Test Suite**: **22 of 22 Automated Tests Passing** (`pytest backend/tests`).
- **Mobile Smoke & TypeScript Suite**: **100% Type-Check & Smoke Verification** (`npm test`).
- **Database Scale**: 22 relational tables, 184 active frontier discoveries, 39 curated competencies, 132 syllabus chapters.
- **Security Check**: Bcrypt password hashing, JWT authentication tokens, rate-limited login endpoints, and prompt injection isolation delimiters.
