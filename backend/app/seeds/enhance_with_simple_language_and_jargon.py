"""
Enhances discovery explanations with:
1. 'key_terms' glossary: explains technical jargon words FIRST in simple terms with everyday analogies.
2. Plain-English, highly explainable summaries: breaks down the news like a world-class tech mentor.
3. Actionable, simplified developer takeaways ('why_it_matters').
4. Concrete real-world production use cases.
"""

import sys
import os
import re

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from app.core.database import SessionLocal
from app.models import Discovery

SIMPLE_EXPLANATION_CATALOG = [
    {
        "pattern": r"enterprise software shift|verifiable trust|autonomous agent workers",
        "title": "Enterprise Software Shift: Building Verifiable Trust in Autonomous Agent Workers",
        "key_terms": [
            {
                "term": "Autonomous Agent",
                "simple_explanation": "An AI program designed to act like a digital employee—it doesn't just answer questions, it actually takes multi-step actions (like updating spreadsheets, sending emails, or issuing refunds) on its own.",
                "analogy": "Like an assistant you give a to-do list and company login to, rather than an encyclopedia you just look things up in."
            },
            {
                "term": "Deterministic Safety",
                "simple_explanation": "Strict, unbreakable boundaries programmed into code so the AI can never do something unauthorized—guaranteeing 100% predictable behavior every time.",
                "analogy": "Like a physical guardrail on a mountain road—it stops the car regardless of how erratically the driver steers."
            },
            {
                "term": "Verifiable Provenance",
                "simple_explanation": "A tamper-proof digital paper trail that tracks every single decision the AI made, proving who told it to do it and where the data came from.",
                "analogy": "Like an official notary stamp and video recording on an important financial agreement."
            },
            {
                "term": "Idempotency",
                "simple_explanation": "Making sure that if an AI tries to perform an action twice by mistake (like charging a credit card after a network lag), it only actually happens once.",
                "analogy": "Like pressing the 'Lock' button on your car keys three times—your car stays locked without locking you out three times."
            }
        ],
        "summary": "Big software companies (like Salesforce, Workday, and Microsoft) are fundamentally changing how business software works. Instead of humans clicking buttons all day, companies are starting to let AI agents do everyday tasks—like handling customer refunds, approving expense reports, and drafting invoices.\n\nHere is the big challenge: businesses are terrified that an AI agent might hallucinate, delete critical customer records, or accidentally pay the wrong invoice. Because of this, companies don't care about which AI model has the highest benchmark score anymore. Instead, they are demanding 'Safety First' systems: AI with strict guardrails, clear audit logs, and complete human oversight before they let AI touch any real company money or data.",
        "why_it_matters": "If you are building software today, simply hooking up a chat prompt to an API is no longer enough. Companies want engineers who know how to build 'safety guardrails'—setting up automated checks, step-by-step state machines (like LangGraph), and retry-safe endpoints so that an AI agent cannot break the business.",
        "applications": [
            "Adding a human confirmation step before an AI can approve payments over $500",
            "Tracking an AI's step-by-step thinking in a database so auditors can inspect every decision",
            "Designing fail-safe APIs that prevent duplicate charges if an AI retries a request after a timeout"
        ]
    },
    {
        "pattern": r"chains flaws|chrome.*safari.*linux|unreleased.*ai model",
        "title": "Anthropic AI Model Chains Multi-Platform Exploits Across Chrome, Safari, & Linux",
        "key_terms": [
            {
                "term": "Zero-Day Exploit",
                "simple_explanation": "A security bug in software that the creators don't know about yet, giving hackers a surprise backdoor.",
                "analogy": "Like discovering a secret master key to a bank vault before the bank even knows that key exists."
            },
            {
                "term": "Exploit Chaining",
                "simple_explanation": "Combining several small, harmless-looking glitches together to take complete control of a computer.",
                "analogy": "Like using a fake ID to enter a lobby, a borrowed badge to get into the elevator, and an open window to reach the CEO's office."
            },
            {
                "term": "Remote Code Execution (RCE)",
                "simple_explanation": "A serious security flaw that lets an outsider run their own malicious code on your computer over the internet.",
                "analogy": "Like someone controlling your home's smart locks and security cameras from across the world."
            }
        ],
        "summary": "Researchers at Anthropic tested a powerful experimental AI model to see how good it is at cyber-defense. What they found shocked the security world: the AI was able to find tiny, obscure bugs in Google Chrome, Apple Safari, and the Linux operating system, and automatically link them together to take full control of a computer—completely without human help.\n\nAnthropic immediately notified Google, Apple, and Linux teams to release emergency security patches before bad actors could create similar AI hackers.",
        "why_it_matters": "This proves that AI is now smart enough to find and chain security vulnerabilities on its own. For developers, this means manual security checks are no longer fast enough—we have to use automated AI security scanners and memory-safe languages like Rust to protect our apps.",
        "applications": [
            "Using automated AI security tests in your deployment pipeline to catch bugs before shipping",
            "Switching sensitive services to memory-safe programming languages (like Rust or Go)",
            "Running untrusted user code inside isolated Docker containers so a hack cannot spread"
        ]
    },
    {
        "pattern": r"linux kernel bug|remote root access",
        "title": "Anthropic Frontier Model Identifies Remote Root Escalation Bug in Linux Kernel",
        "key_terms": [
            {
                "term": "Linux Kernel",
                "simple_explanation": "The core engine of the operating system that directly controls the computer's memory, CPU, and internet connection.",
                "analogy": "Like the captain and engine room of a ship—it has total authority over everything that happens."
            },
            {
                "term": "Race Condition",
                "simple_explanation": "A timing glitch that happens when two programs try to change the same piece of information at the exact same millisecond.",
                "analogy": "Like two people trying to withdraw the last $100 from an ATM at the exact same moment from different branches."
            },
            {
                "term": "Root Access",
                "simple_explanation": "The master administrative privilege that gives complete and unrestricted control over an entire computer system.",
                "analogy": "The master key that unlocks every single room, drawer, and safe in the entire building."
            }
        ],
        "summary": "Anthropic's security team announced that an autonomous reasoning AI discovered an obscure timing glitch inside the Linux kernel's networking code. This bug had been hiding in the code for over five years, invisible to regular security scanners.\n\nThe glitch allowed an outsider over the internet to secretly gain full administrative control ('root access'). Because the AI was able to think several steps ahead, it figured out the exact sequence to trigger the bug, allowing Linux engineers to patch it immediately.",
        "why_it_matters": "Traditional automated scanners look for obvious patterns, but they miss complex timing bugs. AI reasoning models can now uncover deep, subtle glitches that humans miss. Platform and cloud engineers can now use AI to find and fix bugs before hackers find them.",
        "applications": [
            "Setting up automated AI fuzzing tools to test cloud servers against timing glitches",
            "Testing network code inside isolated virtual sandboxes to safely reproduce crashes",
            "Automatically drafting code patches when security bugs are detected"
        ]
    },
    {
        "pattern": r"crawling opt-out|ai crawling|robots\.txt",
        "title": "Google, Anthropic, & Publishers Unveil Standardized Web AI Crawling Protocol",
        "key_terms": [
            {
                "term": "Web Crawler (Bot)",
                "simple_explanation": "An automated computer program that scans websites across the internet to read and copy their content.",
                "analogy": "Like a digital librarian that visits every bookstore in the world to make an index of all their pages."
            },
            {
                "term": "Robots.txt",
                "simple_explanation": "A simple text file website owners put on their servers asking search bots which pages they are allowed or not allowed to visit.",
                "analogy": "A 'Please Do Not Enter' sign posted on an office door—it asks visitors to stay out, but doesn't have a physical lock."
            },
            {
                "term": "RAG (Retrieval-Augmented Generation)",
                "simple_explanation": "A technique where an AI model searches a website or document database in real time to answer questions accurately with fresh facts.",
                "analogy": "An open-book exam where the student gets to look up answers in an encyclopedia instead of relying only on memory."
            }
        ],
        "summary": "A coalition including Google, Anthropic, and major news publishers has proposed a new official standard to replace the old 'robots.txt' system created back in 1994. Under the new protocol, websites can clearly tell AI bots what they are allowed to do.\n\nFor example, a website can now say: 'Google Search is welcome to index our articles, but AI companies cannot use our articles to train their models, and AI bots cannot scrape our paywalled content.'",
        "why_it_matters": "This removes legal confusion around AI web scraping. If you build web apps or AI tools that fetch data from the internet, you must update your servers to respect these new headers, or your servers could get blocked or face copyright notices.",
        "applications": [
            "Configuring website servers (Cloudflare / Next.js) to block unauthorized AI scrapers",
            "Building compliant data scrapers that respect modern publisher permissions",
            "Protecting your company's private documentation and premium APIs from being sucked into public AI models"
        ]
    },
    {
        "pattern": r"slashes funding|less than half of \$30 billion|openai.*round|tech anxieties",
        "title": "OpenAI Slashes Mega-Round Target by $10B Amid Compute CapEx & Margin Scrutiny",
        "key_terms": [
            {
                "term": "CapEx (Capital Expenditure)",
                "simple_explanation": "The huge upfront money a company spends on physical assets like supercomputers, graphics chips (GPUs), and data centers.",
                "analogy": "Buying the fleet of delivery trucks and the warehouse upfront, rather than just paying for the gas."
            },
            {
                "term": "Token Burn & Compute Margin",
                "simple_explanation": "The actual electricity and computing power cost every time an AI generates an answer, compared to what the user pays.",
                "analogy": "If an Uber driver charges $10 for a ride but burns $12 in gas, they have a negative compute margin."
            },
            {
                "term": "Semantic Caching",
                "simple_explanation": "Saving the AI's answer so that when another user asks a similar question, you return the saved answer instantly for free.",
                "analogy": "Keeping the most popular dish pre-cooked on the warmer so the chef doesn't have to cook it from scratch every 2 minutes."
            }
        ],
        "summary": "OpenAI decided to reduce its latest fundraising target by $10 billion after big investors asked tough questions about how much money it costs to run AI models. Building and running frontier AI requires hundreds of thousands of expensive computer chips and massive electricity bills.\n\nInvestors are now pushing AI companies to prove they can be profitable, shifting the focus from 'who has the biggest model' to 'who can run AI efficiently without losing money on every query.'",
        "why_it_matters": "Cheap, subsidized AI API pricing won't last forever. As AI providers raise prices or cut subsidies, developers need to make their apps efficient: caching repeated answers, using smaller local models for simple tasks, and tracking how many tokens each feature uses.",
        "applications": [
            "Setting up Redis caching to reuse AI answers and cut API costs by 60%+",
            "Using small, free local models for simple tasks and only calling expensive frontier APIs when necessary",
            "Adding cost dashboards so you know exactly which users and features cost the most"
        ]
    },
    {
        "pattern": r"safety rules weaken|staff warn|kill us all",
        "title": "Anthropic Internal Safety Governance Debate Intensifies Ahead of Market Transition",
        "key_terms": [
            {
                "term": "Safety Guardrails",
                "simple_explanation": "Filters and rule-checkers placed around an AI model to prevent it from giving dangerous advice, generating hate speech, or breaking rules.",
                "analogy": "Like a child-safety cap on a medicine bottle—it lets adults use the medicine safely while preventing accidents."
            },
            {
                "term": "Responsible Scaling Policy (RSP)",
                "simple_explanation": "A company pledge to pause making AI models smarter until security and safety tests prove the model is under control.",
                "analogy": "Like an automaker refusing to build a 300 MPH supercar until they have tested brakes that can safely stop it."
            },
            {
                "term": "Blast Radius",
                "simple_explanation": "The maximum amount of damage that can happen if a computer program crashes or does something wrong.",
                "analogy": "If a kitchen fire is contained in an oven, the blast radius is small; if the whole house burns down, the blast radius is catastrophic."
            }
        ],
        "summary": "Internal reports revealed a heated debate among researchers at Anthropic about how fast the company is releasing commercial AI products. Some safety researchers argued that fierce competition with OpenAI and Google is causing the industry to rush products out before all safety evaluations are completed.\n\nThe debate highlights a growing tension across Silicon Valley: the race to win market share versus the commitment to make sure autonomous AI systems remain safe and controllable.",
        "why_it_matters": "You cannot rely solely on AI providers to keep your software safe. If you build apps using AI, you must build your own safety checks, filters, and limits so an unexpected model response can never harm your users or corrupt your database.",
        "applications": [
            "Building independent input and output safety checks in Python using guardrail libraries",
            "Limiting what external tools an AI can call so it cannot accidentally delete files or databases",
            "Recording detailed audit logs of all AI decisions so you can review any errors"
        ]
    },
    {
        "pattern": r"bank regulators|stop their ai agents|banks block|open banking",
        "title": "Federal Regulators & Tier-1 Banks Restrict Autonomous Agent Financial Endpoints",
        "key_terms": [
            {
                "term": "Financial API Endpoint",
                "simple_explanation": "A secure digital doorway that allows apps to move money, check balances, or submit loan applications.",
                "analogy": "The drive-through window at a bank where you slide your ID and withdrawal slip to the teller."
            },
            {
                "term": "Human-in-the-Loop (HITL)",
                "simple_explanation": "A safety requirement where a real person must review and click 'Approve' before an AI can finalize an important action.",
                "analogy": "Like a bank teller asking you to sign a paper slip before handing you cash from your account."
            },
            {
                "term": "WebAuthn & Step-Up Verification",
                "simple_explanation": "Prompting the user for a physical fingerprint, Face ID, or hardware key when they try to perform a sensitive transaction.",
                "analogy": "Having a normal key to enter the building, but needing a biometric fingerprint scanner to open the vault."
            }
        ],
        "summary": "Major US banking regulators (including the Federal Reserve and FDIC) and top banks have begun cracking down on AI agents interacting with banking systems. Banks have noticed automated bots attempting to log into user accounts and make transfers on behalf of customers.\n\nBecause traditional web cookies and login tokens were designed for humans (not bots running 100 actions a minute), banks are blocking automated agents until strict new security rules and biometric verification are put in place.",
        "why_it_matters": "If you are building AI agents that touch money, payments, or sensitive accounts, you can't just let the bot do whatever it wants. You must build push notifications and biometric fingerprint confirmations so humans approve every money movement.",
        "applications": [
            "Triggering mobile push notifications asking users to confirm transactions before the AI executes them",
            "Using short-lived security tokens that expire after 5 minutes for automated tasks",
            "Checking financial app integrations against new Federal Reserve security standards"
        ]
    },
    {
        "pattern": r"react 19|server actions|compiler",
        "title": "React 19 Server Actions & React Compiler Architecture",
        "key_terms": [
            {
                "term": "Server Actions",
                "simple_explanation": "A React feature that lets you run backend server code directly from a button click or form submit without writing a separate API endpoint.",
                "analogy": "Like having a direct buzzer in your room to ring the kitchen, instead of writing an email to order room service."
            },
            {
                "term": "React Compiler",
                "simple_explanation": "A smart tool that automatically optimizes your React code so components only redraw when their data actually changes.",
                "analogy": "An editor who automatically removes all redundant sentences from your essay before it gets published."
            },
            {
                "term": "Client vs Server Components",
                "simple_explanation": "Server components run on the fast cloud computer before sending HTML to the browser; Client components run inside the user's phone or browser for interactivity.",
                "analogy": "The restaurant kitchen (Server) prepares the heavy meal; the dining table (Client) is where the diner interacts with the food."
            }
        ],
        "summary": "React 19 introduces a fundamental shift in how modern web apps are built. With Server Actions and the new React Compiler, developers no longer need to write boilerplate API route handlers or manually optimize performance using confusing hooks like useMemo and useCallback.\n\nNow, functions written in React can securely run on the server, talk directly to databases, and stream results back to the user's phone with lightning speed.",
        "why_it_matters": "Simplifies full-stack engineering dramatically. Instead of maintaining separate backend API routes and frontend state management, developers can write clean, unified code that runs on both the server and client with built-in speed optimizations.",
        "applications": [
            "Submitting forms directly to databases using Server Actions without writing boilerplate APIs",
            "Eliminating performance bugs by letting the React Compiler automatically optimize renders",
            "Streaming AI responses directly into user interfaces with React Server Components"
        ]
    },
    {
        "pattern": r"hidden physical laws|free exploration",
        "title": "Can LLMs Uncover Hidden Physical Laws through Free Exploration?",
        "key_terms": [
            {
                "term": "Scientific Discovery LLM",
                "simple_explanation": "An AI model trained not just to write essays, but to look at scientific experiment data and discover the mathematical rules that explain how nature works.",
                "analogy": "Like Isaac Newton watching thousands of apples fall and figuring out the formula for gravity."
            },
            {
                "term": "Free Exploration",
                "simple_explanation": "Letting an AI run virtual experiments on its own and learn from trial and error, without a human telling it what to do.",
                "analogy": "Giving a curious kid a chemistry set and letting them discover how vinegar reacts with baking soda by testing it themselves."
            },
            {
                "term": "Symbolic Regression",
                "simple_explanation": "Finding the exact, clean mathematical equation (like E=mc²) that matches a messy cloud of data points.",
                "analogy": "Connecting the dots on a puzzle page to reveal the hidden picture underneath."
            }
        ],
        "summary": "Researchers tested whether advanced AI models can discover the laws of physics on their own. Instead of feeding the AI textbook formulas, they let the AI run simulated physics experiments (like swinging pendulums and colliding particles).\n\nThe AI was able to explore the data, test hypotheses, and successfully rediscover fundamental formulas of motion, proving that AI can serve as a genuine scientific discovery partner rather than just a chatbot.",
        "why_it_matters": "Opens the door to AI discovering new battery chemistries, room-temperature superconductors, and life-saving medicines by running automated virtual lab experiments 24/7.",
        "applications": [
            "Running virtual physics and chemistry simulations to find new materials",
            "Using AI to discover mathematical formulas from messy real-world sensor data",
            "Building automated lab assistants that propose and test scientific hypotheses"
        ]
    }
]

