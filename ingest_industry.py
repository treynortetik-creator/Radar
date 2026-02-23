#!/usr/bin/env python3
"""
Industry News ingestion pipeline for CompetitorRadar (Pipeline B).

Run:
  python ingest_industry.py
  python ingest_industry.py --dry-run

Railway Cron (UTC):
  0 */6 * * *   # every 6 hours (recommended)
"""

import argparse
import hashlib
import json
import os
import re
import time
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from html import unescape
from pathlib import Path
from typing import Any
from urllib.parse import urljoin

import feedparser
import requests

OPENROUTER_MODEL = "google/gemini-2.0-flash-001"
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "") or os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "") or os.environ.get("SUPABASE_KEY", "")

CONTEXT_PATH = Path(__file__).parent / "SafelyYou_Industry_Context.md"

FEEDS = [
    ("McKnight's Senior Living", "https://www.mcknightsseniorliving.com/feed/"),
    ("Senior Housing News", "https://seniorhousingnews.com/feed/"),
    ("LeadingAge", "https://leadingage.org/feed/"),
    ("Argentum", "https://www.argentum.org/feed/"),
    ("McKnight's LTC News", "https://www.mcknightsltc.com/feed/"),
]

VALID_TIERS = {"Major", "Notable", "Background"}


def strip_html(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r"<[^>]+>", " ", text)
    text = unescape(text)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:3000]


def url_hash(url: str) -> str:
    return hashlib.sha256(url.strip().lower().encode("utf-8")).hexdigest()[:32]


def parse_date(entry: dict[str, Any]) -> str:
    parsed = entry.get("published_parsed") or entry.get("updated_parsed")
    if parsed:
        try:
            dt = datetime(*parsed[:6], tzinfo=timezone.utc)
            return dt.isoformat()
        except Exception:
            pass

    raw = entry.get("published") or entry.get("updated")
    if raw:
        try:
            dt = parsedate_to_datetime(raw)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(timezone.utc).isoformat()
        except Exception:
            pass

    return datetime.now(timezone.utc).isoformat()


def load_industry_context() -> str:
    try:
        return CONTEXT_PATH.read_text(encoding="utf-8")
    except Exception as err:
        print(f"⚠️  Could not load SafelyYou_Industry_Context.md: {err}")
        return (
            "SafelyYou is an AI fall detection company focused on memory care and assisted living. "
            "Prioritize regulatory changes, REIT/operator moves, and customer-impacting developments."
        )


def fetch_feed(source_name: str, feed_url: str) -> list[dict[str, str]]:
    print(f"  📡 Fetching {source_name}...")
    try:
        parsed = feedparser.parse(feed_url)
        if parsed.bozo and not parsed.entries:
            print(f"    ⚠️  Feed parse warning: {parsed.bozo_exception}")
            return []

        items: list[dict[str, str]] = []
        for entry in parsed.entries:
            raw_url = str(entry.get("link", "")).strip()
            if not raw_url:
                continue

            normalized_url = urljoin(feed_url, raw_url)
            title = strip_html(str(entry.get("title", "Untitled")))
            summary_raw = entry.get("summary") or entry.get("description") or ""
            summary = strip_html(str(summary_raw))

            items.append(
                {
                    "url_hash": url_hash(normalized_url),
                    "title": title,
                    "url": normalized_url,
                    "summary": summary,
                    "published_at": parse_date(entry),
                    "source_name": source_name,
                    "feed_url": feed_url,
                }
            )

        print(f"    ✅ Got {len(items)} items")
        return items
    except Exception as err:
        print(f"    ❌ Feed error: {err}")
        return []


def supabase_headers() -> dict[str, str]:
    return {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }


def get_existing_hashes(hashes: list[str]) -> set[str]:
    if not hashes:
        return set()

    found: set[str] = set()
    batch_size = 50
    endpoint = f"{SUPABASE_URL}/rest/v1/industry_news"
    headers = supabase_headers()

    for i in range(0, len(hashes), batch_size):
        batch = hashes[i : i + batch_size]
        params = {
            "select": "url_hash",
            "url_hash": f"in.({','.join(batch)})",
        }

        try:
            resp = requests.get(endpoint, headers=headers, params=params, timeout=20)
            if not resp.ok:
                print(f"    ⚠️  Dedupe query failed: {resp.status_code} {resp.text[:180]}")
                continue
            rows = resp.json()
            for row in rows:
                existing = row.get("url_hash")
                if existing:
                    found.add(existing)
        except Exception as err:
            print(f"    ⚠️  Dedupe query exception: {err}")

    return found


def default_score(item: dict[str, str]) -> dict[str, Any]:
    return {
        "relevance_tier": "Background",
        "relevance_summary": (
            f"General industry context from {item.get('source_name', 'source')}. "
            "No immediate SafelyYou action identified."
        ),
        "topics": [],
        "mentioned_accounts": [],
    }


