import sys
import uuid
from datetime import datetime, timezone, date
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(backend_dir))

from app.core.database import SessionLocal
from app.models import (
    Domain, Skill, DomainSkill, SkillLesson, LessonVideo, SkillNote,
    SkillPrerequisite, ChapterTask, Roadmap, RoadmapItem, StudentProfile, User
)

FULLSTACK_CHAPTERS = [
    {
        "position": 0,
        "slug": "modern-javascript",
        "name": "Modern JavaScript (ES6+)",
        "difficulty": "beginner",
        "category": "Frontend & Core",
        "prerequisites": [],
        "overview": "Deep dive into ESNext features, functional array methods, promises, event loop asynchronous execution, and modern module packaging.",
        "video": {
            "title": "JavaScript in 100 Seconds",
            "channel": "Fireship",
            "youtube_id": "DHjqpvDnNGE",
            "verified": True
        },
        "note": """# Modern JavaScript (ES6+) Master Notes

## 1. Asynchronous Control Flow & Event Loop
JavaScript is single-threaded with an event loop that coordinates the call stack, microtask queue (Promises, MutationObserver), and macrotask queue (setTimeout, setInterval).

```javascript
// Microtask vs Macrotask execution order:
console.log('1. Synchronous');
setTimeout(() => console.log('4. Macrotask'), 0);
Promise.resolve().then(() => console.log('2. Microtask 1')).then(() => console.log('3. Microtask 2'));
```

## 2. Destructuring, Rest & Spread
- Destructuring extracts deeply nested properties cleanly.
- Spread operator (`...`) creates shallow copies of objects and arrays.

## 3. Modular ES Modules
Always use native `import` / `export` syntax rather than CommonJS `require` for static analysis and tree-shaking support.""",
        "task": {
            "title": "Mission 01: Async Pipeline & Task Queue with Concurrency Throttling",
            "description": "Construct an asynchronous task runner that processes items in parallel with a strict concurrency limit.",
            "instructions_md": """### Objective
Implement an asynchronous utility class `TaskQueue(concurrency)` that executes promises in parallel while never exceeding the specified concurrency threshold.

### Acceptance Criteria
1. Initialize with an integer concurrency limit (e.g. `concurrency = 2`).
2. Method `add(fn)`: Enqueues an async task returning a promise that resolves when the task finishes.
3. If active tasks < concurrency, start execution immediately; otherwise queue until an active task settles.
4. Catch rejected tasks and propagate the error without deadlocking the queue.""",
            "starter_code": """class TaskQueue {
  constructor(concurrency = 2) {
    this.concurrency = concurrency;
    this.running = 0;
    this.queue = [];
  }

  add(asyncFn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ asyncFn, resolve, reject });
      this._next();
    });
  }

  _next() {
    while (this.running < this.concurrency && this.queue.length > 0) {
      const { asyncFn, resolve, reject } = this.queue.shift();
      this.running++;
      asyncFn()
        .then(resolve)
        .catch(reject)
        .finally(() => {
          this.running--;
          this._next();
        });
    }
  }
}

export default TaskQueue;""",
            "rubric": [
                {"criterion": "Concurrency Throttling & Queueing", "weight": 40, "description": "Accurately enforces concurrency boundaries without race conditions"},
                {"criterion": "Promise Chaining & Rejection Propagation", "weight": 35, "description": "Properly resolves or rejects promises without deadlocking"},
                {"criterion": "Clean ES6 Class Architecture", "weight": 25, "description": "Idiomatic object-oriented implementation"}
            ]
        }
    },
    {
        "position": 1,
        "slug": "typescript-core",
        "name": "TypeScript Core & Static Types",
        "difficulty": "beginner",
        "category": "Frontend & Core",
        "prerequisites": ["modern-javascript"],
        "overview": "Master static typing, generics, discriminated unions, utility types, and strict compiler configurations.",
        "video": {
            "title": "TypeScript in 100 Seconds",
            "channel": "Fireship",
            "youtube_id": "zQnBQ4tB3ZA",
            "verified": True
        },
        "note": """# TypeScript Core & Static Typing

## 1. Discriminated Unions for Safe State
Discriminated unions ensure exhaustive type checking at compile time using a shared discriminant property.

```typescript
type ApiResponse<T> = 
  | { success: true; data: T; timestamp: number }
  | { success: false; error: string; code: number };

function handleResponse<T>(res: ApiResponse<T>) {
  if (res.success) {
    console.log(res.data);
  } else {
    console.error(`Error ${res.code}: ${res.error}`);
  }
}
```

## 2. Generic Functions & Constraints
Generics parameterize types across functions, interfaces, and classes with `extends` constraints.""",
        "task": {
            "title": "Mission 02: Strictly Typed API Client with Generic Response Inference",
            "description": "Construct a TypeScript generic HTTP wrapper with discriminated unions for safe compile-time error handling.",
            "instructions_md": """### Objective
Implement a TypeScript generic function `fetchJson<T>(url: string, options?: RequestInit): Promise<Result<T, ApiError>>`.

### Acceptance Criteria
1. Define a generic discriminated union `Result<T, E> = { ok: true; value: T } | { ok: false; error: E }`.
2. Wrap `fetch` in a `try/catch` block.
3. If response status is 2xx, parse JSON and return `{ ok: true, value: parsedData }`.
4. If response status >= 400 or network fails, return `{ ok: false, error: { message, status } }`.""",
            "starter_code": """export type Result<T, E> = 
  | { ok: true; value: T }
  | { ok: false; error: E };

export interface ApiError {
  message: string;
  status: number;
}

export async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<Result<T, ApiError>> {
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      return {
        ok: false,
        error: { message: `Request failed with status ${res.status}`, status: res.status }
      };
    }
    const value = (await res.json()) as T;
    return { ok: true, value };
  } catch (err: any) {
    return {
      ok: false,
      error: { message: err?.message || 'Network failure', status: 0 }
    };
  }
}""",
            "rubric": [
                {"criterion": "Discriminated Union & Type Inference", "weight": 40, "description": "Correct Result<T, E> definition and type narrowing"},
                {"criterion": "Defensive HTTP Status & Exception Trapping", "weight": 35, "description": "Handles non-2xx responses and network failures gracefully"},
                {"criterion": "Code Modularity & Idiomatic TypeScript", "weight": 25, "description": "Strict compiler compatibility"}
            ]
        }
    },
    {
        "position": 2,
        "slug": "react-fundamentals",
        "name": "React Fundamentals & State Architecture",
        "difficulty": "beginner",
        "category": "Frontend & Core",
        "prerequisites": ["typescript-core"],
        "overview": "Master React component composition, JSX rendering cycles, hooks (useState, useEffect, useMemo), and unidirectional data flow.",
        "video": {
            "title": "React in 100 Seconds",
            "channel": "Fireship",
            "youtube_id": "Tn6-PIqc4UM",
            "verified": True
        },
        "note": """# React Fundamentals & State Management

## 1. Unidirectional Data Flow & State Lifting
In React, state flows downward via props and updates flow upward via callbacks. Never mutate state directly; always create new references.

## 2. Hook Rules & Invariants
- `useState`: Holds component-local state.
- `useEffect`: Encapsulates side effects (subscriptions, I/O, timers). Always clean up subscriptions in return callback.
- `useMemo` / `useCallback`: Memoizes expensive values or function handles across re-renders.""",
        "task": {
            "title": "Mission 03: Multi-Step Form with Custom Hook Validation & State Lifting",
            "description": "Build an interactive multi-step wizard component using custom hooks and lifted state.",
            "instructions_md": """### Objective
Implement a custom React hook `useFormWizard(stepsCount)` and a multi-step form coordinator.

### Acceptance Criteria
1. Hook manages: `currentStep`, `formData`, `errors`, `nextStep()`, `prevStep()`, `setFieldValue(key, val)`.
2. Guardrails: `nextStep()` validates required fields for the current step before advancing.
3. Prevent advancing beyond `stepsCount` or going before step 0.""",
            "starter_code": """import { useState, useCallback } from 'react';

export function useFormWizard(totalSteps, initialData = {}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState(initialData);
  const [errors, setErrors] = useState({});

  const setFieldValue = useCallback((key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setErrors(prev => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  }, []);

  const nextStep = useCallback((validatorFn) => {
    if (validatorFn) {
      const validationErrors = validatorFn(formData);
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return false;
      }
    }
    if (currentStep < totalSteps - 1) {
      setCurrentStep(s => s + 1);
      return true;
    }
    return false;
  }, [currentStep, totalSteps, formData]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(s => s - 1);
    }
  }, [currentStep]);

  return { currentStep, formData, errors, setFieldValue, nextStep, prevStep };
}""",
            "rubric": [
                {"criterion": "Custom Hook Abstraction & Immutability", "weight": 40, "description": "Proper functional setState and useCallback usage"},
                {"criterion": "Step Validation & Guardrails", "weight": 35, "description": "Prevents step advancement when validation errors occur"},
                {"criterion": "Code Modularity & Clean API", "weight": 25, "description": "Intuitive hook signature and return structure"}
            ]
        }
    },
    {
        "position": 3,
        "slug": "rest-api-design",
        "name": "REST API Architecture & Backend Services",
        "difficulty": "intermediate",
        "category": "Backend & Services",
        "prerequisites": ["typescript-core"],
        "overview": "Design robust, versioned RESTful APIs with predictable status codes, pagination, rate limiting, and standard error envelopes.",
        "video": {
            "title": "REST API Concepts and Examples",
            "channel": "Web Dev Simplified",
            "youtube_id": "-MTSQjw5DrM",
            "verified": True
        },
        "note": """# REST API Architecture & Standards

## 1. HTTP Verbs & Semantics
- `GET`: Safe, idempotent read operations.
- `POST`: Non-idempotent resource creation.
- `PUT`: Complete resource replacement (idempotent).
- `PATCH`: Partial resource modification.
- `DELETE`: Resource removal (idempotent).

## 2. Standardized RFC 7807 Problem Details
API errors should follow standard Problem Details JSON envelopes:
```json
{
  "type": "https://api.skillradar.tech/errors/invalid-credentials",
  "title": "Invalid Credentials",
  "status": 401,
  "detail": "The provided password does not match the registered cadet cipher key.",
  "instance": "/api/v1/auth/login"
}
```""",
        "task": {
            "title": "Mission 04: Production REST Endpoint with RFC-7807 Error Envelope & Pagination",
            "description": "Construct a REST endpoint handler supporting limit/offset pagination and standard RFC-7807 error envelopes.",
            "instructions_md": """### Objective
Implement a RESTful API handler `handleGetItems(req, res, db)` with cursor/offset pagination, query filtering, and RFC 7807 error responses.

### Acceptance Criteria
1. Parse query params `limit` (max 50, default 10) and `offset` (min 0).
2. Return metadata header: `{ "items": [...], "total": 120, "page": 1, "limit": 10 }`.
3. If invalid query params passed, respond with HTTP 400 and RFC 7807 envelope (`{ type, title, status, detail }`).""",
            "starter_code": """export function handleGetItems(query, itemsDatabase) {
  const limit = Math.min(50, Math.max(1, parseInt(query.limit) || 10));
  const offset = Math.max(0, parseInt(query.offset) || 0);

  if (isNaN(limit) || isNaN(offset)) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/problem+json' },
      body: {
        type: 'https://api.skillradar.tech/errors/bad-query',
        title: 'Bad Request',
        status: 400,
        detail: 'Query parameter limit and offset must be non-negative integers.'
      }
    };
  }

  const paginated = itemsDatabase.slice(offset, offset + limit);
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: {
      items: paginated,
      total: itemsDatabase.length,
      offset,
      limit
    }
  };
}""",
            "rubric": [
                {"criterion": "RFC-7807 Problem Details Specification", "weight": 40, "description": "Accurately structures error payload with type, title, status, detail"},
                {"criterion": "Pagination & Query Bounds Validation", "weight": 35, "description": "Caps maximum page size and validates inputs"},
                {"criterion": "Code Quality & Clean Handlers", "weight": 25, "description": "Clean modular design"}
            ]
        }
    },
    {
        "position": 4,
        "slug": "sql",
        "name": "Relational Databases & SQL with PostgreSQL",
        "difficulty": "intermediate",
        "category": "Backend & Services",
        "prerequisites": ["rest-api-design"],
        "overview": "Master relational database schema design, normalization, ACID transactions, foreign keys, and index optimization.",
        "video": {
            "title": "PostgreSQL in 100 Seconds",
            "channel": "Fireship",
            "youtube_id": "n2Fluyr3lbc",
            "verified": True
        },
        "note": """# PostgreSQL & Relational Database Architecture

## 1. Relational Integrity & Normalization
- Primary Keys: Globally unique identifiers (`UUIDv4` or auto-incrementing serials).
- Foreign Keys with CASCADE: `ON DELETE CASCADE` or `ON DELETE SET NULL`.
- Unique Constraints: Prevent duplicate records at database level.

## 2. B-Tree Indexes & Query Optimization
Indexes speed up `WHERE` filtering, joins, and sorting at the cost of additional write overhead:
```sql
CREATE INDEX idx_roadmap_items_pos ON roadmap_items (roadmap_id, position);
```""",
        "task": {
            "title": "Mission 05: Normalized PostgreSQL Schema & Efficient Index Query Design",
            "description": "Design a normalized database schema with foreign key constraints, composite index, and aggregation query.",
            "instructions_md": """### Objective
Write SQL DDL and a reporting query for an operative skill progress tracker.

### Acceptance Criteria
1. Create table `cadet_enrollments` referencing `users(id)` and `domains(id)` with composite uniqueness.
2. Add a composite index on `(user_id, enrolled_at)`.
3. Write an aggregation query computing completion percentage grouped by domain.""",
            "starter_code": """-- 1. Create cadet_enrollments table
CREATE TABLE cadet_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    CONSTRAINT uq_cadet_domain UNIQUE (user_id, domain_id)
);

-- 2. Compound index for fast queries
CREATE INDEX idx_enrollments_user_date ON cadet_enrollments (user_id, enrolled_at DESC);

-- 3. Reporting aggregation query
SELECT 
    d.name AS domain_name,
    COUNT(e.id) AS total_enrolled,
    COUNT(CASE WHEN e.status = 'completed' THEN 1 END) AS total_graduated,
    ROUND((COUNT(CASE WHEN e.status = 'completed' THEN 1 END)::numeric / NULLIF(COUNT(e.id), 0)) * 100, 2) AS completion_percentage
FROM domains d
LEFT JOIN cadet_enrollments e ON e.domain_id = d.id
GROUP BY d.id, d.name
ORDER BY total_enrolled DESC;""",
            "rubric": [
                {"criterion": "Relational Constraints & Foreign Keys", "weight": 40, "description": "Proper primary key, foreign key, and unique constraint definitions"},
                {"criterion": "B-Tree Compound Indexing", "weight": 30, "description": "Correct column ordering for index lookups"},
                {"criterion": "Aggregation & NULL-Safe Reporting Query", "weight": 30, "description": "Handles division by zero with NULLIF and aggregates correctly"}
            ]
        }
    },
    {
        "position": 5,
        "slug": "expo-react-native",
        "name": "Expo & React Native Mobile Engineering",
        "difficulty": "intermediate",
        "category": "Mobile & Frontend",
        "prerequisites": ["react-fundamentals"],
        "overview": "Build cross-platform mobile apps using React Native and Expo Router, targeting native Android and iOS devices.",
        "video": {
            "title": "React Native in 100 Seconds",
            "channel": "Fireship",
            "youtube_id": "gvkqT_UoVDw",
            "verified": True
        },
        "note": """# Expo & React Native Architecture

## 1. Native Primitives vs Web DOM
React Native bridges JSX to native platform widgets (`android.widget.TextView`, `UILabel`) rather than browser HTML elements:
- `<div>` -> `<View>`
- `<p>`, `<span>` -> `<Text>`
- `<img>` -> `<Image>`
- `<button>` -> `<TouchableOpacity>` or `<Pressable>`

## 2. Flexbox Differences
In React Native:
- `flexDirection` defaults to `column` (not `row`).
- All dimensions are unitless density-independent pixels (dp).""",
        "task": {
            "title": "Mission 06: Build a Live Telemetry Ping Component",
            "description": "Construct a responsive React Native telemetry card with status indicator, animated ping pulse, and error boundary.",
            "instructions_md": """### Objective
Develop a production-grade React Native component `TelemetryCard` that renders an active telemetry status feed.

### Technical Requirements
1. Export a default function `TelemetryCard(props)`.
2. Wrap data decoding in a `try/catch` block and display fallback UI on error.
3. Render `<ActivityIndicator>` when `loading` prop is true.
4. Apply high-contrast theme styling.""",
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
        <Text style={styles.errorText}>FAULT: {error}</Text>
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
  title: { fontSize: 13, fontWeight: '800', color: '#440001' },
  latency: { fontSize: 11, color: '#58413F', marginTop: 4 },
  errorBox: { padding: 12, backgroundColor: '#FFE5E5', borderRadius: 8 },
  errorText: { fontSize: 12, color: '#BA1A1A', fontWeight: '600' }
});""",
            "rubric": [
                {"criterion": "Defensive State & Error Boundaries", "weight": 40, "description": "Catches unhandled exceptions and shows fallback UI"},
                {"criterion": "Component Hierarchy & Styling Tokens", "weight": 35, "description": "Uses clean StyleSheet and appropriate typography"},
                {"criterion": "Code Quality & Modularity", "weight": 25, "description": "Follows clean functional component practices"}
            ]
        }
    },
    {
        "position": 6,
        "slug": "state-management-tanstack",
        "name": "Server State & TanStack Query Caching",
        "difficulty": "intermediate",
        "category": "Frontend & Core",
        "prerequisites": ["react-fundamentals"],
        "overview": "Eliminate redundant client state using TanStack Query for declarative caching, background refetching, and optimistic mutations.",
        "video": {
            "title": "TanStack Query in 100 Seconds",
            "channel": "Fireship",
            "youtube_id": "r8Dg0KVnfMA",
            "verified": True
        },
        "note": """# TanStack Query & Server State

## 1. Asynchronous Cache Invalidation
TanStack Query manages server cache distinct from client component state. Queries remain cached until invalidated via `queryClient.invalidateQueries({ queryKey })`.

## 2. Optimistic Updates
Optimistic updates modify local cache immediately before server confirmation, rolling back automatically if the network request fails.""",
        "task": {
            "title": "Mission 07: Optimistic Update Mutation with Rollback on Network Rejection",
            "description": "Implement a TanStack Query optimistic mutation hook with automatic rollback upon API failure.",
            "instructions_md": """### Objective
Implement a custom React hook `useOptimisticBookmark()` using TanStack Query `useMutation`.

### Acceptance Criteria
1. `onMutate`: Cancels ongoing queries for `['bookmarks']`, snapshots previous cache state, and optimistically updates cache.
2. `onError`: Reverts cache to the snapshot state and notifies the user.
3. `onSettled`: Re-invalidates `['bookmarks']` to guarantee server sync.""",
            "starter_code": """import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useOptimisticBookmark(apiSaveFn) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: apiSaveFn,
    onMutate: async (newBookmark) => {
      await queryClient.cancelQueries({ queryKey: ['bookmarks'] });
      const previousBookmarks = queryClient.getQueryData(['bookmarks']);

      queryClient.setQueryData(['bookmarks'], (old = []) => [
        ...old,
        { ...newBookmark, id: 'temp-' + Date.now(), isOptimistic: true }
      ]);

      return { previousBookmarks };
    },
    onError: (err, newBookmark, context) => {
      if (context?.previousBookmarks) {
        queryClient.setQueryData(['bookmarks'], context.previousBookmarks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
    }
  });
}""",
            "rubric": [
                {"criterion": "Optimistic Cache Snapshotting", "weight": 40, "description": "Correctly snapshots previous state in onMutate"},
                {"criterion": "Rollback on Exception", "weight": 35, "description": "Restores original cache state in onError handler"},
                {"criterion": "Cache Invalidation & Resynchronization", "weight": 25, "description": "Calls invalidateQueries in onSettled"}
            ]
        }
    },
    {
        "position": 7,
        "slug": "mobile-security-auth",
        "name": "Mobile Security & JWT Auth",
        "difficulty": "advanced",
        "category": "Security & Architecture",
        "prerequisites": ["rest-api-design", "expo-react-native"],
        "overview": "Implement secure authentication flows using JWTs, biometric hardware unlock, encrypted storage, and PKCE OAuth standards.",
        "video": {
            "title": "JWT Authentication in 100 Seconds",
            "channel": "Fireship",
            "youtube_id": "7Q17ubqL20Q",
            "verified": True
        },
        "note": """# Full-Stack Mobile Security & JWT Authentication

