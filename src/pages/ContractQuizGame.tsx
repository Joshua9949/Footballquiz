import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Home,
  RotateCcw,
  Timer,
  XCircle,
} from "lucide-react";
import {
  parseQuizPayloadStrict,
  type ContractQuizPayload,
  type Difficulty,
} from "@/lib/genlayer";

const STORAGE_KEY = "footballiq:last-contract-quiz";
const TIMEOUT_SENTINEL = "__TIMEOUT__";

const TIMER_SECONDS: Record<Difficulty, number> = {
  easy: 30,
  medium: 20,
  hard: 15,
};

interface ContractQuizRouteState {
  quiz?: unknown;
  txHash?: string;
}

function toTitleCase(value: string): string {
  return value
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function loadStoredQuiz(): unknown | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function ContractQuizGame() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const timedMode = searchParams.get("timed") === "true";

  const routeState = (location.state ?? {}) as ContractQuizRouteState;

  const resolved = useMemo(() => {
    const candidate = routeState.quiz ?? loadStoredQuiz();
    const parsed = parseQuizPayloadStrict(candidate);
    if (parsed.ok === false) {
      return { payload: null as ContractQuizPayload | null, error: parsed.error };
    }

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(parsed.value));
    }

    return { payload: parsed.value, error: "" };
  }, [routeState.quiz]);

  const payload = resolved.payload;
  const parseError = resolved.error;

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<(string | null)[]>([]);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!payload) {
      return;
    }
    setCurrent(0);
    setAnswers(new Array(payload.questions.length).fill(null));
    setScore(0);
    setFinished(false);
  }, [payload]);

  useEffect(() => {
    if (!payload || !timedMode || finished) {
      return;
    }
    setTimeLeft(TIMER_SECONDS[payload.difficulty] || 20);
  }, [current, payload, timedMode, finished]);

  useEffect(() => {
    if (!payload || !timedMode || finished) {
      return;
    }

    if (timeLeft <= 0 && answers[current] === null) {
      handleSelect(TIMEOUT_SENTINEL);
      return;
    }

    timerRef.current = setInterval(() => setTimeLeft((value) => value - 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [timeLeft, timedMode, finished, current, answers, payload]);

  if (!payload) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-4 py-10 text-center">
        <h1 className="mb-3 text-2xl font-bold text-foreground">No quiz payload available</h1>
        <p className="mb-6 text-sm text-destructive">{parseError || "Generate a quiz first."}</p>
        <button
          onClick={() => navigate("/quiz")}
          className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
        >
          Back to Quiz Setup
        </button>
      </div>
    );
  }

  const questions = payload.questions;
  const txHash = routeState.txHash;

  const handleSelect = (choice: string) => {
    if (answers[current] !== null) {
      return;
    }

    clearInterval(timerRef.current);
    const nextAnswers = [...answers];
    nextAnswers[current] = choice;
    setAnswers(nextAnswers);

    if (choice !== TIMEOUT_SENTINEL && choice === questions[current]?.answer) {
      setScore((value) => value + 1);
    }
  };

  const goTo = (index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrent(index);
    }
  };

  const next = () => {
    if (current + 1 >= questions.length) {
      setFinished(true);
    } else {
      setCurrent((value) => value + 1);
    }
  };

  const prev = () => {
    if (current > 0) {
      setCurrent((value) => value - 1);
    }
  };

  const restart = () => {
    setCurrent(0);
    setAnswers(new Array(questions.length).fill(null));
    setScore(0);
    setFinished(false);
  };

  if (!questions.length) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">No questions in payload.</p>
      </div>
    );
  }

  if (finished) {
    const pct = Math.round((score / questions.length) * 100);

    return (
      <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-10 text-center">
        <div className="mb-4 text-6xl">{pct >= 80 ? "🏆" : pct >= 50 ? "⚽" : "😅"}</div>
        <h1 className="mb-2 text-3xl font-bold text-foreground">Quiz Complete</h1>
        <p className="mb-1 text-sm text-muted-foreground">
          {toTitleCase(payload.subject_value)} • {payload.difficulty}
          {timedMode ? " • timed" : ""}
        </p>
        <p className="mb-4 text-5xl font-extrabold text-primary">
          {score}/{questions.length}
        </p>

        <div className="mb-6 w-full max-w-xs">
          <div className="h-3 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{pct}% correct</p>
        </div>

        <div className="mb-8 w-full space-y-2 text-left">
          {questions.map((question, index) => {
            const answer = answers[index];
            const isCorrect = answer === question.answer;
            return (
              <div
                key={question.id}
                className={`rounded-lg border p-3 text-sm ${
                  isCorrect
                    ? "border-primary/30 bg-accent/50"
                    : "border-destructive/30 bg-destructive/5"
                }`}
              >
                <p className="font-medium text-foreground">{index + 1}. {question.question}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {answer === TIMEOUT_SENTINEL
                    ? `⏱️ Time's up. Correct: ${question.answer}`
                    : isCorrect
                      ? `✅ ${question.answer}`
                      : `❌ ${answer ?? "Skipped"} → ✅ ${question.answer}`}
                </p>
                {question.explanation && (
                  <p className="mt-1 text-xs text-muted-foreground">{question.explanation}</p>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex gap-3">
          <button
            onClick={restart}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground"
          >
            <RotateCcw className="h-4 w-4" /> Retry
          </button>
          <button
            onClick={() => navigate("/quiz")}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-3 font-bold text-card-foreground"
          >
            <Home className="h-4 w-4" /> Quizzes
          </button>
        </div>
      </div>
    );
  }

  const question = questions[current];
  const selectedAnswer = answers[current];

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 pb-24 md:pb-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {toTitleCase(payload.subject_kind)} • {toTitleCase(payload.subject_value)} • {payload.difficulty}
          </p>
          <p className="text-sm font-medium text-foreground">
            Question {current + 1} of {questions.length}
          </p>
          {txHash && (
            <p className="text-xs text-muted-foreground">
              tx: <span className="font-mono">{txHash}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {timedMode && (
            <div
              className={`flex items-center gap-1 rounded-lg px-3 py-1 text-sm font-bold ${
                timeLeft <= 5
                  ? "animate-pulse bg-destructive/10 text-destructive"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <Timer className="h-4 w-4" />
              {timeLeft}s
            </div>
          )}
          <div className="rounded-lg bg-accent px-3 py-1 text-sm font-bold text-accent-foreground">
            Score: {score}
          </div>
        </div>
      </div>

      <div className="mb-4 h-2 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${((current + 1) / questions.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <div className="mb-6 flex flex-wrap justify-center gap-1.5">
        {questions.map((item, index) => {
          const answer = answers[index];
          const isCorrect = answer !== null && answer === item.answer;
          return (
            <button
              key={item.id}
              onClick={() => goTo(index)}
              className={`h-3 w-3 rounded-full transition-all ${
                index === current
                  ? "scale-125 bg-primary"
                  : answer === null
                    ? "bg-muted-foreground/20"
                    : isCorrect
                      ? "bg-primary/40"
                      : "bg-destructive/40"
              }`}
              title={`Question ${index + 1}`}
            />
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={question.id}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.2 }}
        >
          <h2 className="mb-6 text-xl font-bold text-foreground md:text-2xl">{question.question}</h2>

          <div className="space-y-3">
            {question.options.map((option, index) => {
              let style = "border-border bg-card text-card-foreground hover:border-primary/50";

              if (selectedAnswer !== null) {
                if (option === question.answer) {
                  style = "border-primary bg-accent text-accent-foreground";
                } else if (option === selectedAnswer) {
                  style = "border-destructive bg-destructive/10 text-destructive";
                } else {
                  style = "border-border bg-card text-muted-foreground opacity-50";
                }
              }

              return (
                <motion.button
                  key={`${question.id}-${option}`}
                  onClick={() => handleSelect(option)}
                  disabled={selectedAnswer !== null}
                  className={`flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${style}`}
                  whileHover={selectedAnswer === null ? { scale: 1.01 } : {}}
                  whileTap={selectedAnswer === null ? { scale: 0.99 } : {}}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-sm font-bold">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="flex-1 font-medium">{option}</span>
                  {selectedAnswer !== null && option === question.answer && (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  )}
                  {selectedAnswer === option && option !== question.answer && (
                    <XCircle className="h-5 w-5 text-destructive" />
                  )}
                </motion.button>
              );
            })}
          </div>

          {selectedAnswer !== null && question.explanation && (
            <div className="mt-4 rounded-lg border border-border bg-card/50 p-3 text-sm text-muted-foreground">
              {question.explanation}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <motion.div className="mt-6 flex items-center justify-between" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <button
          onClick={prev}
          disabled={current === 0}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 font-bold text-card-foreground disabled:opacity-30"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        {selectedAnswer !== null && (
          <button
            onClick={next}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground"
          >
            {current + 1 >= questions.length ? "See Results" : "Next"}
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </motion.div>
    </div>
  );
}
