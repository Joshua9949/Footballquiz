import { FormEvent, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Settings2 } from "lucide-react";
import DynamicJsonView from "@/components/DynamicJsonView";
import TransactionStatusCard from "@/components/TransactionStatusCard";
import {
  getClientAddress,
  getConfig,
  getLastChat,
  getLastQuiz,
  INITIAL_TX_PROGRESS,
  parseJsonStrict,
  setMaxQuestions,
  setModelName,
  setOwner,
  setSystemPrompt,
  type TxProgressState,
} from "@/lib/genlayer";

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

type ParsedState = {
  raw: string;
  parsed?: unknown;
  parseError?: string;
};

function makeParsedState(raw: string): ParsedState {
  const parsed = parseJsonStrict(raw);
  if (parsed.ok === false) {
    return {
      raw,
      parseError: `Malformed JSON from contract: ${parsed.error}`,
    };
  }
  return { raw, parsed: parsed.value };
}

export default function ContractConsole() {
  const [connectedAddress, setConnectedAddress] = useState<string>("");
  const [lookupAddress, setLookupAddress] = useState<string>("");

  const [modelName, setModelNameValue] = useState("gpt-5-mini");
  const [newOwner, setNewOwnerValue] = useState("");
  const [systemPrompt, setSystemPromptValue] = useState("");
  const [maxQuestions, setMaxQuestionsValue] = useState(15);

  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);
  const [isWriting, setIsWriting] = useState(false);

  const [configState, setConfigState] = useState<ParsedState | null>(null);
  const [lastChatState, setLastChatState] = useState<ParsedState | null>(null);
  const [lastQuizState, setLastQuizState] = useState<ParsedState | null>(null);
  const [writeState, setWriteState] = useState<{ txHash: string; message: string } | null>(null);

  const [txStatus, setTxStatus] = useState<TxProgressState>(INITIAL_TX_PROGRESS);

  const effectiveLookupAddress = useMemo(() => {
    const clean = lookupAddress.trim();
    if (clean !== "") {
      return clean;
    }
    return connectedAddress;
  }, [connectedAddress, lookupAddress]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const address = await getClientAddress();
        if (!mounted) {
          return;
        }
        setConnectedAddress(address);
      } catch (error) {
        if (!mounted) {
          return;
        }
        setWriteState({ txHash: "", message: `Initialization failed: ${toErrorMessage(error)}` });
      }
    };

    void init();

    return () => {
      mounted = false;
    };
  }, []);

  const loadConfig = async () => {
    setIsLoadingConfig(true);
    try {
      const raw = await getConfig();
      setConfigState(makeParsedState(raw));
    } catch (error) {
      setConfigState({ raw: "", parseError: `get_config failed: ${toErrorMessage(error)}` });
    } finally {
      setIsLoadingConfig(false);
    }
  };

  const loadLastChat = async () => {
    if (!effectiveLookupAddress) {
      setLastChatState({ raw: "", parseError: "Enter an address first" });
      return;
    }

    setIsLoadingChat(true);
    try {
      const raw = await getLastChat(effectiveLookupAddress);
      if (raw.trim() === "") {
        setLastChatState({ raw: "", parseError: "No last chat found for this user" });
      } else {
        setLastChatState(makeParsedState(raw));
      }
    } catch (error) {
      setLastChatState({ raw: "", parseError: `get_last_chat failed: ${toErrorMessage(error)}` });
    } finally {
      setIsLoadingChat(false);
    }
  };

  const loadLastQuiz = async () => {
    if (!effectiveLookupAddress) {
      setLastQuizState({ raw: "", parseError: "Enter an address first" });
      return;
    }

    setIsLoadingQuiz(true);
    try {
      const raw = await getLastQuiz(effectiveLookupAddress);
      if (raw.trim() === "") {
        setLastQuizState({ raw: "", parseError: "No last quiz found for this user" });
      } else {
        setLastQuizState(makeParsedState(raw));
      }
    } catch (error) {
      setLastQuizState({ raw: "", parseError: `get_last_quiz failed: ${toErrorMessage(error)}` });
    } finally {
      setIsLoadingQuiz(false);
    }
  };

  const runWrite = async (action: () => Promise<{ txHash: string }>, successMessage: string) => {
    setIsWriting(true);
    setTxStatus(INITIAL_TX_PROGRESS);
    setWriteState(null);

    try {
      const result = await action();
      setWriteState({ txHash: result.txHash, message: successMessage });
      await loadConfig();
    } catch (error) {
      setWriteState({ txHash: "", message: `Write failed: ${toErrorMessage(error)}` });
    } finally {
      setIsWriting(false);
    }
  };

  const onSetOwner = async (event: FormEvent) => {
    event.preventDefault();
    if (!newOwner.trim()) {
      setWriteState({ txHash: "", message: "new_owner is required" });
      return;
    }

    await runWrite(
      () => setOwner(newOwner.trim(), setTxStatus),
      "set_owner submitted and accepted",
    );
  };

  const onSetModelName = async (event: FormEvent) => {
    event.preventDefault();
    if (!modelName.trim()) {
      setWriteState({ txHash: "", message: "model_name is required" });
      return;
    }

    await runWrite(
      () => setModelName(modelName.trim(), setTxStatus),
      "set_model_name submitted and accepted",
    );
  };

  const onSetSystemPrompt = async (event: FormEvent) => {
    event.preventDefault();
    if (!systemPrompt.trim()) {
      setWriteState({ txHash: "", message: "system_prompt is required" });
      return;
    }

    await runWrite(
      () => setSystemPrompt(systemPrompt.trim(), setTxStatus),
      "set_system_prompt submitted and accepted",
    );
  };

  const onSetMaxQuestions = async (event: FormEvent) => {
    event.preventDefault();
    const bounded = Math.max(1, Math.min(50, Math.trunc(maxQuestions || 15)));

    await runWrite(
      () => setMaxQuestions(bounded, setTxStatus),
      "set_max_questions submitted and accepted",
    );
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 pb-24 md:pb-10">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="mb-2 flex items-center gap-2 text-3xl font-bold text-foreground">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
            <Settings2 className="h-6 w-6" />
          </div>
          FootballIQ Contract Console
        </h1>
        <p className="text-muted-foreground">
          Connected account: <span className="font-mono">{connectedAddress || "loading..."}</span>
        </p>
      </motion.div>

      <div className="mb-6">
        <TransactionStatusCard status={txStatus} />
      </div>

      <div className="mb-8 rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 text-lg font-bold text-foreground">View Methods</h2>

        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <button
            onClick={loadConfig}
            disabled={isLoadingConfig}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
          >
            {isLoadingConfig ? "Loading..." : "get_config"}
          </button>
          <button
            onClick={loadLastChat}
            disabled={isLoadingChat}
            className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground disabled:opacity-40"
          >
            {isLoadingChat ? "Loading..." : "get_last_chat"}
          </button>
          <button
            onClick={loadLastQuiz}
            disabled={isLoadingQuiz}
            className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground disabled:opacity-40"
          >
            {isLoadingQuiz ? "Loading..." : "get_last_quiz"}
          </button>
        </div>

        <label className="mb-2 block text-sm font-medium text-foreground">Lookup User Address</label>
        <input
          value={lookupAddress}
          onChange={(event) => setLookupAddress(event.target.value)}
          placeholder="0x... (defaults to connected account)"
          className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />

        <div className="mt-5 grid gap-5 md:grid-cols-3">
          <div className="rounded-lg border border-border p-3">
            <p className="mb-2 text-sm font-semibold text-foreground">get_config</p>
            {configState ? (
              configState.parseError ? (
                <p className="text-sm text-destructive">{configState.parseError}</p>
              ) : (
                <DynamicJsonView data={configState.parsed} emptyLabel="No config" />
              )
            ) : (
              <p className="text-sm text-muted-foreground">No response yet</p>
            )}
          </div>

          <div className="rounded-lg border border-border p-3">
            <p className="mb-2 text-sm font-semibold text-foreground">get_last_chat</p>
            {lastChatState ? (
              lastChatState.parseError ? (
                <p className="text-sm text-destructive">{lastChatState.parseError}</p>
              ) : (
                <DynamicJsonView data={lastChatState.parsed} emptyLabel="No chat JSON" />
              )
            ) : (
              <p className="text-sm text-muted-foreground">No response yet</p>
            )}
          </div>

          <div className="rounded-lg border border-border p-3">
            <p className="mb-2 text-sm font-semibold text-foreground">get_last_quiz</p>
            {lastQuizState ? (
              lastQuizState.parseError ? (
                <p className="text-sm text-destructive">{lastQuizState.parseError}</p>
              ) : (
                <DynamicJsonView data={lastQuizState.parsed} emptyLabel="No quiz JSON" />
              )
            ) : (
              <p className="text-sm text-muted-foreground">No response yet</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-4 text-lg font-bold text-foreground">Owner Write Methods</h2>

        <div className="grid gap-4 md:grid-cols-2">
          <form onSubmit={onSetOwner} className="space-y-2 rounded-lg border border-border p-3">
            <p className="text-sm font-semibold text-foreground">set_owner(new_owner)</p>
            <input
              value={newOwner}
              onChange={(event) => setNewOwnerValue(event.target.value)}
              placeholder="0x..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={isWriting}
              className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
            >
              Submit
            </button>
          </form>

          <form onSubmit={onSetModelName} className="space-y-2 rounded-lg border border-border p-3">
            <p className="text-sm font-semibold text-foreground">set_model_name(model_name)</p>
            <input
              value={modelName}
              onChange={(event) => setModelNameValue(event.target.value)}
              placeholder="gpt-5-mini"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={isWriting}
              className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
            >
              Submit
            </button>
          </form>

          <form onSubmit={onSetSystemPrompt} className="space-y-2 rounded-lg border border-border p-3 md:col-span-2">
            <p className="text-sm font-semibold text-foreground">set_system_prompt(new_prompt)</p>
            <textarea
              value={systemPrompt}
              onChange={(event) => setSystemPromptValue(event.target.value)}
              rows={3}
              placeholder="Enter a new system prompt"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={isWriting}
              className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
            >
              Submit
            </button>
          </form>

          <form onSubmit={onSetMaxQuestions} className="space-y-2 rounded-lg border border-border p-3">
            <p className="text-sm font-semibold text-foreground">set_max_questions(max_questions)</p>
            <input
              type="number"
              min={1}
              max={50}
              value={maxQuestions}
              onChange={(event) => setMaxQuestionsValue(Number(event.target.value))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={isWriting}
              className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
            >
              Submit
            </button>
          </form>
        </div>

        {writeState && (
          <div className="mt-4 rounded-lg border border-border bg-background p-3 text-sm">
            <p className="text-foreground">{writeState.message}</p>
            {writeState.txHash && (
              <p className="mt-1 text-xs text-muted-foreground">
                tx: <span className="font-mono">{writeState.txHash}</span>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