## 1. JWT Security & Header Storage
- Access tokens belong in `Authorization: Bearer <token>` HTTP headers.
- Never place session tokens in query parameters or URL paths.
- On mobile devices, store tokens in hardware-encrypted keystores (`Expo SecureStore` or `AsyncStorage` with keychain backing).""",
        "task": {
            "title": "Mission 08: Secure JWT Authorization Header Interceptor",
            "description": "Construct an asynchronous request interceptor that manages access tokens and prevents credential leaks.",
            "instructions_md": """### Objective
Write an HTTP fetch interceptor function `authenticatedFetch(url, options, getToken)` that injects `Authorization: Bearer <token>` while sanitizing headers.

### Acceptance Criteria
1. If token is absent, throw an `Authentication required` exception.
2. Reject queries exposing `user_id` in URL parameters.
3. Automatically attach `Content-Type: application/json`.
4. Wrap in timeout cancellation boundary.""",
            "starter_code": """export async function authenticatedFetch(url, options = {}, getToken) {
  const token = await getToken();
  if (!token) {
    throw new Error('Authentication required: no active access token');
  }

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
            ]
        }
    },
    {
        "position": 8,
        "slug": "offline-first-sync",
        "name": "Offline-First Synchronization",
        "difficulty": "advanced",
        "category": "Mobile & Frontend",
        "prerequisites": ["expo-react-native", "state-management-tanstack"],
        "overview": "Architect applications that function seamlessly without an internet connection using local SQLite and conflict resolution.",
        "video": {
            "title": "Offline-First Architecture & Sync",
            "channel": "Google Chrome Developers",
            "youtube_id": "rA_c9pS90mE",
            "verified": True
        },
        "note": """# Offline-First Synchronization & Outbox Patterns

## 1. Outbox Pattern
When the client is offline:
1. Append mutation to local persistent queue (outbox) with pending status and timestamp.
2. Update local UI optimistically.
3. When network connectivity resumes, drain outbox sequentially in order of creation.

## 2. Conflict Resolution
Last-Write-Wins (LWW) compares UTC timestamps: highest timestamp overrides earlier writes.""",
        "task": {
            "title": "Mission 09: Outbox Queue & Conflict Reconciliation Engine",
            "description": "Construct an offline outbox synchronization manager with timestamp-based conflict reconciliation.",
            "instructions_md": """### Objective
Implement an `OfflineOutboxSync` class that queues mutations when offline and drains them upon reconnection.

### Acceptance Criteria
1. Method `enqueueMutation(mutation)`: Saves mutation with payload, timestamp, and unique ID.
2. Method `drainOutbox(apiHandler)`: Sequentially executes queued actions; removes succeeded items; halts on fatal errors.
3. Reconcile conflicts using Last-Write-Wins logic.""",
            "starter_code": """class OfflineOutboxSync {
  constructor(storageAdapter) {
    this.storage = storageAdapter;
    this.isSyncing = false;
  }

  async enqueueMutation(actionType, payload) {
    const queue = (await this.storage.getItem('outbox_queue')) || [];
    const item = {
      id: 'mut_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      actionType,
      payload,
      timestamp: Date.now()
    };
    queue.push(item);
    await this.storage.setItem('outbox_queue', queue);
    return item;
  }

  async drainOutbox(apiExecutor) {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      let queue = (await this.storage.getItem('outbox_queue')) || [];
      const remaining = [];

      for (const item of queue) {
        try {
          await apiExecutor(item);
        } catch (err) {
          remaining.push(item);
          break; // Stop draining on connection disruption
        }
      }

      await this.storage.setItem('outbox_queue', remaining);
    } finally {
      this.isSyncing = false;
    }
  }
}

export default OfflineOutboxSync;""",
            "rubric": [
                {"criterion": "Outbox Queue Immutability & Persistence", "weight": 40, "description": "Correctly serializes and preserves action queue"},
                {"criterion": "Sequential Drain & Disruption Tolerance", "weight": 35, "description": "Halts drain on network error without dropping mutations"},
                {"criterion": "Clean Architecture & Lock Safety", "weight": 25, "description": "Guards against concurrent drain cycles"}
            ]
        }
    },
    {
        "position": 9,
        "slug": "docker-containers",
        "name": "Docker & Production Cloud Containerization",
        "difficulty": "advanced",
        "category": "Backend & Cloud",
        "prerequisites": ["rest-api-design"],
        "overview": "Package full-stack backends and frontends into lightweight, reproducible multi-stage Docker containers for cloud deployment.",
        "video": {
            "title": "Docker in 100 Seconds",
            "channel": "Fireship",
            "youtube_id": "Gjnup-PuquQ",
            "verified": True
        },
        "note": """# Docker & Container Architecture

## 1. Multi-Stage Builds
Multi-stage Docker builds separate build dependencies (compilers, npm packages) from production runtime artifacts, shrinking image size by up to 90%.

## 2. Principle of Least Privilege
Always specify a non-root user (`USER node` or `USER appuser`) to minimize host escalation vulnerability.""",
        "task": {
            "title": "Mission 10: Multi-Stage Dockerfile & Production Cloud Container Configuration",
            "description": "Author an optimized multi-stage Dockerfile for a production Node/Python web application.",
            "instructions_md": """### Objective
Write a production-grade multi-stage `Dockerfile` for a web service.

### Acceptance Criteria
1. Stage 1: Build stage installing dev dependencies and compiling code.
2. Stage 2: Minimal runtime image copying only build artifacts and production dependencies.
3. Specify non-root user (`USER node` or equivalent).
4. Include explicit `HEALTHCHECK` instruction testing HTTP endpoint.""",
            "starter_code": """# Stage 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Security: Run as non-root user
USER node

COPY --chown=node:node package*.json ./
RUN npm ci --only=production
COPY --chown=node:node --from=builder /app/dist ./dist

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \\
  CMD wget --no-verbose --tries=1 --spider http://localhost:8000/api/v1/health || exit 1

CMD ["node", "dist/main.js"]""",
            "rubric": [
                {"criterion": "Multi-Stage Build Optimization", "weight": 40, "description": "Separates builder from production runtime to minimize surface area"},
                {"criterion": "Security & Non-Root Execution", "weight": 30, "description": "Runs container under unprivileged user"},
                {"criterion": "Healthcheck & Lifecycle Configuration", "weight": 30, "description": "Configures container health probe properly"}
            ]
        }
    }
]

