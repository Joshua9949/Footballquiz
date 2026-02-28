import { useState } from "react";
import { motion } from "framer-motion";
import { Flame, Skull, Star, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import TransactionStatusCard from "@/components/TransactionStatusCard";
import { leagues } from "@/lib/quizData";
import {
  CATEGORY_MAP,
  generateCategoryQuiz,
  INITIAL_TX_PROGRESS,
  parseJsonStrict,
  parseQuizPayloadStrict,
  type Difficulty,
  type TxProgressState,
} from "@/lib/genlayer";

const difficulties: { value: Difficulty; label: string; icon: typeof Star; description: string }[] = [
  { value: "easy", label: "Easy", icon: Star, description: "Perfect for warming up" },
  { value: "medium", label: "Medium", icon: Flame, description: "For regular fans" },
  { value: "hard", label: "Hard", icon: Skull, description: "Only true experts" },
];

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export default function QuizSetup() {
  const [selectedLeague, setSelectedLeague] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>("medium");
  const [questionCount, setQuestionCount] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [txStatus, setTxStatus] = useState<TxProgressState>(INITIAL_TX_PROGRESS);
  const navigate = useNavigate();

  const [result, setResult] = useState<{
    txHash: string;
    message?: string;
    parseError?: string;
  } | null>(null);

  const generateQuiz = async () => {
    if (!selectedLeague || isLoading) {
      return;
    }

    const category = CATEGORY_MAP[selectedLeague as keyof typeof CATEGORY_MAP];
    if (!category) {
      setResult({
        txHash: "",
        parseError: `Unsupported category mapping for ${selectedLeague}`,
      });
      return;
    }

    const boundedCount = Math.max(1, Math.min(50, Math.trunc(questionCount || 10)));

    setIsLoading(true);
    setResult(null);
    setTxStatus(INITIAL_TX_PROGRESS);

    try {
      const txResult = await generateCategoryQuiz(
        category,
        selectedDifficulty,
        boundedCount,
        setTxStatus,
      );

      const parsed = parseJsonStrict(txResult.json);
      if (parsed.ok === false) {
        setResult({
          txHash: txResult.txHash,
          parseError: `Malformed JSON from contract: ${parsed.error}`,
        });
        return;
      }

      const quizPayload = parseQuizPayloadStrict(parsed.value);
      if (quizPayload.ok === false) {
        setResult({
          txHash: txResult.txHash,
          parseError: `Invalid quiz payload: ${quizPayload.error}`,
        });
        return;
      }

      navigate("/quiz/contract", {
        state: {
          quiz: quizPayload.value,
          txHash: txResult.txHash,
        },
      });
    } catch (error) {
      setResult({
        txHash: "",
        parseError: `Contract call failed: ${toErrorMessage(error)}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 pb-24 md:pb-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="mb-2 flex items-center gap-2 text-3xl font-bold text-foreground">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Trophy className="h-6 w-6" />
          </div>
          Category Quiz Generator
        </h1>
        <p className="text-muted-foreground">
          Calls <span className="font-mono">generate_category_quiz(category, difficulty, count)</span>
        </p>
      </motion.div>

      <div className="mb-6">
        <TransactionStatusCard status={txStatus} />
      </div>

      <div className="mb-10">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Difficulty</h2>
        <div className="grid grid-cols-3 gap-3">
          {difficulties.map((difficulty) => (
            <button
              key={difficulty.value}
              onClick={() => setSelectedDifficulty(difficulty.value)}
              className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                selectedDifficulty === difficulty.value
                  ? "border-primary bg-accent text-accent-foreground shadow-md"
                  : "border-border bg-card text-card-foreground hover:border-primary/50"
              }`}
            >
              <difficulty.icon
                className={`h-6 w-6 ${
                  selectedDifficulty === difficulty.value ? "text-primary" : "text-muted-foreground"
                }`}
              />
              <span className="font-bold">{difficulty.label}</span>
              <span className="hidden text-xs text-muted-foreground sm:block">
                {difficulty.description}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="mb-10">
        <h2 className="mb-4 text-lg font-semibold text-foreground">League / Competition</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {leagues.map((league) => (
            <motion.button
              key={league.id}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedLeague(league.id)}
              className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                selectedLeague === league.id
                  ? "border-primary bg-accent text-accent-foreground shadow-md"
                  : "border-border bg-card text-card-foreground hover:border-primary/50"
              }`}
            >
              <span className="text-2xl">{league.emoji}</span>
              <div>
                <div className="text-sm font-bold leading-tight">{league.name}</div>
                <div className="text-xs text-muted-foreground">{league.country}</div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      <div className="mb-8 max-w-sm">
        <label className="mb-2 block text-sm font-semibold text-foreground">Question Count (1-50)</label>
        <input
          type="number"
          min={1}
          max={50}
          value={questionCount}
          onChange={(event) => setQuestionCount(Number(event.target.value))}
          className="w-full rounded-xl border border-border bg-card px-4 py-3 text-card-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <motion.button
        onClick={generateQuiz}
        disabled={!selectedLeague || isLoading}
        className="w-full rounded-xl bg-primary py-4 text-lg font-bold text-primary-foreground shadow-lg transition-all hover:scale-[1.02] disabled:opacity-40 disabled:hover:scale-100"
        whileTap={{ scale: 0.98 }}
      >
        {isLoading ? "Generating via consensus..." : "Generate Category Quiz"}
      </motion.button>

      {result && (
        <div className="mt-8 rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-3 text-lg font-bold text-foreground">Contract Response Status</h3>
          {result.parseError ? (
            <p className="text-sm text-destructive">{result.parseError}</p>
          ) : (
            <p className="text-sm text-foreground">{result.message ?? "Quiz payload parsed."}</p>
          )}
          {result.txHash && (
            <p className="mt-3 text-xs text-muted-foreground">
              tx: <span className="font-mono">{result.txHash}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
