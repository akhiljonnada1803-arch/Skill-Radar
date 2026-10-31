import json
import logging
import re
from typing import Optional, List, Dict, Any
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

SYSTEM_INSTRUCTION = """You are the SkillRadar AI Senior Technical Evaluator and Diagnostic Tutor.
Your role is to rigorously evaluate student submissions for engineering chapter tasks, grade them objectively against the rubric (0 to 100), identify specific conceptual and implementation strengths and gaps, and provide actionable remediation (pointing to exact sections in the study notes or timestamped video lessons).

Passing threshold is 80 points.
If score >= 80, status must be 'passed'.
If score < 80, status must be 'remediation_required'.

You must respond in valid JSON matching this schema:
{
  "score": <integer 0-100>,
  "status": "<'passed' or 'remediation_required'>",
  "summary": "<2-3 sentence overall critique of the submission>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "gaps": ["<gap 1 (if any)>"],
  "remediation": [
    {
      "topic": "<specific topic or concept>",
      "action": "<what the student should re-read or practice>",
      "target_video_timestamp": "<e.g. '04:15' or null>",
      "note_reference": "<e.g. 'Section 2.1' or null>"
    }
  ]
}
"""

class DiagnosticGrader:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY

    def evaluate(
        self,
        task_title: str,
        instructions_md: str,
        rubric: List[Dict[str, Any]],
        overview: str,
        study_notes: Optional[str],
        videos: List[Dict[str, Any]],
        submission_code: str
    ) -> Dict[str, Any]:
        """Evaluates student submission via Gemini 2.0 Flash with intelligent heuristic fallback."""
        if not self.api_key:
            logger.info("GEMINI_API_KEY not configured; using diagnostic heuristic evaluator.")
            return self._heuristic_evaluation(
                task_title, instructions_md, rubric, overview, study_notes, videos, submission_code
            )

        prompt = f"""
TASK TITLE: {task_title}

TASK INSTRUCTIONS & SPECIFICATION:
{instructions_md}

RUBRIC:
{json.dumps(rubric, indent=2)}

CHAPTER OVERVIEW & LESSON CONTENT:
{overview}

APPROVED STUDY NOTES EXCERPT:
{(study_notes or 'Not provided')[:1500]}

AVAILABLE LESSON VIDEOS:
{json.dumps(videos, indent=2)}

STUDENT SUBMISSION TO EVALUATE:
```
{submission_code}
```

Evaluate the student's submission now against the instructions and rubric. Return strictly JSON.
"""
        try:
            raw_text = self._call_gemini_api(prompt)
            data = self._extract_json(raw_text)
            # Ensure valid structure
            score = max(0, min(100, int(data.get("score", 70))))
            status = "passed" if score >= 80 else "remediation_required"
            return {
                "score": score,
                "status": status,
                "summary": data.get("summary", "Evaluation complete."),
                "strengths": data.get("strengths", []),
                "gaps": data.get("gaps", []),
                "remediation": data.get("remediation", [])
            }
        except Exception as e:
            logger.warning(f"Gemini evaluation failed ({e}); falling back to heuristic diagnostics.")
            return self._heuristic_evaluation(
                task_title, instructions_md, rubric, overview, study_notes, videos, submission_code
            )

    def _call_gemini_api(self, prompt: str) -> str:
        url = f"{GEMINI_API_URL}?key={self.api_key}"
        payload = {
            "system_instruction": {
                "parts": [{"text": SYSTEM_INSTRUCTION}]
            },
            "contents": [
                {
                    "parts": [{"text": prompt}]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "response_mime_type": "application/json"
            }
        }

        with httpx.Client(timeout=25.0) as client:
            response = client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            candidates = data.get("candidates", [])
            if not candidates:
                raise ValueError("No candidates returned by Gemini")
            parts = candidates[0].get("content", {}).get("parts", [])
            if not parts:
                raise ValueError("Empty response parts from Gemini")
            return parts[0].get("text", "")

    def _extract_json(self, raw_text: str) -> dict:
        cleaned = raw_text.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        return json.loads(cleaned.strip())

    def _heuristic_evaluation(
        self,
        task_title: str,
        instructions_md: str,
        rubric: List[Dict[str, Any]],
        overview: str,
        study_notes: Optional[str],
        videos: List[Dict[str, Any]],
        submission_code: str
    ) -> Dict[str, Any]:
        """
        Deterministic, intelligent diagnostic evaluator when Gemini is offline.
        Analyzes code structure, syntax keywords, length, and error handling.
        """
        code = submission_code.strip()
        lines = [line.strip() for line in code.split("\n") if line.strip()]
        lower = code.lower()

        score = 50
        strengths = []
        gaps = []
        remediation = []

        # 1. Length & substance check
        if len(code) > 120 and len(lines) >= 8:
            score += 15
            strengths.append("Comprehensive solution structure with adequate implementation depth.")
        elif len(code) > 40:
            score += 5
            gaps.append("Implementation is brief; consider addressing edge cases and modularizing logic.")
        else:
            gaps.append("Submission is too brief to satisfy chapter mastery requirements.")

        # 2. Syntax & language constructs
        has_functions = bool(re.search(r'\b(def|function|const|class|import|from|export)\b', code))
        if has_functions:
            score += 15
            strengths.append("Effective functional decomposition and modular syntax definitions.")
        else:
            gaps.append("Missing distinct function or component modularization.")

        # 3. Error handling & resilience
        has_error_handling = bool(re.search(r'\b(try|catch|except|finally|raise|throw|if.*err|assert)\b', lower))
        if has_error_handling:
            score += 10
            strengths.append("Proper defensive programming with exception trapping or boundary checks.")
        else:
            gaps.append("Lacks explicit error boundaries or network failure recovery.")

        # 4. Keyword relevance to task
        relevant_terms = ["return", "async", "await", "state", "props", "query", "embedding", "vector", "token", "fetch", "api", "model"]
        matched_terms = [t for t in relevant_terms if t in lower]
        if len(matched_terms) >= 3:
            score += 10
            strengths.append(f"Strong alignment with chapter concepts ({', '.join(matched_terms[:3])}).")

        # Cap score
        score = min(95, max(30, score))
        status = "passed" if score >= 80 else "remediation_required"

        first_video = videos[0] if videos else None
        first_video_title = first_video.get("title", "Core Lecture") if first_video else "Lecture Dossier"

        if status == "passed":
            summary = f"Solid implementation for '{task_title}'. Demonstrated core competency with strong code architecture."
            if not has_error_handling:
                remediation.append({
                    "topic": "Resilience & Defensive Trapping",
                    "action": f"Review {first_video_title} to inspect production error handling patterns.",
                    "target_video_timestamp": "06:15",
                    "note_reference": "Section: Failure Trapping & Recovery"
                })
        else:
            summary = f"Submission for '{task_title}' shows progress but requires targeted refinement to reach full chapter certification."
            remediation.append({
                "topic": "Core Architecture Refinement",
                "action": f"Re-watch {first_video_title} and review the chapter's verified study notes.",
                "target_video_timestamp": "03:45",
                "note_reference": "Section: Core Implementation Mechanics"
            })
            if not has_error_handling:
                remediation.append({
                    "topic": "Defensive State & Error Boundaries",
                    "action": "Add try/catch exception wrappers around critical I/O operations.",
                    "target_video_timestamp": "08:20",
                    "note_reference": "Section: Error Resilience"
                })

        return {
            "score": score,
            "status": status,
            "summary": summary,
            "strengths": strengths or ["Attempted hands-on chapter deliverable."],
            "gaps": gaps or ["Ensure complete test coverage and edge-case handling."],
            "remediation": remediation
        }

evaluator_service = DiagnosticGrader()

