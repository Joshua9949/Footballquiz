import { useState } from "react";
import { motion } from "framer-motion";
import { Award, Flame, Skull, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import TransactionStatusCard from "@/components/TransactionStatusCard";
import {
  generateCategoryQuiz,
  INITIAL_TX_PROGRESS,
  parseJsonStrict,
  parseQuizPayloadStrict,
  type Difficulty,
  type TxProgressState,
} from "@/lib/genlayer";

const famousManagers = [
  "Sir Alex Ferguson",
  "Pep Guardiola",
  "José Mourinho",
  "Carlo Ancelotti",
  "Jürgen Klopp",
  "Zinedine Zidane",
  "Arsène Wenger",
  "Marcelo Bielsa",
  "Rinus Michels",
  "Brian Clough",
  "Bill Shankly",
  "Johan Cruyff",
];

const difficulties: { value: Difficulty; label: string; icon: typeof Star; desc: string }[] = [
  { value: "easy", label: "Easy", icon: Star, desc: "Basic manager facts" },
  { value: "medium", label: "Medium", icon: Flame, desc: "Tactics and achievements" },
  { value: "hard", label: "Hard", icon: Skull, desc: "Advanced football strategy" },
];

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export default function ManagerQuiz() {
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>("medium");
  const [count, setCount] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [txStatus, setTxStatus] = useState<TxProgressState>(INITIAL_TX_PROGRESS);
  const navigate = useNavigate();
  const [result, setResult] = useState<{
    txHash: string;
    message?: string;
    parseError?: string;
  } | null>(null);

  const generateManagersQuiz = async () => {
    const boundedCount = Math.max(1, Math.min(50, Math.trunc(count || 10)));

    setIsLoading(true);
    setResult(null);
    setTxStatus(INITIAL_TX_PROGRESS);

    try {
      const txResult = await generateCategoryQuiz(
        "managers",
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
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="mb-2 flex items-center gap-2 text-3xl font-bold text-foreground">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
            <Award className="h-6 w-6" />
          </div>
          Manager Quiz Generator
        </h1>
        <p className="mb-8 text-muted-foreground">
          Calls <span className="font-mono">generate_category_quiz("managers", difficulty, count)</span>
        </p>
      </motion.div>

      <div className="mb-6">
        <TransactionStatusCard status={txStatus} />
      </div>

      <div className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground">Difficulty</h2>
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
              <span className="hidden text-xs text-muted-foreground sm:block">{difficulty.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mb-8 max-w-sm">
        <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-foreground">
          Question Count (1-50)
        </label>
        <input
          type="number"
          min={1}
          max={50}
          value={count}
          onChange={(event) => setCount(Number(event.target.value))}
          className="w-full rounded-xl border border-border bg-card px-4 py-3 text-card-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground">Featured Managers</h2>
        <div className="flex flex-wrap gap-2">
          {famousManagers.map((manager) => (
            <motion.span
              key={manager}
              whileHover={{ scale: 1.05 }}
              className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-card-foreground"
            >
              🧑‍💼 {manager}
            </motion.span>
          ))}
        </div>
      </div>

      <button
        onClick={generateManagersQuiz}
        disabled={isLoading}
        className="w-full rounded-xl bg-primary py-4 text-lg font-bold text-primary-foreground shadow-lg transition-all hover:scale-[1.02] disabled:opacity-40 disabled:hover:scale-100"
      >
        {isLoading
          ? "Generating via consensus..."
          : `Generate Managers Quiz (${selectedDifficulty})`}
      </button>

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