def seed_fullstack_curriculum():
    db = SessionLocal()
    try:
        print("=== Full-Stack Developer Curriculum Generation ===")

        # 1. Ensure Domain exists and update description
        domain = db.query(Domain).filter_by(slug="fullstack-mobile").first()
        if not domain:
            domain = Domain(
                slug="fullstack-mobile",
                name="Full-Stack Developer",
                description="End-to-end software engineering: modern TypeScript, React, React Native/Expo, backend APIs, PostgreSQL, state caching, security, offline-first sync, and Docker containerization.",
                icon="code"
            )
            db.add(domain)
            db.flush()
        else:
            domain.name = "Full-Stack Developer"
            domain.description = "End-to-end software engineering: modern TypeScript, React, React Native/Expo, backend APIs, PostgreSQL, state caching, security, offline-first sync, and Docker containerization."

        print(f"[*] Configured Domain: {domain.name} (ID: {domain.id})")

        # 2. Clear existing DomainSkills for fullstack-mobile to recreate cleanly
        db.query(DomainSkill).filter_by(domain_id=domain.id).delete()
        db.flush()

        for chapter_info in FULLSTACK_CHAPTERS:
            slug = chapter_info["slug"]
            pos = chapter_info["position"]

            # Ensure Skill exists
            skill = db.query(Skill).filter_by(slug=slug).first()
            if not skill:
                skill = Skill(
                    slug=slug,
                    name=chapter_info["name"],
                    difficulty=chapter_info["difficulty"],
                    category=chapter_info["category"],
                    description=chapter_info["overview"]
                )
                db.add(skill)
                db.flush()
            else:
                skill.name = chapter_info["name"]
                skill.difficulty = chapter_info["difficulty"]
                skill.category = chapter_info["category"]
                skill.description = chapter_info["overview"]

            # Ensure DomainSkill link
            ds = DomainSkill(
                domain_id=domain.id,
                skill_id=skill.id,
                position=pos
            )
            db.add(ds)

            # Ensure SkillLesson
            lesson = db.query(SkillLesson).filter_by(skill_id=skill.id).first()
            if not lesson:
                lesson = SkillLesson(
                    skill_id=skill.id,
                    overview=chapter_info["overview"],
                    mini_project=chapter_info["task"]["description"]
                )
                db.add(lesson)
            else:
                lesson.overview = chapter_info["overview"]
                lesson.mini_project = chapter_info["task"]["description"]

            # Ensure LessonVideo
            vid_def = chapter_info["video"]
            video = db.query(LessonVideo).filter_by(skill_id=skill.id).first()
            if not video:
                video = LessonVideo(
                    skill_id=skill.id,
                    title=vid_def["title"],
                    channel=vid_def["channel"],
                    youtube_id=vid_def["youtube_id"],
                    verified=vid_def["verified"],
                    verified_on=date.today(),
                    position=0
                )
                db.add(video)
            else:
                video.title = vid_def["title"]
                video.channel = vid_def["channel"]
                video.youtube_id = vid_def["youtube_id"]
                video.verified = True

            # Ensure SkillNote
            note_content = chapter_info["note"]
            note = db.query(SkillNote).filter_by(skill_id=skill.id).first()
            if not note:
                note = SkillNote(
                    skill_id=skill.id,
                    content_md=note_content,
                    origin="curated",
                    status="approved",
                    reviewed_at=datetime.now(timezone.utc)
                )
                db.add(note)
            else:
                note.content_md = note_content
                note.status = "approved"

            # Ensure ChapterTask (Byju's Tactical Mission)
            t_def = chapter_info["task"]
            task = db.query(ChapterTask).filter_by(skill_id=skill.id).first()
            if not task:
                task = ChapterTask(
                    skill_id=skill.id,
                    title=t_def["title"],
                    description=t_def["description"],
                    instructions_md=t_def["instructions_md"],
                    starter_code=t_def["starter_code"],
                    rubric=t_def["rubric"],
                    difficulty=chapter_info["difficulty"]
                )
                db.add(task)
            else:
                task.title = t_def["title"]
                task.description = t_def["description"]
                task.instructions_md = t_def["instructions_md"]
                task.starter_code = t_def["starter_code"]
                task.rubric = t_def["rubric"]
                task.difficulty = chapter_info["difficulty"]

            print(f"  [+] Chapter {pos + 1:02d}: {skill.name} ({skill.slug})")

        # 3. Prerequisites linking
        for chapter_info in FULLSTACK_CHAPTERS:
            skill = db.query(Skill).filter_by(slug=chapter_info["slug"]).first()
            for prereq_slug in chapter_info["prerequisites"]:
                prereq_skill = db.query(Skill).filter_by(slug=prereq_slug).first()
                if prereq_skill:
                    existing_p = db.query(SkillPrerequisite).filter_by(
                        skill_id=skill.id,
                        prerequisite_id=prereq_skill.id
                    ).first()
                    if not existing_p:
                        p = SkillPrerequisite(
                            skill_id=skill.id,
                            prerequisite_id=prereq_skill.id
                        )
                        db.add(p)

        db.commit()

        # 4. Generate/Update Demo User Roadmap for Full-Stack Developer
        demo_user_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
        roadmap = db.query(Roadmap).filter_by(user_id=demo_user_id).first()
        if not roadmap:
            roadmap = Roadmap(
                user_id=demo_user_id,
                domain_id=domain.id,
                title="Full-Stack Developer Expedition Roadmap"
            )
            db.add(roadmap)
            db.flush()
        else:
            roadmap.domain_id = domain.id
            roadmap.title = "Full-Stack Developer Expedition Roadmap"
            # Clear previous items to populate complete 10-chapter progression
            db.query(RoadmapItem).filter_by(roadmap_id=roadmap.id).delete()
            db.flush()

        for idx, chapter_info in enumerate(FULLSTACK_CHAPTERS):
            skill = db.query(Skill).filter_by(slug=chapter_info["slug"]).first()
            # First chapter in progress, others todo
            status = "in_progress" if idx == 0 else "todo"
            item = RoadmapItem(
                roadmap_id=roadmap.id,
                skill_id=skill.id,
                status=status,
                position=idx,
                source="curated"
            )
            db.add(item)

        # Update demo user profile
        profile = db.query(StudentProfile).filter_by(user_id=demo_user_id).first()
        if profile:
            profile.selected_domain_id = domain.id
            profile.career_goal = "Senior Full-Stack & Mobile Systems Engineer"

        db.commit()
        print("\n[SUCCESS] Full-Stack Developer Curriculum completely generated!")
        print(f"Total Chapters: {len(FULLSTACK_CHAPTERS)}")
        print(f"Active Demo Roadmap: {roadmap.title} with {len(FULLSTACK_CHAPTERS)} ordered chapters.")

    finally:
        db.close()

if __name__ == "__main__":
    seed_fullstack_curriculum()

