import json
import os

skills = [
    # AI ENGINEERING
    {
        "slug": "python-for-ai",
        "name": "Python for AI",
        "domain_slug": "ai-engineering",
        "domain_tier": "beginner",
        "prerequisites": [],
        "overview": "Master core Python syntax, NumPy array vectorization, and data processing pipelines required for modern AI workloads.",
        "outline": [
            "Data structures and list comprehensions",
            "NumPy n-dimensional arrays and vector math",
            "AsyncIO for high-concurrency API calls",
            "Type hints and Pydantic validation"
        ],
        "mini_project": "Build an async token batcher that processes text streams and computes vector dimensions with NumPy.",
        "videos": [
            {
                "youtube_id": "0sOvCWFmrtA",
                "title": "Python for Beginners - Full Course",
                "channel": "freeCodeCamp",
                "verified": True,
                "verified_on": "2026-10-25"
            }
        ]
    },
    {
        "slug": "llm-foundations",
        "name": "LLM Foundations",
        "domain_slug": "ai-engineering",
        "domain_tier": "beginner",
        "prerequisites": ["python-for-ai"],
        "overview": "Understand the transformer architecture, self-attention mechanisms, and tokenizer mechanics behind modern foundation models.",
        "outline": [
            "Transformer self-attention and positional encodings",
            "Tokenization strategies: BPE and WordPiece",
            "Inference generation: temperature, top-p, and top-k",
            "Context window limits and KV caching"
        ],
        "mini_project": "Write a self-attention calculation function in raw Python and inspect how token weights shift across layers.",
        "videos": [
            {
                "youtube_id": "zjkBMFhNj_g",
                "title": "Intro to Large Language Models",
                "channel": "Andrej Karpathy",
                "verified": True,
                "verified_on": "2026-10-25"
            },
            {
                "youtube_id": "kCc8FmEb1nY",
                "title": "Let's build GPT: from scratch, in code, spelled out",
                "channel": "Andrej Karpathy",
                "verified": True,
                "verified_on": "2026-10-25"
            }
        ]
    },
    {
        "slug": "prompt-engineering",
        "name": "Prompt Engineering & In-Context Learning",
        "domain_slug": "ai-engineering",
        "domain_tier": "beginner",
        "prerequisites": ["llm-foundations"],
        "overview": "Learn systematic prompt design, few-shot conditioning, chain-of-thought elicitation, and structured JSON output schema enforcement.",
        "outline": [
            "Zero-shot vs few-shot in-context demonstration",
            "Chain-of-thought (CoT) and step-by-step reasoning",
            "Structured outputs using Pydantic JSON schemas",
            "Preventing prompt injection with data delimiters"
        ],
        "mini_project": "Build a prompt-based entity extraction pipeline that parses medical case reports into strictly typed JSON schemas.",
        "videos": [
            {
                "youtube_id": "jC4v5AS4RIM",
                "title": "Prompt Engineering Tutorial - How to Engineer Prompts",
                "channel": "freeCodeCamp",
                "verified": True,
                "verified_on": "2026-10-25"
            }
        ]
    },
    {
        "slug": "embeddings-vector-dbs",
        "name": "Embeddings & Vector Databases",
        "domain_slug": "ai-engineering",
        "domain_tier": "intermediate",
        "prerequisites": ["python-for-ai"],
        "overview": "Learn how dense vector representations encode semantic similarity, and how vector indices like HNSW power high-scale similarity search.",
        "outline": [
            "Dense vector embeddings vs sparse lexical search",
            "Distance metrics: Cosine similarity, Dot product, Euclidean distance",
            "Approximate Nearest Neighbor (ANN) algorithms and HNSW indexing",
            "Vector databases: pgvector, Chroma, and Qdrant integration"
        ],
        "mini_project": "Set up a local pgvector table and index 1,000 document chunks, querying nearest neighbors with cosine distance.",
        "videos": [
            {
                "youtube_id": "wjZofJX0v4M",
                "title": "Vector Databases Explained",
                "channel": "IBM Technology",
                "verified": True,
                "verified_on": "2026-10-25"
            }
        ]
    },
    {
        "slug": "rag-basics",
        "name": "RAG Basics",
        "domain_slug": "ai-engineering",
        "domain_tier": "intermediate",
        "prerequisites": ["llm-foundations", "embeddings-vector-dbs"],
        "overview": "Build Retrieval-Augmented Generation systems connecting foundation models to dynamic external document corpora with citations.",
        "outline": [
            "Document chunking strategies: recursive, semantic, and markdown-aware",
            "Bi-encoder retrieval and cross-encoder re-ranking",
            "Context window injection and citation attribution",
            "Handling retrieval hallucinations and empty-context fallbacks"
        ],
        "mini_project": "Implement an end-to-end question answering pipeline over technical markdown specs with strict evidence citations.",
        "videos": [
            {
                "youtube_id": "tcqE5442fAA",
                "title": "Retrieval Augmented Generation (RAG) Explained",
                "channel": "IBM Technology",
                "verified": True,
                "verified_on": "2026-10-25"
            }
        ]
    },
    {
        "slug": "fine-tuning-peft",
        "name": "Fine-Tuning & PEFT",
        "domain_slug": "ai-engineering",
        "domain_tier": "intermediate",
        "prerequisites": ["llm-foundations"],
        "overview": "Adapt open-source models to specialised domain tasks using Parameter-Efficient Fine-Tuning (LoRA, QLoRA) without full weight recomputation.",
        "outline": [
            "Full parameter fine-tuning vs parameter-efficient fine-tuning (PEFT)",
            "Low-Rank Adaptation (LoRA) mathematics and rank matrices",
            "Quantization: 4-bit and 8-bit QLoRA weight representation",
            "Dataset preparation: instruction tuning and chat formatting"
        ],
        "mini_project": "Fine-tune a 1B parameter model on domain-specific support tickets using LoRA adapters.",
        "videos": [
            {
                "youtube_id": "eC6Hd1hFvos",
                "title": "Fine-Tuning Large Language Models",
                "channel": "DeepLearning.AI",
                "verified": True,
                "verified_on": "2026-10-25"
            }
        ]
    },
    {
        "slug": "agentic-architectures",
        "name": "Agentic Architectures",
        "domain_slug": "ai-engineering",
        "domain_tier": "advanced",
        "prerequisites": ["rag-basics"],
        "overview": "Design autonomous LLM agents that execute multi-step planning, tool invocation, reflective self-correction, and state management.",
        "outline": [
            "ReAct loop: Reasoning, Action, and Observation cycles",
            "Function calling and tool invocation interfaces",
            "Agent memory: short-term scratchpads vs persistent session stores",
            "Handling execution errors and retry limits"
        ],
        "mini_project": "Create a Python agent that queries a database, runs Python sandbox code, and verifies the solution before answering.",
        "videos": [
            {
                "youtube_id": "T-D1OfcDW1M",
                "title": "What is an AI Agent?",
                "channel": "IBM Technology",
                "verified": True,
                "verified_on": "2026-10-25"
            }
        ]
    },
    {
        "slug": "evals-and-guardrails",
        "name": "Evals & Guardrails",
        "domain_slug": "ai-engineering",
        "domain_tier": "advanced",
        "prerequisites": ["agentic-architectures"],
        "overview": "Systematically evaluate AI outputs using ground-truth benchmarks, LLM-as-a-judge rubrics, latency tracking, and safety guardrails.",
        "outline": [
            "Deterministic metrics: BLEU, ROUGE, and exact match",
            "LLM-as-a-judge: scoring rubrics, position bias, and alignment",
            "Input/output guardrails: PII redaction and toxic content filters",
            "Continuous automated regression testing in CI/CD"
        ],
        "mini_project": "Build an automated eval suite evaluating 50 test cases for faithfulness, hallucination, and schema compliance.",
        "videos": [
            {
                "youtube_id": "84rOQyL29vI",
                "title": "AI Safety & Guardrails Overview",
                "channel": "Google Cloud Tech",
                "verified": True,
                "verified_on": "2026-10-25"
            }
        ]
    },

    # FULL-STACK & MOBILE
    {
        "slug": "modern-javascript",
        "name": "Modern JavaScript (ES6+)",
        "domain_slug": "fullstack-mobile",
        "domain_tier": "beginner",
        "prerequisites": [],
        "overview": "Deep dive into ESNext features, functional array methods, promises, event loop asynchronous execution, and modern module packaging.",
        "outline": [
            "Arrow functions, destructuring, and spread operator",
            "Promises, async/await, and error handling",
            "Event loop, microtasks, and macrotasks",
            "ES Modules vs CommonJS"
        ],
        "mini_project": "Write a lightweight promise-based task queue with concurrency throttling.",
        "videos": [
            {
                "youtube_id": "DHjqpvDnNGE",
                "title": "JavaScript in 100 Seconds",
                "channel": "Fireship",
                "verified": True,
                "verified_on": "2026-10-25"
            }
        ]
    },
    {
        "slug": "typescript-core",
        "name": "TypeScript Core",
        "domain_slug": "fullstack-mobile",
        "domain_tier": "beginner",
        "prerequisites": ["modern-javascript"],
        "overview": "Master static typing, generics, discriminated unions, utility types, and strict compiler configurations.",
        "outline": [
            "Type annotations, interfaces, and type aliases",
            "Discriminated unions and pattern matching",
            "Generics: functions, classes, and constraints",
            "Utility types: Partial, Pick, Omit, and Record"
        ],
        "mini_project": "Construct a strictly typed API client SDK with automatic endpoint response type inference.",
        "videos": [
            {
                "youtube_id": "zQnBQ4tB3ZA",
                "title": "TypeScript in 100 Seconds",
                "channel": "Fireship",
                "verified": True,
                "verified_on": "2026-10-25"
            }
        ]
    },
    {
        "slug": "react-fundamentals",
        "name": "React Fundamentals",
        "domain_slug": "fullstack-mobile",
        "domain_tier": "beginner",
        "prerequisites": ["typescript-core"],
        "overview": "Master React component composition, JSX rendering cycles, hooks (useState, useEffect, useMemo), and unidirectional data flow.",
        "outline": [
            "Component lifecycle and virtual DOM reconciliation",
            "Hooks: useState, useEffect, useCallback, useMemo",
            "Controlled vs uncontrolled inputs",
            "Lifting state up and custom hook abstraction"
        ],
        "mini_project": "Build an interactive multi-step data survey with form validation and custom hooks.",
        "videos": [
            {
                "youtube_id": "TNhaISOUy6Q",
                "title": "React in 100 Seconds",
                "channel": "Fireship",
                "verified": True,
                "verified_on": "2026-10-25"
            },
            {
                "youtube_id": "bMknfKXIFA8",
                "title": "React Course - Beginner's Tutorial",
                "channel": "freeCodeCamp",
                "verified": True,
                "verified_on": "2026-10-25"
            }
        ]
    },
    {
        "slug": "expo-react-native",
        "name": "Expo & React Native",
        "domain_slug": "fullstack-mobile",
        "domain_tier": "intermediate",
        "prerequisites": ["react-fundamentals"],
        "overview": "Build cross-platform mobile apps using React Native and Expo Router, targeting native Android and iOS devices.",
        "outline": [
            "Native primitives: View, Text, FlatList, ScrollView",
            "Flexbox layout system and platform differences",
            "File-based navigation with Expo Router",
            "Hardware sensor access and secure device storage"
        ],
        "mini_project": "Build a responsive mobile list with pull-to-refresh, haptic feedback, and modal navigation.",
        "videos": [
            {
                "youtube_id": "gvkqT_UoVDw",
                "title": "React Native in 100 Seconds",
                "channel": "Fireship",
                "verified": True,
                "verified_on": "2026-10-25"
            }
        ]
    },
    {
        "slug": "state-management-tanstack",
        "name": "Server State & TanStack Query",
        "domain_slug": "fullstack-mobile",
        "domain_tier": "intermediate",
        "prerequisites": ["react-fundamentals"],
        "overview": "Eliminate redundant client state using TanStack Query for declarative caching, background refetching, and optimistic mutations.",
        "outline": [
            "Client state vs asynchronous server cache",
            "Query keys, stale time, and cache garbage collection",
            "Optimistic updates with rollback on network error",
            "Infinite scrolling and pagination queries"
        ],
        "mini_project": "Implement an offline-capable bookmarking manager with optimistic toggle mutations.",
        "videos": [
            {
                "youtube_id": "novnyCaa7To",
                "title": "TanStack Query in 100 Seconds",
                "channel": "Fireship",
                "verified": True,
                "verified_on": "2026-10-25"
            }
        ]
    },
    {
        "slug": "rest-api-design",
        "name": "REST API Architecture",
        "domain_slug": "fullstack-mobile",
        "domain_tier": "intermediate",
        "prerequisites": ["typescript-core"],
        "overview": "Design robust, versioned RESTful APIs with predictable status codes, pagination, rate limiting, and standard error envelopes.",
        "outline": [
            "HTTP methods (GET, POST, PUT, PATCH, DELETE) semantics",
            "URL resource naming and nesting rules",
            "Cursor-based vs offset-based pagination",
            "Error handling with RFC 7807 Problem Details"
        ],
        "mini_project": "Build a versioned REST API in FastAPI with cursor pagination and Pydantic schema validation.",
        "videos": [
            {
                "youtube_id": "-MTSQjw5DrM",
                "title": "REST APIs in 100 Seconds",
                "channel": "Fireship",
                "verified": True,
                "verified_on": "2026-10-25"
            }
        ]
    },
    {
        "slug": "offline-first-sync",
        "name": "Offline-First Synchronization",
        "domain_slug": "fullstack-mobile",
        "domain_tier": "advanced",
        "prerequisites": ["expo-react-native", "state-management-tanstack"],
        "overview": "Architect mobile applications that function seamlessly without an internet connection using local SQLite and conflict resolution.",
        "outline": [
            "Local storage engines: SQLite vs MMKV",
            "Outbox pattern for queuing offline actions",
            "Conflict resolution strategies: Last-Write-Wins and CRDTs",
            "Network reachability listeners and sync reconciliation"
        ],
        "mini_project": "Implement an offline note-taking app that queues edits in SQLite and syncs when connection returns.",
        "videos": [
            {
                "youtube_id": "W2Z7tX26S30",
                "title": "Offline First Architecture Explained",
                "channel": "Firebase",
                "verified": True,
                "verified_on": "2026-10-25"
            }
        ]
    },
    {
        "slug": "mobile-security-auth",
        "name": "Mobile Security & JWT Auth",
        "domain_slug": "fullstack-mobile",
        "domain_tier": "advanced",
        "prerequisites": ["rest-api-design", "expo-react-native"],
        "overview": "Implement secure authentication flows using JWTs, biometric hardware unlock, encrypted storage, and PKCE OAuth standards.",
        "outline": [
            "JWT anatomy, signing algorithms, and claim validation",
            "Secure token storage: Expo SecureStore / Keychain",
            "OAuth 2.0 with PKCE for native mobile apps",
            "Protection against token theft and replay attacks"
        ],
        "mini_project": "Build a secure auth interceptor that automatically refreshes expired access tokens without interrupting user flow.",
        "videos": [
            {
                "youtube_id": "7Q17ubqL20U",
                "title": "JWT Authentication Explained",
                "channel": "Web Dev Simplified",
                "verified": True,
                "verified_on": "2026-10-25"
            }
        ]
    },

    # CLOUD & DEVOPS
    {
        "slug": "linux-shell-scripting",
        "name": "Linux & Shell Scripting",
        "domain_slug": "cloud-devops",
        "domain_tier": "beginner",
        "prerequisites": [],
        "overview": "Master the Linux command line, POSIX file permissions, process inspection, pipeline composition, and Bash automation.",
        "outline": [
            "File hierarchy standard, navigation, and file permissions (chmod, chown)",
            "Standard I/O redirection, pipes, and text filtering (grep, sed, awk)",
            "Process management: ps, top, kill, systemd services",
            "Bash scripting: variables, exit codes, conditionals, loops"
        ],
        "mini_project": "Write a bash script that monitors server disk and CPU usage, alerting when thresholds exceed 85%.",
        "videos": [
            {
                "youtube_id": "fM4_p2Jv43A",
                "title": "Linux in 100 Seconds",
                "channel": "Fireship",
                "verified": True,
                "verified_on": "2026-10-25"
            }
        ]
    },
    {
        "slug": "git-and-github",
        "name": "Git & GitHub Workflows",
        "domain_slug": "cloud-devops",
        "domain_tier": "beginner",
        "prerequisites": [],
        "overview": "Understand content-addressable storage, Git commit trees, branch merging, interactive rebasing, and GitHub PR reviews.",
        "outline": [
            "Git object model: blobs, trees, commits, and tags",
            "Branching models: trunk-based development vs feature branches",
            "Resolving merge conflicts and interactive rebase",
            "Signing commits and configuring branch protection rules"
        ],
        "mini_project": "Set up a repository with branch protection rules, requiring signed commits and PR reviews before merge.",
        "videos": [
            {
                "youtube_id": "SccSCuHhOw0",
                "title": "Git in 100 Seconds",
                "channel": "Fireship",
                "verified": True,
                "verified_on": "2026-10-25"
            },
            {
                "youtube_id": "RGOj5yH7evk",
                "title": "Git and GitHub for Beginners - Crash Course",
                "channel": "freeCodeCamp",
                "verified": True,
                "verified_on": "2026-10-25"
            }
        ]
    },
    {
        "slug": "docker-containers",
        "name": "Docker & Containerization",
        "domain_slug": "cloud-devops",
        "domain_tier": "beginner",
        "prerequisites": ["linux-shell-scripting"],
        "overview": "Package applications and dependencies into deterministic, isolated container images using Dockerfiles and multi-stage builds.",
        "outline": [
            "Linux namespaces and cgroups foundation",
            "Dockerfile best practices: layers, caching, and multi-stage builds",
            "Docker networks, volume persistence, and port mapping",
            "Compose orchestration for multi-container local stacks"
        ],
        "mini_project": "Dockerize a FastAPI application and PostgreSQL database with persistent volume mounts and multi-stage optimization.",
        "videos": [
            {
                "youtube_id": "jG8rSmsZ1oI",
                "title": "Docker in 100 Seconds",
                "channel": "Fireship",
                "verified": True,
                "verified_on": "2026-10-25"
            }
        ]
    },
    {
        "slug": "ci-cd-github-actions",
        "name": "CI/CD with GitHub Actions",
        "domain_slug": "cloud-devops",
        "domain_tier": "intermediate",
        "prerequisites": ["git-and-github", "docker-containers"],
        "overview": "Automate continuous integration pipelines that run tests, lint code, build Docker images, and deploy on merge.",
        "outline": [
            "Workflows, jobs, steps, and runners",
            "Trigger events: push, pull_request, release, and cron",
            "Secret management and repository environment protection",
            "Matrix builds and caching dependencies"
        ],
        "mini_project": "Create a GitHub Actions pipeline that lints, runs pytest, builds a Docker image, and tests the container health.",
        "videos": [
            {
                "youtube_id": "R8_veQiYBjI",
                "title": "GitHub Actions in 100 Seconds",
                "channel": "Fireship",
                "verified": True,
                "verified_on": "2026-10-25"
            }
        ]
    },
    {
        "slug": "cloud-compute-networking",
        "name": "Cloud Compute & Networking",
        "domain_slug": "cloud-devops",
        "domain_tier": "intermediate",
        "prerequisites": ["linux-shell-scripting"],
        "overview": "Understand core cloud primitives: virtual machines, VPC subnets, route tables, security groups, and load balancers.",
        "outline": [
            "Cloud architecture: Regions and Availability Zones",
            "Virtual Private Clouds (VPC), public vs private subnets, NAT gateways",
            "Security groups and Network Access Control Lists (NACLs)",
            "Application Load Balancers (ALB) and SSL/TLS termination"
        ],
        "mini_project": "Design and document a high-availability cloud architecture with dual-AZ subnets and an autoscaled compute tier.",
        "videos": [
            {
                "youtube_id": "M988_VALKmE",
                "title": "Cloud Computing in 100 Seconds",
                "channel": "Fireship",
                "verified": True,
                "verified_on": "2026-10-25"
            }
        ]
    },
    {
        "slug": "kubernetes-fundamentals",
        "name": "Kubernetes Fundamentals",
        "domain_slug": "cloud-devops",
        "domain_tier": "advanced",
        "prerequisites": ["docker-containers", "cloud-compute-networking"],
        "overview": "Orchestrate containerized services at scale with Kubernetes Pods, Deployments, Services, ConfigMaps, and Ingress controllers.",
        "outline": [
            "Kubernetes control plane vs worker nodes architecture",
            "Workload primitives: Pods, ReplicaSets, and Deployments",
            "Networking: ClusterIP, NodePort, LoadBalancer, and Ingress",
            "Declarative manifests, rolling updates, and self-healing"
        ],
        "mini_project": "Deploy a high-availability web service in Minikube/K3s with 3 replicas, health probes, and an Ingress route.",
        "videos": [
            {
                "youtube_id": "d5x0JCwuAms",
                "title": "Kubernetes in 100 Seconds",
                "channel": "Fireship",
                "verified": True,
                "verified_on": "2026-10-25"
            },
            {
                "youtube_id": "FQPlEnK81dg",
                "title": "Docker and Kubernetes Full Course",
                "channel": "freeCodeCamp",
                "verified": True,
                "verified_on": "2026-10-25"
            }
        ]
    },
    {
        "slug": "terraform-iac",
        "name": "Infrastructure as Code with Terraform",
        "domain_slug": "cloud-devops",
        "domain_tier": "advanced",
        "prerequisites": ["cloud-compute-networking"],
        "overview": "Provision reproducible cloud infrastructure declaratively using HashiCorp Configuration Language (HCL) and state management.",
        "outline": [
            "IaC principles: idempotency and declarative state",
            "Providers, resources, data sources, and variables",
            "Terraform state file, remote locking, and drift detection",
            "Reusable infrastructure modules"
        ],
        "mini_project": "Write a Terraform module that provisions a VPC, security groups, and an Ubuntu compute instance.",
        "videos": [
            {
                "youtube_id": "tomUWcQ0P3k",
                "title": "Terraform in 100 Seconds",
                "channel": "Fireship",
                "verified": True,
                "verified_on": "2026-10-25"
            }
        ]
    },
    {
        "slug": "observability-monitoring",
        "name": "Observability: Metrics, Logs & Traces",
        "domain_slug": "cloud-devops",
        "domain_tier": "advanced",
        "prerequisites": ["docker-containers"],
        "overview": "Implement the three pillars of observability using Prometheus metrics, structured log shipping, OpenTelemetry distributed tracing, and Grafana.",
        "outline": [
            "The Three Pillars: Metrics, Logs, and Distributed Tracing",
            "Prometheus pull-based scraping and PromQL alerting rules",
            "Structured JSON logging and centralized aggregation",
            "OpenTelemetry spans and distributed trace propagation"
        ],
        "mini_project": "Instrument a Python API with Prometheus metrics exposing request latency histograms and error rate counters.",
        "videos": [
            {
                "youtube_id": "qJj300fUaM4",
                "title": "Prometheus & Grafana in 100 Seconds",
                "channel": "Fireship",
                "verified": True,
                "verified_on": "2026-10-25"
            }
        ]
    }
]

out_dir = os.path.join(os.path.dirname(__file__), "..", "..", "content", "skills")
os.makedirs(out_dir, exist_ok=True)

for skill in skills:
    file_path = os.path.join(out_dir, f"{skill['slug']}.json")
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(skill, f, indent=2)
    print(f"Wrote {file_path}")

print(f"Successfully generated {len(skills)} curated skills in content/skills!")
