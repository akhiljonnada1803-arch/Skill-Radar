import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(backend_dir))

from app.core.database import SessionLocal
from app.models import Skill, ChapterTask

TASKS_CATALOG = [
    {
        "skill_slug": "expo-react-native",
        "title": "Mission 01: Build a Live Telemetry Ping Component",
        "description": "Construct a responsive React Native telemetry card with status indicator, animated ping pulse, and error boundary.",
        "instructions_md": """### Objective
Develop a production-grade React Native component `TelemetryCard` that renders an active telemetry status feed.

### Technical Requirements
1. **Component Signature**: Export a default function `TelemetryCard(props)`.
2. **Defensive Error Handling**: Wrap data decoding in a `try/catch` block and display a fallback `<Text>` component on error.
3. **Loading & Empty State**: Render an `<ActivityIndicator>` when `loading` prop is true.
4. **Theme Tokens**: Apply high-contrast colors (`#FFF8F7` canvas, `#440001` deep crimson header, `#58413F` secondary).

### Acceptance Criteria
- Catches null/undefined telemetry inputs without crashing.
- Renders status label ("SYSLINK ONLINE // NODE 09") and ping latency.""",
        "starter_code": """import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

export default function TelemetryCard({ telemetryData, isLoading }) {
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      if (!telemetryData) {
        throw new Error('Telemetry stream unavailable');
      }
    } catch (err) {
      setError(err.message);
    }
  }, [telemetryData]);

  if (isLoading) {
    return <ActivityIndicator size="small" color="#440001" />;
  }

  if (error) {
    return (
      <View style={styles.errorBox}>
        <Text style={styles.errorText}>TELEMETRY FAULT: {error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>SYSLINK ONLINE // NODE 09</Text>
      <Text style={styles.latency}>LATENCY: {telemetryData?.latency || '14ms'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, backgroundColor: '#FFF0EF', borderRadius: 8, borderWidth: 1, borderColor: '#DFBFBB' },
  title: { fontSize: 13, fontWeight: '800', color: '#440001', letterSpacing: 0.5 },
  latency: { fontSize: 11, color: '#58413F', marginTop: 4 },
  errorBox: { padding: 12, backgroundColor: '#FFE5E5', borderRadius: 8 },
  errorText: { fontSize: 12, color: '#BA1A1A', fontWeight: '600' }
});""",
        "rubric": [
            {"criterion": "Defensive State & Error Boundaries", "weight": 40, "description": "Catches unhandled exceptions and shows fallback UI"},
            {"criterion": "Component Hierarchy & Styling Tokens", "weight": 35, "description": "Uses clean StyleSheet and appropriate typography"},
            {"criterion": "Code Quality & Modularity", "weight": 25, "description": "Follows clean functional component practices"}
        ],
        "difficulty": "intermediate"
    },
    {
        "skill_slug": "rag-basics",
        "title": "Mission 02: Dense Vector Chunk Retrieval & Ranking",
        "description": "Implement a Python vector ranking module calculating cosine similarity to retrieve top-k context passages.",
        "instructions_md": """### Objective
Implement a Python retrieval utility `rank_chunks(query_vector, chunks_with_embeddings, top_k=3)` that computes cosine similarity between a user query vector and candidate chunk embeddings.

### Technical Requirements
1. **Math Formula**: Cosine similarity is `(A · B) / (||A|| * ||B||)`.
2. **Defensive Validation**: Validate that vector dimensions match; raise `ValueError` on dimension mismatch.
3. **Threshold Filter**: Filter out chunks with similarity score below `0.65`.
4. **Ordering**: Return chunks sorted in descending order of similarity score.

### Deliverable
A Python function returning a list of dicts: `[{"chunk_id": ..., "text": ..., "score": ...}]`.""",
        "starter_code": """import math

def dot_product(v1, v2):
    return sum(a * b for a, b in zip(v1, v2))

def magnitude(v):
    return math.sqrt(sum(a * a for a in v))

def rank_chunks(query_vec, candidate_chunks, top_k=3, min_threshold=0.65):
    # Implement your cosine similarity and ranking logic below
    results = []
    
    q_mag = magnitude(query_vec)
    if q_mag == 0:
        return []

    for item in candidate_chunks:
        emb = item.get("embedding", [])
        if len(emb) != len(query_vec):
            raise ValueError("Embedding dimension mismatch")
        
        c_mag = magnitude(emb)
        if c_mag == 0:
            continue
            
        sim = dot_product(query_vec, emb) / (q_mag * c_mag)
        if sim >= min_threshold:
            results.append({
                "chunk_id": item["id"],
                "text": item["text"],
                "score": round(sim, 4)
            })

    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:top_k]""",
        "rubric": [
            {"criterion": "Mathematical Accuracy & Cosine Formula", "weight": 40, "description": "Correct vector projection and normalization"},
            {"criterion": "Edge-Case Trapping", "weight": 30, "description": "Handles zero magnitude vectors and dimension mismatches"},
            {"criterion": "Sorting & Filtering Logic", "weight": 30, "description": "Threshold filter and top-k descending sort"}
        ],
        "difficulty": "intermediate"
    },
    {
        "skill_slug": "mobile-security-auth",
        "title": "Mission 03: Secure JWT Authorization Header Interceptor",
        "description": "Construct an asynchronous request interceptor that manages access tokens and prevents credential leaks.",
        "instructions_md": """### Objective
Write an HTTP fetch interceptor function `authenticatedFetch(url, options, getToken)` that injects `Authorization: Bearer <token>` while sanitizing headers.

### Technical Requirements
1. If token is absent, reject or throw an `UnauthorizedException`.
2. Never send user IDs in URL query parameters.
3. Automatically attach `Content-Type: application/json`.
4. Trap network timeouts with a 10-second rejection boundary.""",
        "starter_code": """export async function authenticatedFetch(url, options = {}, getToken) {
  const token = await getToken();
  if (!token) {
    throw new Error('Authentication required: no active access token');
  }

  // AGENTS.md Rule 19: Never pass user_id in query string
  const parsedUrl = new URL(url);
  if (parsedUrl.searchParams.has('user_id')) {
    throw new Error('Security Violation: user_id must not be exposed in query string');
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...(options.headers || {})
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal
    });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}""",
        "rubric": [
            {"criterion": "Security & Header Injection", "weight": 40, "description": "Injects bearer token without query param exposure"},
            {"criterion": "Timeout & Cancellation Boundaries", "weight": 35, "description": "Uses AbortController for deterministic timeout"},
            {"criterion": "Clean Error Signalling", "weight": 25, "description": "Throws descriptive errors for unauthenticated states"}
        ],
        "difficulty": "advanced"
    },
    {
        "skill_slug": "prompt-engineering",
        "title": "Mission 04: Structured In-Context Few-Shot Specimen Classifier",
        "description": "Engineer a robust system prompt and schema contract that enforces zero-hallucination JSON extraction.",
        "instructions_md": """### Objective
Design an LLM prompt template that extracts technical discoveries from research paper abstracts into a strict schema.

### Technical Requirements
1. Specify explicit system instruction enforcing valid JSON only.
2. Provide two clear few-shot input/output examples.
3. Require specific keys: `category`, `confidence_score` (0.0-1.0), `evidence_summary`.
4. Enforce defensive guardrails: if text is non-technical, output `{"category": "unclassified", "confidence_score": 0.0}`.""",
        "starter_code": """SYSTEM_PROMPT = \"\"\"You are an automated research telemetry extractor.
Your job is to read candidate computer science paper abstracts and classify them into strict telemetry categories.
You must return only valid JSON matching this exact schema:
{
  "category": "string (AI Systems, Compilers, Kernel, Distributed, or unclassified)",
  "confidence_score": float (between 0.0 and 1.0),
  "evidence_summary": "1-2 sentence evidence statement"
}

Rule: If the input text is non-technical or lacks evidence, return category "unclassified" with confidence 0.0.
\"\"\"

def build_extraction_prompt(abstract_text):
    return f"{SYSTEM_PROMPT}\\n\\nABSTRACT TO CLASSIFY:\\n{abstract_text}\\n\\nJSON RESULT:\"""",
        "rubric": [
            {"criterion": "Schema Strictness & Guardrails", "weight": 40, "description": "Prevents hallucinated JSON formatting errors"},
            {"criterion": "Edge-Case Classification", "weight": 30, "description": "Includes fallback for non-technical or ambiguous abstracts"},
            {"criterion": "In-Context Prompt Design", "weight": 30, "description": "Clear role definition and explicit few-shot boundaries"}
        ],
        "difficulty": "beginner"
    }
]

