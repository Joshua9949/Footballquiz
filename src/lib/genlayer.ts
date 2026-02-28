import { createAccount, createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import {
  type Address,
  type CalldataEncodable,
  type GenLayerTransaction,
  type Hash,
  TransactionStatus,
} from "genlayer-js/types";

export const FOOTBALL_IQ_CONTRACT =
  "0x688AA322f581Db6677aa06B80c04C66Bc72E1102" as Address;

const WAIT_RETRIES = 150;
const WAIT_INTERVAL = 2000;
const WAIT_WINDOW_MS = WAIT_RETRIES * WAIT_INTERVAL;

export type Difficulty = "easy" | "medium" | "hard";

export const CATEGORY_MAP = {
  "premier-league": "premier_league",
  "la-liga": "la_liga",
  "serie-a": "serie_a",
  bundesliga: "bundesliga",
  "ligue-1": "ligue_1",
  "primeira-liga": "primeira_liga",
  eredivisie: "eredivisie",
  "belgian-pro": "belgian_pro",
  mls: "mls",
  "super-lig": "super_lig",
  "champions-league": "champions_league",
  players: "players",
  managers: "managers",
  trophies: "trophies",
} as const;

export type SupportedCategory = (typeof CATEGORY_MAP)[keyof typeof CATEGORY_MAP];

export type TxStage = "idle" | "sending" | "pending" | "accepted" | "error";

export interface TxProgressState {
  stage: TxStage;
  progress: number;
  message: string;
  txHash?: Hash;
  error?: string;
}

export const INITIAL_TX_PROGRESS: TxProgressState = {
  stage: "idle",
  progress: 0,
  message: "Idle",
};

export interface WriteResult {
  txHash: Hash;
  receipt: GenLayerTransaction;
}

export interface WriteAndFetchResult extends WriteResult {
  userAddress: Address;
  json: string;
}

export interface ContractQuizQuestion {
  id: string;
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

export interface ContractQuizPayload {
  subject_kind: string;
  subject_value: string;
  difficulty: Difficulty;
  questions: ContractQuizQuestion[];
}

export type ProgressListener = (state: TxProgressState) => void;

let singletonClient: ReturnType<typeof createClient> | null = null;
let singletonInitPromise: Promise<ReturnType<typeof createClient>> | null = null;

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function normalizePrivateKey(rawKey: string | undefined): `0x${string}` {
  const trimmed = (rawKey ?? "").trim();
  if (trimmed === "") {
    throw new Error("Missing VITE_GENLAYER_KEY in .env");
  }
  const withPrefix = trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
  return withPrefix as `0x${string}`;
}

function normalizeContractReadResult(result: CalldataEncodable): string {
  if (typeof result === "string") {
    return result;
  }
  return JSON.stringify(result);
}

function extractTxHash(raw: unknown): Hash {
  if (typeof raw === "string" && raw.startsWith("0x")) {
    return raw as Hash;
  }
  if (raw && typeof raw === "object") {
    const record = raw as Record<string, unknown>;
    const candidate = record.txId ?? record.hash;
    if (typeof candidate === "string" && candidate.startsWith("0x")) {
      return candidate as Hash;
    }
  }
  throw new Error("writeContract did not return a transaction hash");
}

function emitProgress(onProgress: ProgressListener | undefined, state: TxProgressState) {
  if (onProgress) {
    onProgress(state);
  }
}

function requireClientAddress(client: ReturnType<typeof createClient>): Address {
  const account = client.account as unknown;
  if (typeof account === "string") {
    return account as Address;
  }
  if (account && typeof account === "object" && "address" in account) {
    const address = (account as { address?: unknown }).address;
    if (typeof address === "string") {
      return address as Address;
    }
  }
  throw new Error("No account configured on GenLayer client");
}

async function waitForAcceptedReceipt(
  client: ReturnType<typeof createClient>,
  txHash: Hash,
  onProgress?: ProgressListener,
): Promise<GenLayerTransaction> {
  const startedAt = Date.now();
  emitProgress(onProgress, {
    stage: "pending",
    progress: 12,
    txHash,
    message: "⚠️ Transaction Pending... waiting for ACCEPTED",
  });
  console.log("⚠️ Transaction Pending...", txHash);

  const interval = setInterval(() => {
    const elapsed = Date.now() - startedAt;
    const ratio = Math.min(1, elapsed / WAIT_WINDOW_MS);
    const progress = Math.min(95, Math.max(12, Math.floor(12 + ratio * 83)));
    emitProgress(onProgress, {
      stage: "pending",
      progress,
      txHash,
      message: "⚠️ Transaction Pending... waiting for ACCEPTED",
    });
  }, 750);

  try {
    const receipt = await client.waitForTransactionReceipt({
      hash: txHash,
      status: TransactionStatus.ACCEPTED,
      retries: WAIT_RETRIES,
      interval: WAIT_INTERVAL,
    });

    emitProgress(onProgress, {
      stage: "accepted",
      progress: 100,
      txHash,
      message: "✅ Transaction reached ACCEPTED",
    });

    return receipt;
  } catch (error) {
    const details = toErrorMessage(error);
    emitProgress(onProgress, {
      stage: "error",
      progress: 100,
      txHash,
      message: `❌ Error: ${details}`,
      error: details,
    });
    console.error(`❌ Error: ${details}`);
    throw error;
  } finally {
    clearInterval(interval);
  }
}

export async function initializeGenLayer(
  forceReset = false,
): Promise<ReturnType<typeof createClient>> {
  if (!forceReset && singletonClient) {
    return singletonClient;
  }

  if (!forceReset && singletonInitPromise) {
    return singletonInitPromise;
  }

  singletonInitPromise = (async () => {
    try {
      const privateKey = normalizePrivateKey(import.meta.env.VITE_GENLAYER_KEY);
      const account = createAccount(privateKey);
      const client = createClient({
        chain: studionet,
        account,
      });

      await client.initializeConsensusSmartContract(forceReset);
      singletonClient = client;
      console.log("✅ Consensus Initialized");
      return client;
    } catch (error) {
      const details = toErrorMessage(error);
      console.error(`❌ Error: ${details}`);
      singletonClient = null;
      throw error;
    } finally {
      singletonInitPromise = null;
    }
  })();

  return singletonInitPromise;
}

async function readMethod(functionName: string, args: CalldataEncodable[] = []): Promise<string> {
  const client = await initializeGenLayer();
  const result = await client.readContract({
    address: FOOTBALL_IQ_CONTRACT,
    functionName,
    args,
  });

  return normalizeContractReadResult(result);
}

async function writeMethod(
  functionName: string,
  args: CalldataEncodable[] = [],
  onProgress?: ProgressListener,
): Promise<WriteResult> {
  const client = await initializeGenLayer();

  emitProgress(onProgress, {
    stage: "sending",
    progress: 5,
    message: `Submitting ${functionName}...`,
  });

  try {
    const rawHash = await client.writeContract({
      address: FOOTBALL_IQ_CONTRACT,
      functionName,
      args,
      value: 0n,
    });

    const txHash = extractTxHash(rawHash);
    const receipt = await waitForAcceptedReceipt(client, txHash, onProgress);
    return { txHash, receipt };
  } catch (error) {
    const details = toErrorMessage(error);
    emitProgress(onProgress, {
      stage: "error",
      progress: 100,
      message: `❌ Error: ${details}`,
      error: details,
    });
    console.error(`❌ Error: ${details}`);
    throw error;
  }
}

export function parseJsonStrict(raw: string): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

function isObjectLike(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseQuizPayloadStrict(
  value: unknown,
): { ok: true; value: ContractQuizPayload } | { ok: false; error: string } {
  if (!isObjectLike(value)) {
    return { ok: false, error: "quiz payload is not an object" };
  }

  const subjectKind = value.subject_kind;
  const subjectValue = value.subject_value;
  const difficulty = value.difficulty;
  const questions = value.questions;

  if (typeof subjectKind !== "string" || subjectKind.trim() === "") {
    return { ok: false, error: "missing subject_kind" };
  }
  if (typeof subjectValue !== "string" || subjectValue.trim() === "") {
    return { ok: false, error: "missing subject_value" };
  }
  if (difficulty !== "easy" && difficulty !== "medium" && difficulty !== "hard") {
    return { ok: false, error: "invalid difficulty" };
  }
  if (!Array.isArray(questions) || questions.length === 0) {
    return { ok: false, error: "questions must be a non-empty array" };
  }

  const normalizedQuestions: ContractQuizQuestion[] = [];
  for (let index = 0; index < questions.length; index += 1) {
    const questionItem = questions[index];
    if (!isObjectLike(questionItem)) {
      return { ok: false, error: `questions[${index}] is not an object` };
    }

    const id = questionItem.id;
    const questionText = questionItem.question;
    const options = questionItem.options;
    const answer = questionItem.answer;
    const explanation = questionItem.explanation;

    if (typeof id !== "string" || id.trim() === "") {
      return { ok: false, error: `questions[${index}].id is invalid` };
    }
    if (typeof questionText !== "string" || questionText.trim() === "") {
      return { ok: false, error: `questions[${index}].question is invalid` };
    }
    if (!Array.isArray(options) || options.length !== 4 || options.some((option) => typeof option !== "string" || option.trim() === "")) {
      return { ok: false, error: `questions[${index}].options must contain exactly 4 non-empty strings` };
    }
    if (typeof answer !== "string" || !options.includes(answer)) {
      return { ok: false, error: `questions[${index}].answer must be one of options` };
    }
    if (typeof explanation !== "string") {
      return { ok: false, error: `questions[${index}].explanation is invalid` };
    }

    normalizedQuestions.push({
      id,
      question: questionText,
      options: [...options],
      answer,
      explanation,
    });
  }

  return {
    ok: true,
    value: {
      subject_kind: subjectKind,
      subject_value: subjectValue,
      difficulty,
      questions: normalizedQuestions,
    },
  };
}

export async function getClientAddress(): Promise<Address> {
  const client = await initializeGenLayer();
  return requireClientAddress(client);
}

export async function getConfig(): Promise<string> {
  return readMethod("get_config");
}

export async function getLastChat(user: string): Promise<string> {
  return readMethod("get_last_chat", [user]);
}

export async function getLastQuiz(user: string): Promise<string> {
  return readMethod("get_last_quiz", [user]);
}

export async function setOwner(newOwner: string, onProgress?: ProgressListener): Promise<WriteResult> {
  return writeMethod("set_owner", [newOwner], onProgress);
}

export async function setModelName(modelName: string, onProgress?: ProgressListener): Promise<WriteResult> {
  return writeMethod("set_model_name", [modelName], onProgress);
}

export async function setSystemPrompt(newPrompt: string, onProgress?: ProgressListener): Promise<WriteResult> {
  return writeMethod("set_system_prompt", [newPrompt], onProgress);
}

export async function setMaxQuestions(maxQuestions: number, onProgress?: ProgressListener): Promise<WriteResult> {
  return writeMethod("set_max_questions", [maxQuestions], onProgress);
}

export async function footballChat(
  message: string,
  historyJson = "[]",
  onProgress?: ProgressListener,
): Promise<WriteAndFetchResult> {
  const write = await writeMethod("football_chat", [message, historyJson], onProgress);
  const userAddress = await getClientAddress();
  const json = await getLastChat(userAddress);
  return { ...write, userAddress, json };
}

export async function generatePlayerQuiz(
  playerName: string,
  difficulty: Difficulty,
  count = 5,
  onProgress?: ProgressListener,
): Promise<WriteAndFetchResult> {
  const write = await writeMethod(
    "generate_player_quiz",
    [playerName, difficulty, count],
    onProgress,
  );
  const userAddress = await getClientAddress();
  const json = await getLastQuiz(userAddress);
  return { ...write, userAddress, json };
}

export async function generateCategoryQuiz(
  category: SupportedCategory,
  difficulty: Difficulty,
  count = 10,
  onProgress?: ProgressListener,
): Promise<WriteAndFetchResult> {
  const write = await writeMethod(
    "generate_category_quiz",
    [category, difficulty, count],
    onProgress,
  );
  const userAddress = await getClientAddress();
  const json = await getLastQuiz(userAddress);
  return { ...write, userAddress, json };
}
