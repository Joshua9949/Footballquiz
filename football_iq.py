# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *

import json
import re

# Error prefixes for validator agreement
ERROR_EXPECTED = "[EXPECTED]"
ERROR_LLM = "[LLM_ERROR]"

DEFAULT_MODEL_NAME = "gpt-5-mini"
DEFAULT_MAX_QUESTIONS = 15
HARD_MAX_QUESTIONS = 50

DEFAULT_SYSTEM_PROMPT = (
    "You are FootballIQ, an expert AI for football (soccer) trivia and "
    "conversation. Answer concisely with accurate facts about leagues, "
    "clubs, players, managers, and competitions. When generating quizzes, "
    "produce strict JSON only."
)

ALLOWED_DIFFICULTIES = ("easy", "medium", "hard")
ALLOWED_CATEGORIES = (
    "premier_league",
    "la_liga",
    "serie_a",
    "bundesliga",
    "ligue_1",
    "primeira_liga",
    "eredivisie",
    "belgian_pro",
    "mls",
    "super_lig",
    "champions_league",
    "players",
    "managers",
    "trophies",
)


def _normalize_addr(value: str) -> str:
    return value.strip().lower()


def _clean_json_text(text: str) -> str:
    """Strip wrapping text and trailing commas from LLM JSON output."""
    if not isinstance(text, str):
        return ""
    first = text.find("{")
    last = text.rfind("}")
    if first == -1 or last == -1 or last < first:
        return ""
    snippet = text[first : last + 1]
    snippet = re.sub(r",(\s*[}\]])", r"\1", snippet)
    return snippet


def _coerce_to_dict(raw) -> dict:
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        cleaned = _clean_json_text(raw)
        if cleaned:
            try:
                value = json.loads(cleaned)
                if isinstance(value, dict):
                    return value
            except Exception:
                return {}
    return {}