def score_item(item: dict[str, str], industry_context: str) -> dict[str, Any]:
    fallback = default_score(item)
    if not OPENROUTER_API_KEY:
        print("    ⚠️  OPENROUTER_API_KEY not set; using fallback scoring")
        return fallback

    prompt = f"""
You are scoring senior living industry news for SafelyYou relevance.
Use the context to classify each article into exactly one tier: Major, Notable, or Background.

Return STRICT JSON with keys:
{{
  "relevance_tier": "Major|Notable|Background",
  "relevance_summary": "1-2 sentences, specific to SafelyYou",
  "topics": ["lowercase-topic-tags"],
  "mentioned_accounts": ["account names mentioned in article"]
}}

SafelyYou Industry Context:
{industry_context[:30000]}

Article:
Title: {item["title"]}
Source: {item["source_name"]}
URL: {item["url"]}
Published: {item["published_at"]}
Summary: {item["summary"][:2000]}
"""

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
                "max_tokens": 600,
            },
            timeout=45,
        )

        if not resp.ok:
            print(f"    ⚠️  OpenRouter error: {resp.status_code} {resp.text[:180]}")
            return fallback

        data = resp.json()
        content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        json_match = re.search(r"\{[\s\S]*\}", content)
        if not json_match:
            print("    ⚠️  No JSON in model response; using fallback")
            return fallback

        parsed = json.loads(json_match.group(0))
        tier = str(parsed.get("relevance_tier", "Background")).strip().title()
        if tier not in VALID_TIERS:
            tier = "Background"

        summary = str(parsed.get("relevance_summary", "")).strip()
        if not summary:
            summary = fallback["relevance_summary"]
        summary = summary[:500]

        raw_topics = parsed.get("topics", [])
        topics = [str(t).strip()[:60] for t in raw_topics if str(t).strip()] if isinstance(raw_topics, list) else []
        topics = topics[:20]

        raw_accounts = parsed.get("mentioned_accounts", [])
        accounts = (
            [str(a).strip()[:120] for a in raw_accounts if str(a).strip()]
            if isinstance(raw_accounts, list)
            else []
        )
        accounts = accounts[:20]

        return {
            "relevance_tier": tier,
            "relevance_summary": summary,
            "topics": topics,
            "mentioned_accounts": accounts,
        }
    except Exception as err:
        print(f"    ⚠️  Scoring exception: {err}")
        return fallback


def insert_item(item: dict[str, Any], dry_run: bool = False) -> bool:
    if dry_run:
        return True

    endpoint = f"{SUPABASE_URL}/rest/v1/industry_news?on_conflict=url_hash"
    headers = supabase_headers()
    headers["Prefer"] = "resolution=merge-duplicates"

    try:
        resp = requests.post(endpoint, headers=headers, json=item, timeout=20)
        if resp.status_code in (200, 201):
            return True
        if resp.status_code == 409:
            return False
        print(f"    ⚠️  Insert failed: {resp.status_code} {resp.text[:180]}")
        return False
    except Exception as err:
        print(f"    ⚠️  Insert exception: {err}")
        return False


def run(dry_run: bool = False) -> None:
    print("🚀 Industry News Ingestion Pipeline")
    print(f"   Mode: {'DRY RUN' if dry_run else 'LIVE'}")
    print(f"   Model: {OPENROUTER_MODEL}")
    print()

    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        print("❌ Missing Supabase env vars (NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)")
        print("   Exiting without crash.")
        return

    industry_context = load_industry_context()

    print("═══ Step 1: Fetch feeds ═══")
    all_items: list[dict[str, str]] = []
    seen_hashes: set[str] = set()

    for source_name, feed_url in FEEDS:
        feed_items = fetch_feed(source_name, feed_url)
        for item in feed_items:
            if item["url_hash"] in seen_hashes:
                continue
            seen_hashes.add(item["url_hash"])
            all_items.append(item)

    print(f"\n  📦 Total fetched: {len(all_items)}")
    if not all_items:
        print("\n✅ No items fetched. Done.")
        return

    print("\n═══ Step 2: Deduplicate against industry_news ═══")
    existing = get_existing_hashes([item["url_hash"] for item in all_items])
    new_items = [item for item in all_items if item["url_hash"] not in existing]
    print(f"  🆕 New items: {len(new_items)} (skipped {len(all_items) - len(new_items)} duplicates)")

    if not new_items:
        print("\n✅ No new items to process. Done.")
        return

    print(f"\n═══ Step 3: AI relevance scoring ({len(new_items)} items) ═══")
    scored_items: list[dict[str, Any]] = []
    tier_counts = {"Major": 0, "Notable": 0, "Background": 0}

    for idx, item in enumerate(new_items, start=1):
        print(f"  [{idx}/{len(new_items)}] {item['title'][:90]}")
        scores = score_item(item, industry_context)
        merged = {**item, **scores}
        tier_counts[merged["relevance_tier"]] += 1
        scored_items.append(merged)
        time.sleep(0.3)

    print("\n═══ Step 4: Store in Supabase ═══")
    stored = 0
    for item in scored_items:
        if insert_item(item, dry_run=dry_run):
            stored += 1

    if dry_run:
        print("  🧪 Dry run enabled; no database writes performed")
    else:
        print(f"  💾 Stored {stored} rows in industry_news")

    print(f"\n{'═' * 52}")
    print("✅ Pipeline complete")
    print(f"   Fetched: {len(all_items)} | New: {len(new_items)} | Stored: {stored}")
    print(
        f"   Tiers: Major={tier_counts['Major']} | "
        f"Notable={tier_counts['Notable']} | Background={tier_counts['Background']}"
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest and score industry RSS feeds for Radar.")
    parser.add_argument("--dry-run", action="store_true", help="Score items but skip database writes.")
    args = parser.parse_args()

    try:
        run(dry_run=args.dry_run)
    except Exception as err:
        print(f"❌ Pipeline error: {err}")
        print("   Exiting gracefully.")
