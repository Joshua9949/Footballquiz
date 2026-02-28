import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getQuestions, leagues, type QuizQuestion, type Difficulty } from "@/lib/quizData";
import { CheckCircle2, XCircle, ArrowRight, ArrowLeft, RotateCcw, Home, Timer, Clock } from "lucide-react";

const TIMER_SECONDS: Record<Difficulty, number> = {
  easy: 30,
  medium: 20,
  hard: 15,
};

export default function QuizGame() {
  const { leagueId, difficulty } = useParams<{ leagueId: string; difficulty: string }>();
  const [searchParams] = useSearchParams();
  const timedMode = searchParams.get("timed") === "true";
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const league = leagues.find((l) => l.id === leagueId);
  const leagueName = leagueId === "players" ? "Player Quiz" : leagueId === "managers" ? "Manager Quiz" : league?.name || "";
  const leagueEmoji = leagueId === "players" ? "👤" : leagueId === "managers" ? "🧑‍💼" : league?.emoji || "";

  useEffect(() => {
    if (leagueId && difficulty) {
      const q = getQuestions(leagueId, difficulty as Difficulty);
      setQuestions(q);
      setAnswers(new Array(q.length).fill(null));
      setCurrent(0);
      setScore(0);
      setFinished(false);
    }
  }, [leagueId, difficulty]);

  // Timer
  useEffect(() => {
    if (!timedMode || finished || !questions.length) return;
    setTimeLeft(TIMER_SECONDS[difficulty as Difficulty] || 20);
  }, [current, timedMode, difficulty, finished, questions.length]);

  useEffect(() => {
    if (!timedMode || finished) return;
    if (timeLeft <= 0 && answers[current] === null) {
      handleSelect(-1); // auto-skip on timeout
      return;
    }
    timerRef.current = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [timeLeft, timedMode, finished, current]);

  const handleSelect = useCallback(
    (idx: number) => {
      if (answers[current] !== null) return;
      clearInterval(timerRef.current);
      const newAnswers = [...answers];
      newAnswers[current] = idx;
      setAnswers(newAnswers);
      if (idx === questions[current]?.correctAnswer) {
        setScore((s) => s + 1);
      }
    },
    [answers, current, questions]
  );

  const goTo = (index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrent(index);
    }
  };

  const next = () => {
    if (current + 1 >= questions.length) {
      setFinished(true);
    } else {
      setCurrent((c) => c + 1);
    }
  };

  const prev = () => {
    if (current > 0) setCurrent((c) => c - 1);
  };

  if (!questions.length) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-5xl animate-bounce">⚽</div>
          <p className="text-muted-foreground">Loading questions...</p>
        </div>
      </div>
    );
  }

  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-10 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.4 }}>
          <div className="mb-4 text-7xl">{pct >= 80 ? "🏆" : pct >= 50 ? "⚽" : "😅"}</div>
        </motion.div>
        <h1 className="mb-2 text-3xl font-bold text-foreground">Quiz Complete!</h1>
        <p className="mb-1 text-lg text-muted-foreground">
          {leagueEmoji} {leagueName} — {difficulty}
          {timedMode && " ⏱️ Timed"}
        </p>
        <motion.p
          className="mb-4 text-5xl font-extrabold text-primary"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring" }}
        >
          {score}/{questions.length}
        </motion.p>
        <div className="mb-6 w-full max-w-xs">
          <div className="h-3 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ delay: 0.5, duration: 0.8 }}
            />
          </div>
          <p className="mt-2 text-sm font-medium text-muted-foreground">{pct}% correct</p>
        </div>
        <p className="mb-8 text-muted-foreground">
          {pct >= 80 ? "🔥 Incredible! You're a true expert!" : pct >= 50 ? "👏 Good job! Keep learning!" : "💪 Better luck next time!"}
        </p>

        {/* Review answers */}
        <div className="mb-8 w-full space-y-2 text-left">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Review Answers</h3>
          {questions.map((q, i) => (
            <div
              key={i}
              className={`rounded-lg border p-3 text-sm ${
                answers[i] === q.correctAnswer
                  ? "border-primary/30 bg-accent/50"
                  : "border-destructive/30 bg-destructive/5"
              }`}
            >
              <p className="font-medium text-foreground">{i + 1}. {q.question}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {answers[i] === -1 ? "⏱️ Time's up!" : answers[i] === q.correctAnswer ? "✅ " + q.options[q.correctAnswer] : `❌ ${answers[i] !== null ? q.options[answers[i]!] : "Skipped"} → ✅ ${q.options[q.correctAnswer]}`}
              </p>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => navigate(`/quiz/${leagueId}/${difficulty}${timedMode ? "?timed=true" : ""}`)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground transition-all hover:scale-105"
          >
            <RotateCcw className="h-4 w-4" /> Retry
          </button>
          <button
            onClick={() => navigate("/quiz")}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-3 font-bold text-card-foreground transition-all hover:scale-105"
          >
            <Home className="h-4 w-4" /> Quizzes
          </button>
        </div>
      </div>
    );
  }

  const q = questions[current];
  const selected = answers[current];

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 pb-24 md:pb-10">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {leagueEmoji} {leagueName} • {difficulty}
          </p>
          <p className="text-sm font-medium text-foreground">
            Question {current + 1} of {questions.length}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {timedMode && (
            <div className={`flex items-center gap-1 rounded-lg px-3 py-1 text-sm font-bold ${
              timeLeft <= 5 ? "bg-destructive/10 text-destructive animate-pulse" : "bg-muted text-muted-foreground"
            }`}>
              <Timer className="h-4 w-4" />
              {timeLeft}s
            </div>
          )}
          <div className="rounded-lg bg-accent px-3 py-1 text-sm font-bold text-accent-foreground">
            Score: {score}
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${((current + 1) / questions.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Question navigation dots */}
      <div className="mb-6 flex flex-wrap gap-1.5 justify-center">
        {questions.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`h-3 w-3 rounded-full transition-all ${
              i === current
                ? "bg-primary scale-125"
                : answers[i] !== null
                ? answers[i] === questions[i].correctAnswer
                  ? "bg-primary/40"
                  : "bg-destructive/40"
                : "bg-muted-foreground/20"
            }`}
            title={`Question ${i + 1}`}
          />
        ))}
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.25 }}
        >
          <h2 className="mb-6 text-xl font-bold text-foreground md:text-2xl">{q.question}</h2>

          <div className="space-y-3">
            {q.options.map((opt, idx) => {
              let style = "border-border bg-card text-card-foreground hover:border-primary/50";
              if (selected !== null) {
                if (idx === q.correctAnswer) {
                  style = "border-primary bg-accent text-accent-foreground";
                } else if (idx === selected) {
                  style = "border-destructive bg-destructive/10 text-destructive";
                } else {
                  style = "border-border bg-card text-muted-foreground opacity-50";
                }
              }

              return (
                <motion.button
                  key={idx}
                  onClick={() => handleSelect(idx)}
                  disabled={selected !== null}
                  className={`flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${style}`}
                  whileHover={selected === null ? { scale: 1.01 } : {}}
                  whileTap={selected === null ? { scale: 0.99 } : {}}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-sm font-bold">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="flex-1 font-medium">{opt}</span>
                  {selected !== null && idx === q.correctAnswer && (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  )}
                  {selected === idx && idx !== q.correctAnswer && (
                    <XCircle className="h-5 w-5 text-destructive" />
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <motion.div className="mt-6 flex items-center justify-between" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <button
          onClick={prev}
          disabled={current === 0}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 font-bold text-card-foreground transition-all hover:scale-105 disabled:opacity-30"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        {selected !== null && (
          <button
            onClick={next}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground transition-all hover:scale-105"
          >
            {current + 1 >= questions.length ? "See Results" : "Next"}
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </motion.div>
    </div>
  );
}
