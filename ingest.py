#!/usr/bin/env python3
"""
CompetitorRadar — RSS Feed Ingestion & AI Scoring Pipeline

Fetches competitor RSS feeds, scores them via OpenRouter LLM,
stores in SQLite, and appends to Google Sheet.

Usage:
    source .venv/bin/activate
    python ingest.py              # Process all feeds
    python ingest.py --dry-run    # Fetch & score but don't write anywhere
    python ingest.py --feed care  # Only process feeds matching 'care'
"""

import feedparser
import requests
import sqlite3
import hashlib
import json
import subprocess
import sys
import os
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from html import unescape

# ── Configuration ──────────────────────────────────────────────────────────

OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
OPENROUTER_MODEL = "google/gemini-2.0-flash-001"
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

SHEET_ID = "1pF9snpvfmIXtVlzj7ets0zgQtzJH90OjIzFChgTnF-8"
SHEET_RANGE = "Data Sheet!A:M"  # 13 columns A-M
GOG_ACCOUNT = "treynor@safely-you.com"

DB_PATH = Path(__file__).parent / "competitor_radar.db"

# RSS Feeds: (name, competitor, url, is_job_board)
FEEDS = [
    # Content feeds
    ("CarePredict Content", "CarePredict", "https://rss.app/feeds/25jMlxntadAsHFBa.xml", False),
    ("VirtuSense Content", "VirtuSense", "https://rss.app/feeds/Aa9tcMTND8AQIvoO.xml", False),
    ("Sage Content", "Sage", "https://rss.app/feeds/vu4YcycWJ7T4AIHl.xml", False),
    ("Nobi Content", "Nobi", "https://rss.app/feeds/S1kyknW26aHp7taZ.xml", False),
    ("Inspiren Content", "Inspiren", "https://rss.app/feeds/uktPOzvVu1SLfQhp.xml", False),
    ("Amba Content", "Amba", "https://rss.app/feeds/YRFFaPhbqSRpYUw9.xml", False),
    # Job board feeds
    ("Inspiren Jobs", "Inspiren", "https://rss.app/feeds/wZIhbEv4NgneuI9y.xml", True),
    ("Sage Jobs", "Sage", "https://rss.app/feeds/DkJuMn7ntAjjwy8d.xml", True),
    ("Nobi Jobs", "Nobi", "https://rss.app/feeds/IAkb78PdWZJU81uw.xml", True),
]


# ── Database ───────────────────────────────────────────────────────────────

def init_db():
    """Create SQLite database and tables if they don't exist."""
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS competitor_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            url_hash TEXT UNIQUE NOT NULL,
            title TEXT NOT NULL,
            url TEXT NOT NULL,
            summary TEXT,
            published_at TEXT,
            competitor TEXT NOT NULL,
            feed_name TEXT,
            is_job_board BOOLEAN DEFAULT 0,
            -- AI-scored fields
            theme TEXT,
            threat_level INTEGER,
            strategic_relevance INTEGER,
            content_type_weight INTEGER,
            priority_score REAL,
            priority_tier TEXT,
            route_to TEXT,
            key_takeaway TEXT,
            auto_flag_triggers TEXT,
            -- Metadata
            created_at TEXT DEFAULT (datetime('now')),
            synced_to_sheet BOOLEAN DEFAULT 0
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_url_hash ON competitor_events(url_hash)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_competitor ON competitor_events(competitor)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_priority_tier ON competitor_events(priority_tier)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_published ON competitor_events(published_at DESC)")
    conn.commit()
    return conn


def url_hash(url: str) -> str:
    """Generate a stable hash for deduplication."""
    return hashlib.sha256(url.strip().lower().encode()).hexdigest()[:16]


def is_duplicate(conn, hash_val: str) -> bool:
    """Check if URL hash already exists in database."""
    row = conn.execute("SELECT 1 FROM competitor_events WHERE url_hash = ?", (hash_val,)).fetchone()
    return row is not None


# ── RSS Parsing ────────────────────────────────────────────────────────────