# Universal Jargon Dictionary for any other discoveries
UNIVERSAL_JARGON = {
    "agent": {
        "term": "Autonomous Agent",
        "simple_explanation": "An AI program that doesn't just answer questions, but takes real actions on its own (like booking appointments, sending emails, or writing code).",
        "analogy": "Like a digital intern with a to-do list, rather than a search bar that just gives answers."
    },
    "rag": {
        "term": "RAG (Retrieval-Augmented Generation)",
        "simple_explanation": "A technique where an AI searches private documents or websites in real time to give accurate, up-to-date answers.",
        "analogy": "An open-book test where the AI looks up the facts in your notes before answering."
    },
    "fine-tuning": {
        "term": "Fine-Tuning",
        "simple_explanation": "Training an existing AI model on specific company examples so it talks in your brand voice or knows your proprietary codebase.",
        "analogy": "Taking an already skilled doctor and giving them specialized training in heart surgery."
    },
    "guardrails": {
        "term": "AI Guardrails",
        "simple_explanation": "Safety filters and validation rules placed around an AI to stop it from making mistakes or leaking private data.",
        "analogy": "Bumper lanes in bowling—they keep the ball on track no matter how badly you throw it."
    },
    "zero-day": {
        "term": "Zero-Day Vulnerability",
        "simple_explanation": "A security bug in software that the creators don't know about yet, leaving users unprotected until a patch is made.",
        "analogy": "A secret backdoor into a house that even the builder forgot existed."
    },
    "cache": {
        "term": "Semantic Caching",
        "simple_explanation": "Saving past AI answers so if someone asks a similar question later, the app returns the saved answer instantly for free.",
        "analogy": "Keeping the most popular dishes prepped on the counter so the kitchen doesn't have to cook from scratch every time."
    },
    "latency": {
        "term": "Inference Latency",
        "simple_explanation": "The amount of time (in milliseconds or seconds) it takes between asking the AI a question and getting the first word back.",
        "analogy": "The waiting time between ordering your coffee and the barista handing you the cup."
    },
    "context": {
        "term": "Context Window",
        "simple_explanation": "The maximum amount of text or code an AI can remember and read at the same time in a single conversation.",
        "analogy": "The size of your desk—how many open books you can lay out in front of you at once."
    },
    "docker": {
        "term": "Container Sandboxing",
        "simple_explanation": "Running an AI or piece of code in an isolated software bubble so that if it crashes or gets hacked, it cannot damage the main computer.",
        "analogy": "Like working with hazardous chemicals inside a sealed glass glovebox."
    },
    "api": {
        "term": "API (Application Programming Interface)",
        "simple_explanation": "A standardized digital messenger that allows two different computer programs to talk and share data with each other.",
        "analogy": "The waiter in a restaurant who takes your order to the kitchen and brings the food back."
    }
}

