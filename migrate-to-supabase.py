#!/usr/bin/env python3
"""
Migrate existing SQLite data to Supabase.
Run once after setting up the Supabase project and schema.

Usage:
    export SUPABASE_URL=https://your-project.supabase.co
    export SUPABASE_KEY=your-service-role-key
    python migrate-to-supabase.py
"""

import os
import sys
import sqlite3
import json

try:
    from supabase import create_client, Client
except ImportError:
    print("Install supabase-py: pip install supabase")
    sys.exit(1)

SQLITE_PATH = os.path.join(os.path.dirname(__file__), '..', 'competitor_radar.db')
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_KEY')  # Use service role key for migration

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Set SUPABASE_URL and SUPABASE_KEY environment variables")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Read from SQLite
conn = sqlite3.connect(SQLITE_PATH)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()
cursor.execute("SELECT * FROM competitor_events")
rows = cursor.fetchall()

print(f"Found {len(rows)} events to migrate")

# Convert to dicts and batch insert
batch_size = 50
for i in range(0, len(rows), batch_size):
    batch = []
    for row in rows[i:i+batch_size]:
        d = dict(row)
        # Remove SQLite auto-increment id, let Supabase assign
        d.pop('id', None)
        # Convert boolean fields
        d['is_job_board'] = bool(d.get('is_job_board', 0))
        d['synced_to_sheet'] = bool(d.get('synced_to_sheet', 0))
        batch.append(d)
    
    result = supabase.table('competitor_events').upsert(batch, on_conflict='url_hash').execute()
    print(f"  Migrated {min(i+batch_size, len(rows))}/{len(rows)} events")

print("Migration complete!")
conn.close()