def strip_html(text: str) -> str:
    """Remove HTML tags and clean up text."""
    if not text:
        return ""
    text = re.sub(r'<[^>]+>', ' ', text)
    text = unescape(text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text[:2000]  # Cap summary length


def parse_date(entry) -> str:
    """Extract and normalize publication date from RSS entry."""
    if hasattr(entry, 'published_parsed') and entry.published_parsed:
        try:
            dt = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
            return dt.strftime("%Y-%m-%d")
        except Exception:
            pass
    if hasattr(entry, 'published') and entry.published:
        # Try to extract just the date
        match = re.search(r'(\d{4}[-/]\d{1,2}[-/]\d{1,2})', entry.published)
        if match:
            return match.group(1)
        # Try parsing common RSS date formats
        for fmt in ["%a, %d %b %Y %H:%M:%S %Z", "%a, %d %b %Y %H:%M:%S %z"]:
            try:
                dt = datetime.strptime(entry.published.strip(), fmt)
                return dt.strftime("%Y-%m-%d")
            except ValueError:
                continue
    return datetime.now().strftime("%Y-%m-%d")


def fetch_feed(name: str, competitor: str, feed_url: str, is_job: bool):
    """Fetch and parse a single RSS feed. Returns list of item dicts."""
    print(f"  📡 Fetching {name}...")
    try:
        feed = feedparser.parse(feed_url)
        if feed.bozo and not feed.entries:
            print(f"    ⚠️  Feed error: {feed.bozo_exception}")
            return []

        items = []
        for entry in feed.entries:
            title = strip_html(entry.get('title', 'No title'))
            link = entry.get('link', '')
            if not link:
                continue

            summary_raw = entry.get('description', '') or entry.get('summary', '')
            summary = strip_html(summary_raw)

            items.append({
                'title': title,
                'url': link,
                'summary': summary,
                'date': parse_date(entry),
                'competitor': competitor,
                'feed_name': name,
                'is_job_board': is_job,
                'url_hash': url_hash(link),
            })

        print(f"    ✅ Got {len(items)} items")
        return items

    except Exception as e:
        print(f"    ❌ Error: {e}")
        return []


# ── AI Scoring ─────────────────────────────────────────────────────────────

SCORING_PROMPT = """You are a competitive intelligence analyst for SafelyYou.

SAFELYOU CONTEXT (use to inform your analysis):
SafelyYou ($130M+ funded, 800+ communities) is the AI leader in senior living — the ONLY fully ambient fall detection & care platform (no wearables/lanyards). Key products: SafelyYou Halo™ (AI-powered eCall), Safety AI™ (99.25% fall detection, 1 false alarm/2 years), Wellness AI™ (virtual check-ins, wellness scoring), Staffing AI™ (99.99% care measurement accuracy), Insight™ (24/7 clinical team reviewing 100% of incidents). Proof points: 40% fall reduction, 80% ER visit reduction, 4-month payback, 4X ROI, 120+ day LOS increase. Key customers: Sonida, Leisure Care, Avista, Milestone, Maplewood, MorningStar, New Perspective, Merrill Gardens, Cogir, Bickford. Known gap: bathroom monitoring.

COMPETITOR PROFILES:
- Inspiren ($155M funding): Video AI with blurred video, AUGi device, bathroom coverage, two-way audio. Weaknesses: false alarms, blurred video, not HIPAA compliant, staff must wear wearables.
- Sage ($59M): Video + radar nurse call replacement, Sage Detect (launched Jun 2025). Weaknesses: unproven fall detection, no clinical support, manual care tracking.
- Nobi ($29M): Smart lamp with optical fall detection, European focus. Weaknesses: limited placement, no clinical support, no HIPAA.
- Amba (unknown funding): Multi-sensor (sleep mats, motion, door sensors), UK-based. Weaknesses: complex hardware, no human review, no clinical support.
- CarePredict (Series A): Wearable-based (Tempo™) + Vayyar radar, at-home focus. Weaknesses: wearable reliance, limited senior living data.
- VirtuSense: Radar-based fall detection + balance assessment.

Analyze this competitor content and return a JSON object with your assessment.

COMPETITOR: {competitor}
TITLE: {title}
SUMMARY: {summary}
DATE: {date}
IS JOB POSTING: {is_job}

SCORING RUBRIC:

1. **theme** — Pick exactly one:
   Product/Feature, Customer Win, Partnership/Integration, Funding/Corporate, Competitive Attack, Pricing/Packaging, Event/Conference, Thought Leadership, Job Posting

2. **threat_level** (1-3):
   - 1 = Low: General thought leadership, industry commentary, brand awareness, hiring announcements, culture posts, international-only focus, SNF-only focus
   - 2 = Medium: Product/feature announcements, customer wins, partnerships, case studies, funding news, conference presence, awards
   - 3 = High: Direct competitive claims against SafelyYou or incumbent solutions, pricing changes, head-to-head positioning, claims of "first"/"only" in fall detection/eCall/ambient monitoring, bathroom monitoring, voice-activated eCall, mobile app announcements, bundled pricing, staffing AI claims, REIT partnerships

3. **strategic_relevance** (1-3):
   - 1 = Low: Peripheral markets (SNF-only, international-only, hospital focus), unrelated technology
   - 2 = Medium: Adjacent markets (AL/IL general, some overlap), wellness monitoring without fall detection, general senior living tech
   - 3 = High: Core market overlap — memory care, fall detection, eCall, nurse call, ambient monitoring, resident safety, staffing optimization, wellness scoring, bathroom monitoring, wearable-free solutions

4. **content_type_weight** (1-3):
   - 1 = Awareness: Thought leadership, opinions, trends, culture, hiring, general event attendance
   - 2 = Credibility: Customer testimonials, case studies, partnerships, integrations, awards, media coverage, conference speaking
   - 3 = Market Action: Product launches, feature releases, pricing announcements, funding rounds, acquisitions, direct competitive comparisons, expansion announcements, REIT/capital partner deals

5. **auto_flag_triggers** — List any of these found in the content (empty string if none):
   - Direct mention of "SafelyYou"
   - Claims of "first"/"only"/"best" in fall detection, eCall, ambient monitoring, or memory care AI
   - Bathroom monitoring capabilities
   - Voice-activated eCall features
   - Bundled/simplified pricing language
   - Mobile app for caregivers
   - Staffing AI or ambient care tracking claims
   - Mention of Welltower, Ventas, Sabra, or NHI
   - Phrases like "legacy platform", "outdated", "playing catch-up"
   - Customer wins at SafelyYou accounts: Sonida, Leisure Care, Avista, Milestone, Maplewood, MorningStar, New Perspective, Merrill Gardens, Cogir, Bickford

6. **route_to** — Pick one:
   - Marketing: Needs counter-messaging or competitive positioning response
   - Product: Reveals feature gaps, technology capabilities, or integration announcements
   - Sales Enablement: Affects objection handling, competitive talking points, pricing intel, or ROI case studies
   - Leadership: Strategic threat — major funding, REIT relationships, M&A, or direct attacks on SafelyYou
   - Monitor Only: General trends, hiring/culture, international focus, no immediate action needed

7. **key_takeaway** — 1-2 sentences summarizing what SafelyYou should know or do. Reference SafelyYou's positioning as the leading ambient, camera-based, wearable-free fall detection platform for memory care.

Return ONLY valid JSON in this exact format:
{{
  "theme": "...",
  "threat_level": 1,
  "strategic_relevance": 1,
  "content_type_weight": 1,
  "auto_flag_triggers": "",
  "route_to": "...",
  "key_takeaway": "..."
}}"""


def score_item(item: dict) -> dict:
    """Use OpenRouter LLM to score a single item."""
    prompt = SCORING_PROMPT.format(
        competitor=item['competitor'],
        title=item['title'],
        summary=item['summary'][:1500],  # Limit to save tokens
        date=item['date'],
        is_job='Yes' if item['is_job_board'] else 'No',
    )

    try:
        resp = requests.post(
            OPENROUTER_URL,
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": OPENROUTER_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.1,
                "max_tokens": 500,
            },
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()

        content = data['choices'][0]['message']['content']
        # Extract JSON from response (handle markdown code blocks)
        json_match = re.search(r'\{[^{}]*\}', content, re.DOTALL)
        if not json_match:
            print(f"    ⚠️  No JSON in response: {content[:200]}")
            return default_scores(item)

        scores = json.loads(json_match.group())

        # Validate and clamp scores
        threat = max(1, min(3, int(scores.get('threat_level', 1))))
        relevance = max(1, min(3, int(scores.get('strategic_relevance', 1))))
        weight = max(1, min(3, int(scores.get('content_type_weight', 1))))

        # Calculate priority score (average of three scores)
        priority_score = round((threat + relevance + weight) / 3, 1)

        # Assign priority tier
        if priority_score <= 1.6:
            priority_tier = "Low"
        elif priority_score <= 2.3:
            priority_tier = "Medium"
        elif priority_score <= 2.6:
            priority_tier = "High"
        else:
            priority_tier = "Critical"

        # Check auto-flag triggers override
        triggers = scores.get('auto_flag_triggers', '')
        if triggers and triggers.strip():
            priority_tier = "Critical"

        # Validate route_to
        valid_routes = ["Marketing", "Product", "Sales Enablement", "Leadership", "Monitor Only"]
        route = scores.get('route_to', 'Monitor Only')
        if route not in valid_routes:
            route = "Monitor Only"

        # Validate theme
        valid_themes = [
            "Product/Feature", "Customer Win", "Partnership/Integration",
            "Funding/Corporate", "Competitive Attack", "Pricing/Packaging",
            "Event/Conference", "Thought Leadership", "Job Posting"
        ]
        theme = scores.get('theme', 'Thought Leadership')
        if theme not in valid_themes:
            theme = "Thought Leadership"

        return {
            'theme': theme,
            'threat_level': threat,
            'strategic_relevance': relevance,
            'content_type_weight': weight,
            'priority_score': priority_score,
            'priority_tier': priority_tier,
            'route_to': route,
            'key_takeaway': scores.get('key_takeaway', '')[:500],
            'auto_flag_triggers': triggers[:500] if triggers else '',
        }

    except Exception as e:
        print(f"    ❌ Scoring error: {e}")
        return default_scores(item)


def default_scores(item: dict) -> dict:
    """Fallback scores if AI scoring fails."""
    return {
        'theme': 'Job Posting' if item.get('is_job_board') else 'Thought Leadership',
        'threat_level': 1,
        'strategic_relevance': 1,
        'content_type_weight': 1,
        'priority_score': 1.0,
        'priority_tier': 'Low',
        'route_to': 'Monitor Only',
        'key_takeaway': f"{item['competitor']} activity detected. Manual review recommended.",
        'auto_flag_triggers': '',
    }


# ── Google Sheets ──────────────────────────────────────────────────────────

def append_to_sheet(items: list[dict]):
    """Append scored items to Google Sheet at row 2 (pushing existing data down)."""
    if not items:
        return

    print(f"\n📊 Writing {len(items)} items to Google Sheet...")

    for item in items:
        row = [
            item['title'],
            item['url'],
            item['summary'][:500],
            item['date'],
            item['competitor'],
            item['theme'],
            str(item['threat_level']),
            str(item['strategic_relevance']),
            str(item['content_type_weight']),
            item['priority_tier'],
            item['route_to'],
            item['key_takeaway'],
            item['auto_flag_triggers'],
        ]

        # Append to the end of the sheet
        # NOTE: Google Sheets API append always adds to the last data row.
        # The Zapier flow inserted at row 2 (newest first). To replicate that,
        # we'd need batchUpdate + insertDimension which gog CLI doesn't support.
        # For now, new items go to the bottom. Sort by Date desc in the sheet.
        values_json = json.dumps([row])
        cmd = [
            "gog", "sheets", "append", SHEET_ID,
            "Data Sheet!A:M",
            "--values-json", values_json,
            "--insert", "INSERT_ROWS",
            "--account", GOG_ACCOUNT,
        ]

        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
            if result.returncode == 0:
                print(f"  ✅ Sheet: {item['title'][:60]}...")
            else:
                print(f"  ❌ Sheet error: {result.stderr[:200]}")
        except Exception as e:
            print(f"  ❌ Sheet exception: {e}")

        time.sleep(0.5)  # Rate limit


# ── Main Pipeline ──────────────────────────────────────────────────────────

def run(dry_run=False, feed_filter=None):
    """Main ingestion pipeline."""
    print("🚀 CompetitorRadar Ingestion Pipeline")
    print(f"   Mode: {'DRY RUN' if dry_run else 'LIVE'}")
    print(f"   Model: {OPENROUTER_MODEL}")
    print(f"   DB: {DB_PATH}")
    print()

    conn = init_db()

    # Step 1: Fetch all feeds
    print("═══ Step 1: Fetching RSS Feeds ═══")
    all_items = []
    for name, competitor, feed_url, is_job in FEEDS:
        if feed_filter and feed_filter.lower() not in name.lower():
            continue
        items = fetch_feed(name, competitor, feed_url, is_job)
        all_items.extend(items)

    print(f"\n  📦 Total items fetched: {len(all_items)}")

    # Step 2: Deduplicate
    print("\n═══ Step 2: Deduplication ═══")
    new_items = []
    for item in all_items:
        if not is_duplicate(conn, item['url_hash']):
            new_items.append(item)

    print(f"  🆕 New items: {len(new_items)} (skipped {len(all_items) - len(new_items)} dupes)")

    if not new_items:
        print("\n✅ No new items to process. Done!")
        conn.close()
        return

    # Step 3: AI Scoring
    print(f"\n═══ Step 3: AI Scoring ({len(new_items)} items) ═══")
    scored_items = []
    for i, item in enumerate(new_items, 1):
        print(f"  [{i}/{len(new_items)}] Scoring: {item['title'][:70]}...")
        scores = score_item(item)
        item.update(scores)
        scored_items.append(item)
        time.sleep(0.3)  # Rate limit OpenRouter

    # Step 4: Store in SQLite
    print(f"\n═══ Step 4: Storing in SQLite ═══")
    stored = 0
    for item in scored_items:
        try:
            conn.execute("""
                INSERT OR IGNORE INTO competitor_events
                (url_hash, title, url, summary, published_at, competitor, feed_name, is_job_board,
                 theme, threat_level, strategic_relevance, content_type_weight,
                 priority_score, priority_tier, route_to, key_takeaway, auto_flag_triggers)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                item['url_hash'], item['title'], item['url'], item['summary'],
                item['date'], item['competitor'], item['feed_name'], item['is_job_board'],
                item['theme'], item['threat_level'], item['strategic_relevance'],
                item['content_type_weight'], item['priority_score'], item['priority_tier'],
                item['route_to'], item['key_takeaway'], item['auto_flag_triggers'],
            ))
            stored += 1
        except sqlite3.IntegrityError:
            pass  # Duplicate, skip
    conn.commit()
    print(f"  💾 Stored {stored} items in SQLite")

    # Step 5: Write to Google Sheet
    if not dry_run:
        append_to_sheet(scored_items)
        # Mark as synced
        for item in scored_items:
            conn.execute(
                "UPDATE competitor_events SET synced_to_sheet = 1 WHERE url_hash = ?",
                (item['url_hash'],)
            )
        conn.commit()
    else:
        print("\n📊 DRY RUN — Skipping Google Sheet write")

    # Summary
    print(f"\n{'═' * 50}")
    print(f"✅ Pipeline Complete!")
    print(f"   Fetched: {len(all_items)} | New: {len(new_items)} | Stored: {stored}")

    # Show high-priority items
    critical = [i for i in scored_items if i['priority_tier'] in ('Critical', 'High')]
    if critical:
        print(f"\n🔴 High/Critical Priority Items ({len(critical)}):")
        for item in critical:
            print(f"   [{item['priority_tier']}] {item['competitor']}: {item['title'][:60]}")
            print(f"      Route: {item['route_to']} | Threat: {item['threat_level']} | {item['key_takeaway'][:80]}")

    conn.close()


if __name__ == "__main__":
    dry_run = "--dry-run" in sys.argv
    feed_filter = None
    if "--feed" in sys.argv:
        idx = sys.argv.index("--feed")
        if idx + 1 < len(sys.argv):
            feed_filter = sys.argv[idx + 1]

    run(dry_run=dry_run, feed_filter=feed_filter)
