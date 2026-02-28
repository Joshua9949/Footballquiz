import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, Brain, MessageCircle, Send, Sparkles, User } from "lucide-react";
import { toast } from "sonner";
import DynamicJsonView from "@/components/DynamicJsonView";
import TransactionStatusCard from "@/components/TransactionStatusCard";
import {
  footballChat,
  INITIAL_TX_PROGRESS,
  parseJsonStrict,
  type TxProgressState,
} from "@/lib/genlayer";

type Role = "user" | "assistant";

interface ChatMessage {
  role: Role;
  content: string;
  parsed?: unknown;
  parseError?: string;
  txHash?: string;
}

const suggestions = [
  "Tell me about Messi's career stats and achievements",
  "Compare Guardiola and Mourinho's tactical styles",
  "Generate a hard quiz about Cristiano Ronaldo",
  "Who are the top 5 goalscorers in World Cup history?",
  "Explain the offside rule in simple terms",
  "Who has won the most UEFA Champions League titles?",
];

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export default function AIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Ask any football question and I will call your FootballIQBrain GenLayer contract.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [txStatus, setTxStatus] = useState<TxProgressState>(INITIAL_TX_PROGRESS);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, txStatus]);

  const send = async () => {
    if (!input.trim() || isLoading) {
      return;
    }

    const clean = input.trim();
    const userMessage: ChatMessage = { role: "user", content: clean };
    const history = [...messages, userMessage].map((item) => ({
      role: item.role,
      content: item.content,
    }));

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setTxStatus(INITIAL_TX_PROGRESS);

    try {
      const result = await footballChat(clean, JSON.stringify(history), setTxStatus);
      const parsedResult = parseJsonStrict(result.json);

      if (parsedResult.ok === false) {
        const errorText = `Malformed JSON from contract: ${parsedResult.error}`;
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: result.json,
            parseError: errorText,
            txHash: result.txHash,
          },
        ]);
        toast.error(errorText);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: result.json,
            parsed: parsedResult.value,
            txHash: result.txHash,
          },
        ]);
      }
    } catch (error) {
      const details = toErrorMessage(error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "",
          parseError: `Contract call failed: ${details}`,
        },
      ]);
      toast.error(`Contract call failed: ${details}`);
    } finally {
      setIsLoading(false);
    }
  };

  const showSuggestions = messages.length <= 1;

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-3xl flex-col px-4 pb-20 md:pb-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="py-5"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg">
            <Brain className="h-6 w-6" />
          </div>
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-foreground">
              FootballIQ Chat
              <Sparkles className="h-4 w-4 text-secondary" />
            </h1>
            <p className="text-xs text-muted-foreground">
              GenLayer contract call: <span className="font-mono">football_chat(message, history_json)</span>
            </p>
          </div>
        </div>
      </motion.div>

      <div className="mb-4">
        <TransactionStatusCard status={txStatus} />
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto pb-4 scrollbar-thin">
        <AnimatePresence initial={false}>
          {messages.map((msg, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                  msg.role === "assistant"
                    ? "bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-sm"
                    : "bg-secondary text-secondary-foreground shadow-sm"
                }`}
              >
                {msg.role === "assistant" ? (
                  <Bot className="h-4 w-4" />
                ) : (
                  <User className="h-4 w-4" />
                )}
              </div>
              <div
                className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "assistant"
                    ? "border border-border bg-card text-card-foreground shadow-sm"
                    : "bg-primary text-primary-foreground shadow-md"
                }`}
              >
                {msg.role === "assistant" ? (
                  <div className="space-y-2">
                    {msg.parseError ? (
                      <p className="text-sm text-destructive">{msg.parseError}</p>
                    ) : (
                      <DynamicJsonView data={msg.parsed ?? msg.content} emptyLabel="No assistant payload" />
                    )}
                    {msg.txHash && (
                      <p className="text-[11px] text-muted-foreground">
                        tx: <span className="font-mono">{msg.txHash}</span>
                      </p>
                    )}
                  </div>
                ) : (
                  <span className="whitespace-pre-wrap">{msg.content}</span>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-sm">
              <Bot className="h-4 w-4" />
            </div>
            <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
              Waiting for consensus...
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {showSuggestions && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap gap-2 pb-3"
        >
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => setInput(suggestion)}
              className="group flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-card-foreground transition-all hover:border-primary/50 hover:bg-accent hover:shadow-sm"
            >
              <MessageCircle className="h-3 w-3 text-muted-foreground transition-colors group-hover:text-primary" />
              {suggestion}
            </button>
          ))}
        </motion.div>
      )}

      <div className="flex gap-2 border-t border-border pt-4">
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && send()}
          placeholder="Ask your football question..."
          disabled={isLoading}
          className="flex-1 rounded-xl border border-border bg-card px-4 py-3 text-card-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
        />
        <button
          onClick={send}
          disabled={!input.trim() || isLoading}
          className="rounded-xl bg-gradient-to-br from-primary to-primary/80 px-4 py-3 text-primary-foreground shadow-md transition-all hover:scale-105 hover:shadow-lg disabled:opacity-40 disabled:hover:scale-100"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