def seed_chapter_tasks():
    db = SessionLocal()
    try:
        print("--- Seeding Chapter Missions for Mastery Learning ---")
        seeded = 0
        for task_def in TASKS_CATALOG:
            skill = db.query(Skill).filter_by(slug=task_def["skill_slug"]).first()
            if not skill:
                print(f"Skill '{task_def['skill_slug']}' not found in DB, skipping.")
                continue

            existing = db.query(ChapterTask).filter_by(skill_id=skill.id).first()
            if not existing:
                task = ChapterTask(
                    skill_id=skill.id,
                    title=task_def["title"],
                    description=task_def["description"],
                    instructions_md=task_def["instructions_md"],
                    starter_code=task_def["starter_code"],
                    rubric=task_def["rubric"],
                    difficulty=task_def["difficulty"]
                )
                db.add(task)
                seeded += 1
                print(f"[+] Created Task: '{task.title}' for chapter '{skill.name}'")
            else:
                existing.title = task_def["title"]
                existing.description = task_def["description"]
                existing.instructions_md = task_def["instructions_md"]
                existing.starter_code = task_def["starter_code"]
                existing.rubric = task_def["rubric"]
                print(f"[*] Updated Task: '{existing.title}' for chapter '{skill.name}'")

        db.commit()
        print(f"\nAll chapter tasks seeded successfully ({seeded} new missions created).")
    finally:
        db.close()

if __name__ == "__main__":
    seed_chapter_tasks()