class FootballIQ(gl.Contract):
    # Storage layout — append only at end for upgradability
    owner: Address
    model_name: str
    system_prompt: str
    max_questions: u256
    last_chat: TreeMap[str, str]
    last_quiz: TreeMap[str, str]

    def __init__(self) -> None:
        self.owner = gl.message.sender_account
        self.model_name = DEFAULT_MODEL_NAME
        self.system_prompt = DEFAULT_SYSTEM_PROMPT
        self.max_questions = u256(DEFAULT_MAX_QUESTIONS)

    # ----- View methods -----

    @gl.public.view
    def get_config(self) -> str:
        return json.dumps(
            {
                "owner": str(self.owner),
                "model_name": self.model_name,
                "system_prompt": self.system_prompt,
                "max_questions": int(self.max_questions),
            }
        )

    @gl.public.view
    def get_last_chat(self, user: str) -> str:
        key = _normalize_addr(user)
        if key in self.last_chat:
            return self.last_chat[key]
        return "{}"

    @gl.public.view
    def get_last_quiz(self, user: str) -> str:
        key = _normalize_addr(user)
        if key in self.last_quiz:
            return self.last_quiz[key]
        return "{}"

    # ----- Owner-only deterministic writes -----

    @gl.public.write
    def set_owner(self, new_owner: str) -> None:
        self._require_owner()
        self.owner = Address(new_owner)

    @gl.public.write
    def set_model_name(self, model_name: str) -> None:
        self._require_owner()
        trimmed = model_name.strip()
        if trimmed == "":
            raise gl.vm.UserError(f"{ERROR_EXPECTED} model_name cannot be empty")
        self.model_name = trimmed

    @gl.public.write
    def set_system_prompt(self, new_prompt: str) -> None:
        self._require_owner()
        trimmed = new_prompt.strip()
        if trimmed == "":
            raise gl.vm.UserError(f"{ERROR_EXPECTED} system_prompt cannot be empty")
        self.system_prompt = trimmed

    @gl.public.write
    def set_max_questions(self, max_questions: int) -> None:
        self._require_owner()
        if max_questions < 1 or max_questions > HARD_MAX_QUESTIONS:
            raise gl.vm.UserError(
                f"{ERROR_EXPECTED} max_questions must be between 1 and {HARD_MAX_QUESTIONS}"
            )
        self.max_questions = u256(max_questions)

    # ----- Public AI writes -----
    #
    # Pattern (fixes E025 + E026):
    #   1. Read storage and build prompt deterministically.
    #   2. Run ONE eq_principle call; leader_fn does only the LLM call.
    #      No nested eq_principle. No nondet inside the eq_principle block.
    #   3. After eq_principle returns, do deterministic normalization
    #      and THEN write storage.

    @gl.public.write
    def football_chat(self, message: str, history_json: str) -> None:
        if not isinstance(message, str) or message.strip() == "":
            raise gl.vm.UserError(f"{ERROR_EXPECTED} message cannot be empty")

        sender_key = _normalize_addr(str(gl.message.sender_account))
        system_prompt = self.system_prompt
        prompt = self._build_chat_prompt(system_prompt, history_json, message)

        def leader_fn() -> str:
            return gl.exec_prompt(prompt)

        reply_text = gl.eq_principle.prompt_comparative(
            leader_fn,
            principle=(
                "Both responses must agree on factual football claims and "
                "overall meaning. Minor wording differences are acceptable."
            ),
        )

        # Storage writes happen here — OUTSIDE the eq_principle block.
        payload = json.dumps(
            {
                "user": sender_key,
                "message": message,
                "reply": str(reply_text),
                "history_json": history_json,
            }
        )
        self.last_chat[sender_key] = payload

    @gl.public.write
    def generate_player_quiz(
        self, player_name: str, difficulty: str, count: int
    ) -> None:
        self._require_difficulty(difficulty)
        if not isinstance(player_name, str) or player_name.strip() == "":
            raise gl.vm.UserError(f"{ERROR_EXPECTED} player_name cannot be empty")

        bounded = self._bound_count(count)
        sender_key = _normalize_addr(str(gl.message.sender_account))
        prompt = self._build_quiz_prompt(
            "player", player_name.strip(), difficulty, bounded
        )

        def leader_fn() -> str:
            return gl.exec_prompt(prompt)

        raw_quiz = gl.eq_principle.prompt_comparative(
            leader_fn,
            principle=(
                "Both quizzes must cover the same subject, same difficulty, "
                "and the same number of questions. Each question must have "
                "exactly four options and a single correct answer drawn "
                "from those options."
            ),
        )

        cleaned_json = self._normalize_quiz_output(
            raw_quiz, "player", player_name.strip(), difficulty, bounded
        )
        self.last_quiz[sender_key] = cleaned_json

    @gl.public.write
    def generate_category_quiz(
        self, category: str, difficulty: str, count: int
    ) -> None:
        self._require_difficulty(difficulty)
        if category not in ALLOWED_CATEGORIES:
            raise gl.vm.UserError(
                f"{ERROR_EXPECTED} category must be one of: "
                + ", ".join(ALLOWED_CATEGORIES)
            )

        bounded = self._bound_count(count)
        sender_key = _normalize_addr(str(gl.message.sender_account))
        prompt = self._build_quiz_prompt(
            "category", category, difficulty, bounded
        )

        def leader_fn() -> str:
            return gl.exec_prompt(prompt)

        raw_quiz = gl.eq_principle.prompt_comparative(
            leader_fn,
            principle=(
                "Both quizzes must cover the same category, same difficulty, "
                "and the same number of questions. Each question must have "
                "exactly four options and a single correct answer drawn "
                "from those options."
            ),
        )

        cleaned_json = self._normalize_quiz_output(
            raw_quiz, "category", category, difficulty, bounded
        )
        self.last_quiz[sender_key] = cleaned_json

    # ----- Internal deterministic helpers -----

    def _require_owner(self) -> None:
        if gl.message.sender_account != self.owner:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} only the owner can perform this action")

    def _require_difficulty(self, difficulty: str) -> None:
        if difficulty not in ALLOWED_DIFFICULTIES:
            raise gl.vm.UserError(
                f"{ERROR_EXPECTED} difficulty must be one of: "
                + ", ".join(ALLOWED_DIFFICULTIES)
            )

    def _bound_count(self, count: int) -> int:
        cap = int(self.max_questions)
        if count < 1:
            return 1
        if count > cap:
            return cap
        return count

    def _build_chat_prompt(
        self, system_prompt: str, history_json: str, message: str
    ) -> str:
        return (
            f"{system_prompt}\n\n"
            "Conversation history (JSON array of {role, content}, may be empty):\n"
            f"{history_json}\n\n"
            "Current user message:\n"
            f"{message}\n\n"
            "Reply naturally and concisely. Stay focused on football."
        )

    def _build_quiz_prompt(
        self,
        subject_kind: str,
        subject_value: str,
        difficulty: str,
        count: int,
    ) -> str:
        schema = (
            '{"subject_kind": "<kind>", "subject_value": "<value>", '
            '"difficulty": "<difficulty>", "questions": ['
            '{"id": "q1", "question": "...", "options": ["A","B","C","D"], '
            '"answer": "<one of options exactly>", "explanation": "..."}, ...]}'
        )
        return (
            "Generate a football quiz as STRICT JSON only — no prose, no "
            "markdown fences.\n\n"
            f"subject_kind: {subject_kind}\n"
            f"subject_value: {subject_value}\n"
            f"difficulty: {difficulty}\n"
            f"number_of_questions: {count}\n\n"
            "Rules:\n"
            "- Exactly the requested number of questions.\n"
            "- Each question must have exactly 4 options.\n"
            "- The 'answer' must be one of the 4 options, character-for-character.\n"
            "- Explanations should be one short sentence.\n"
            f"- Questions must be factually accurate at {difficulty} difficulty.\n\n"
            f"Schema:\n{schema}"
        )

    def _normalize_quiz_output(
        self,
        raw,
        subject_kind: str,
        subject_value: str,
        difficulty: str,
        count: int,
    ) -> str:
        data = _coerce_to_dict(raw)
        questions = data.get("questions") if isinstance(data, dict) else None
        if not isinstance(questions, list) or len(questions) == 0:
            raise gl.vm.UserError(
                f"{ERROR_LLM} quiz response did not contain a questions array"
            )

        cleaned = []
        for idx, question in enumerate(questions[:count]):
            if not isinstance(question, dict):
                continue
            options = question.get("options")
            if not isinstance(options, list) or len(options) < 4:
                continue
            opts = [str(o).strip() for o in options[:4]]
            if any(o == "" for o in opts):
                continue
            answer = str(question.get("answer", "")).strip()
            if answer not in opts:
                # Fall back to first option to keep the quiz consistent
                answer = opts[0]
            question_text = str(question.get("question", "")).strip()
            if question_text == "":
                continue
            cleaned.append(
                {
                    "id": str(question.get("id") or f"q{idx + 1}"),
                    "question": question_text,
                    "options": opts,
                    "answer": answer,
                    "explanation": str(question.get("explanation", "")).strip(),
                }
            )

        if len(cleaned) == 0:
            raise gl.vm.UserError(
                f"{ERROR_LLM} quiz had no questions that satisfied the schema"
            )

        return json.dumps(
            {
                "subject_kind": subject_kind,
                "subject_value": subject_value,
                "difficulty": difficulty,
                "questions": cleaned,
            }
        )