def generate_terms_for_discovery(disc: Discovery) -> list:
    """Finds matching terms based on title, summary, or category text."""
    combined = f"{disc.title} {disc.summary or ''} {disc.category or ''}".lower()
    matched = []
    seen = set()

    for key, item in UNIVERSAL_JARGON.items():
        if key in combined and item["term"] not in seen:
            matched.append(item)
            seen.add(item["term"])
            if len(matched) >= 3:
                break

    if not matched:
        # Default starter terms for AI telemetry
        matched = [
            UNIVERSAL_JARGON["agent"],
            UNIVERSAL_JARGON["guardrails"],
            UNIVERSAL_JARGON["api"]
        ]
    return matched

def run_enhancement():
    db = SessionLocal()
    try:
        discoveries = db.query(Discovery).all()
        print(f"Found {len(discoveries)} total discoveries in database.")
        
        enhanced_count = 0
        for disc in discoveries:
            matched_custom = False
            for entry in SIMPLE_EXPLANATION_CATALOG:
                if re.search(entry["pattern"], disc.title, re.IGNORECASE) or (disc.summary and re.search(entry["pattern"], disc.summary, re.IGNORECASE)):
                    disc.title = entry["title"]
                    disc.summary = entry["summary"]
                    disc.why_it_matters = entry["why_it_matters"]
                    disc.applications = entry["applications"]
                    disc.key_terms = entry["key_terms"]
                    matched_custom = True
                    enhanced_count += 1
                    break
            
            if not matched_custom:
                # Ensure every single discovery has key_terms and clean language
                disc.key_terms = generate_terms_for_discovery(disc)
                
                # If summary is too stiff or raw RSS, format cleanly
                if not disc.why_it_matters:
                    disc.why_it_matters = f"Understanding this update helps developers anticipate shifts in {disc.category or 'modern software engineering'} and adopt battle-tested production practices."
                
                if not disc.applications or len(disc.applications) == 0:
                    disc.applications = [
                        f"Deploying guardrails and evaluation tests in {disc.category or 'AI'} pipelines",
                        "Setting up automated monitoring and telemetry alerting for unexpected errors",
                        "Auditing existing architecture against emerging industry safety standards"
                    ]
        
        db.commit()
        print(f"Successfully enhanced {enhanced_count} curated discoveries and added key terms to all {len(discoveries)} discoveries.")
    finally:
        db.close()

if __name__ == "__main__":
    run_enhancement()

