"""
Curated skills data for SkillRadar AI (PRD §4.5, §7, T3.9, T3.10)
~16 curated skills with checked working resources, verified flags, mini-projects, and DAG prerequisites.
"""

CURATED_SKILLS = [
    {
        "name": "Python Programming",
        "slug": "python",
        "difficulty": "beginner",
        "category": "Programming Languages",
        "description": "Core syntax, data structures, object-oriented concepts, and async programming in Python.",
        "prerequisites": [],
        "resources": [
            {
                "title": "The Official Python Tutorial",
                "url": "https://docs.python.org/3/tutorial/",
                "resource_type": "docs",
                "provider": "Python Software Foundation",
                "is_verified": True,
                "mini_project": "Build an async CLI task manager with JSON persistence."
            },
            {
                "title": "Automate the Boring Stuff with Python",
                "url": "https://automatetheboringstuff.com/",
                "resource_type": "course",
                "provider": "Al Sweigart",
                "is_verified": True,
                "mini_project": "Write a script that scrapes and summarizes tech news headlines."
            }
        ]
    },
    {
        "name": "Git & Version Control",
        "slug": "git",
        "difficulty": "beginner",
        "category": "Developer Tools",
        "description": "Branching, merging, pull requests, rebase workflows, and collaborative GitHub repository management.",
        "prerequisites": [],
        "resources": [
            {
                "title": "Pro Git Book (Official)",
                "url": "https://git-scm.com/book/en/v2",
                "resource_type": "docs",
                "provider": "Git SCM",
                "is_verified": True,
                "mini_project": "Set up a multi-branch repository with CI workflow actions."
            }
        ]
    },
    {
        "name": "RESTful APIs & HTTP",
        "slug": "rest-apis",
        "difficulty": "beginner",
        "category": "Backend Engineering",
        "description": "HTTP request-response cycle, status codes, headers, REST constraints, and JSON data formats.",
        "prerequisites": [],
        "resources": [
            {
                "title": "Mozilla MDN HTTP Overview",
                "url": "https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview",
                "resource_type": "docs",
                "provider": "MDN Web Docs",
                "is_verified": True,
                "mini_project": "Design a clean RESTful specification for a student book library."
            }
        ]
    },
    {
        "name": "Relational Databases & SQL",
        "slug": "sql",
        "difficulty": "beginner",
        "category": "Data & Storage",
        "description": "Relational schema design, SQL queries, joins, indexes, transactions, and PostgreSQL fundamentals.",
        "prerequisites": [],
        "resources": [
            {
                "title": "PostgreSQL Official Tutorial",
                "url": "https://www.postgresql.org/docs/current/tutorial.html",
                "resource_type": "docs",
                "provider": "PostgreSQL Global Development Group",
                "is_verified": True,
                "mini_project": "Design an e-commerce database with foreign keys, indexes, and aggregation queries."
            }
        ]
    },
    {
        "name": "FastAPI Framework",
        "slug": "fastapi",
        "difficulty": "intermediate",
        "category": "Backend Engineering",
        "description": "High-performance Python web APIs with Pydantic validation, dependency injection, and automatic OpenAPI docs.",
        "prerequisites": ["python", "rest-apis"],
        "resources": [
            {
                "title": "FastAPI Official Tutorial",
                "url": "https://fastapi.tiangolo.com/tutorial/",
                "resource_type": "docs",
                "provider": "Tiangolo",
                "is_verified": True,
                "mini_project": "Build a secure REST API with OAuth2 password flow and Pydantic schemas."
            }
        ]
    },
    {
        "name": "Large Language Model Fundamentals",
        "slug": "llm-basics",
        "difficulty": "beginner",
        "category": "AI & Machine Learning",
        "description": "Transformer architecture, tokenization, self-attention mechanisms, and generative pre-training concepts.",
        "prerequisites": ["python"],
        "resources": [
            {
                "title": "Andrej Karpathy: Intro to Large Language Models",
                "url": "https://www.youtube.com/watch?v=zjkBMFhNj_g",
                "resource_type": "video",
                "provider": "YouTube / Karpathy",
                "is_verified": True,
                "mini_project": "Build a character-level bigram language model in pure Python."
            },
            {
                "title": "Hugging Face NLP Course",
                "url": "https://huggingface.co/learn/nlp-course/chapter1/1",
                "resource_type": "course",
                "provider": "Hugging Face",
                "is_verified": True,
                "mini_project": "Use HF transformers pipeline for zero-shot text classification."
            }
        ]
    },
    {
        "name": "Prompt Engineering & Few-Shot Reasoning",
        "slug": "prompt-engineering",
        "difficulty": "intermediate",
        "category": "AI & Machine Learning",
        "description": "Chain-of-thought, few-shot prompting, schema-constrained generation, system instructions, and prompt injection defense.",
        "prerequisites": ["llm-basics"],
        "resources": [
            {
                "title": "Google DeepMind Prompting Guide",
                "url": "https://ai.google.dev/gemini-api/docs/prompting-intro",
                "resource_type": "docs",
                "provider": "Google DeepMind",
                "is_verified": True,
                "mini_project": "Create a defensive prompt pipeline that enforces JSON schema validation on user inputs."
            }
        ]
    },
    {
        "name": "Vector Databases & Embeddings",
        "slug": "vector-databases",
        "difficulty": "intermediate",
        "category": "AI & Machine Learning",
        "description": "Dense vector representations, cosine similarity, approximate nearest neighbor search (HNSW), and pgvector.",
        "prerequisites": ["python", "sql"],
        "resources": [
            {
                "title": "Pinecone Learning Center: Vector Search Basics",
                "url": "https://www.pinecone.io/learn/vector-search-basics/",
                "resource_type": "article",
                "provider": "Pinecone",
                "is_verified": True,
                "mini_project": "Implement vector indexing and semantic similarity search using pgvector."
            }
        ]
    },
    {
        "name": "Retrieval-Augmented Generation (RAG)",
        "slug": "rag",
        "difficulty": "intermediate",
        "category": "AI & Machine Learning",
        "description": "Document chunking strategies, embedding retrieval, re-ranking, and grounded generation with citation linking.",
        "prerequisites": ["vector-databases", "prompt-engineering"],
        "resources": [
            {
                "title": "LangChain RAG Architecture Tutorial",
                "url": "https://python.langchain.com/docs/tutorials/rag/",
                "resource_type": "tutorial",
                "provider": "LangChain",
                "is_verified": True,
                "mini_project": "Build a question-answering CLI over markdown documentation with sources cited."
            }
        ]
    },
    {
        "name": "Autonomous Agent Frameworks",
        "slug": "agent-frameworks",
        "difficulty": "advanced",
        "category": "AI & Machine Learning",
        "description": "Multi-agent workflows, tool execution, reflection cycles, state graphs, LangGraph, and autonomous planning.",
        "prerequisites": ["rag", "fastapi"],
        "resources": [
            {
                "title": "LangGraph Multi-Agent Workflows",
                "url": "https://langchain-ai.github.io/langgraph/",
                "resource_type": "docs",
                "provider": "LangChain AI",
                "is_verified": True,
                "mini_project": "Construct a two-agent system where one writes code and another writes automated pytest unit tests."
            }
        ]
    },
    {
        "name": "LLM Fine-Tuning & PEFT/LoRA",
        "slug": "fine-tuning",
        "difficulty": "advanced",
        "category": "AI & Machine Learning",
        "description": "Parameter-efficient fine-tuning (LoRA, QLoRA), instruction tuning, dataset formatting, and loss evaluation.",
        "prerequisites": ["llm-basics"],
        "resources": [
            {
                "title": "Hugging Face PEFT Documentation",
                "url": "https://huggingface.co/docs/peft/index",
                "resource_type": "docs",
                "provider": "Hugging Face",
                "is_verified": True,
                "mini_project": "Fine-tune a lightweight 1B LLM on a custom domain classification dataset with LoRA."
            }
        ]
    },
    {
        "name": "Edge AI & Mobile Inference Optimization",
        "slug": "edge-ai",
        "difficulty": "advanced",
        "category": "AI & Machine Learning",
        "description": "Model quantization (INT4/INT8), ONNX runtime, TensorFlow Lite, LiteRT, and on-device neural acceleration.",
        "prerequisites": ["llm-basics", "python"],
        "resources": [
            {
                "title": "Google LiteRT (formerly TFLite) Documentation",
                "url": "https://ai.google.dev/edge/litert",
                "resource_type": "docs",
                "provider": "Google AI",
                "is_verified": True,
                "mini_project": "Quantize a transformer model and benchmark latency on mobile CPU vs GPU."
            }
        ]
    },
    {
        "name": "React Native & Expo",
        "slug": "react-native",
        "difficulty": "intermediate",
        "category": "Mobile Development",
        "description": "Cross-platform mobile apps for Android and iOS using TypeScript, Expo Router, and native components.",
        "prerequisites": ["git", "rest-apis"],
        "resources": [
            {
                "title": "Expo Official Documentation",
                "url": "https://docs.expo.dev/",
                "resource_type": "docs",
                "provider": "Expo",
                "is_verified": True,
                "mini_project": "Build an offline-capable mobile notes app with TanStack Query and AsyncStorage."
            }
        ]
    },
    {
        "name": "Docker & Containerization",
        "slug": "docker",
        "difficulty": "beginner",
        "category": "Cloud & DevOps",
        "description": "Container images, Dockerfiles, volume mounts, port binding, and multi-service docker-compose setups.",
        "prerequisites": [],
        "resources": [
            {
                "title": "Docker Get Started Guide",
                "url": "https://docs.docker.com/get-started/",
                "resource_type": "docs",
                "provider": "Docker Inc.",
                "is_verified": True,
                "mini_project": "Containerize a FastAPI application and PostgreSQL database with health checks."
            }
        ]
    },
    {
        "name": "AI Evaluation & Red-Teaming",
        "slug": "eval-benchmarking",
        "difficulty": "advanced",
        "category": "AI & Machine Learning",
        "description": "Evaluation benchmarks (MMLU, HumanEval), automated rubric scoring, adversarial prompt testing, and safety guardrails.",
        "prerequisites": ["prompt-engineering"],
        "resources": [
            {
                "title": "OpenAI Evals Framework",
                "url": "https://github.com/openai/evals",
                "resource_type": "docs",
                "provider": "OpenAI",
                "is_verified": True,
                "mini_project": "Create a regression test suite evaluating factual faithfulness of LLM summaries."
            }
        ]
    },
    {
        "name": "Neural Radiance Fields & 3D Gaussian Splatting",
        "slug": "neural-radiance-fields",
        "difficulty": "advanced",
        "category": "Computer Vision",
        "description": "Differentiable volume rendering, 3D scene reconstruction from photos, radiance fields, and real-time splatting.",
        "prerequisites": ["python"],
        "resources": [
            {
                "title": "NeRF: Representing Scenes as Neural Radiance Fields",
                "url": "https://www.matthewtancik.com/nerf",
                "resource_type": "article",
                "provider": "UC Berkeley / Mildenhall et al.",
                "is_verified": True,
                "mini_project": "Train a tiny NeRF on a synthetic multi-view dataset using PyTorch."
            }
        ]
    }
]
