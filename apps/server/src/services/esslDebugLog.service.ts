import { appendFile, mkdir, readFile } from "fs/promises";
import path from "path";

const LOG_DIR = path.resolve(__dirname, "../../logs");
const LOG_FILE = path.join(LOG_DIR, "essl-raw.ndjson");

type EsslDebugEntry = {
  timestamp: string;
  source: string;
  method?: string;
  path?: string;
  ip?: string | null;
  serial_number?: string | null;
  table?: string | null;
  query?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  raw_body?: string | null;
  result?: string;
  error?: string | null;
};

let writeQueue = Promise.resolve();

async function ensureLogDir() {
  await mkdir(LOG_DIR, { recursive: true });
}

export function getEsslDebugLogFilePath() {
  return LOG_FILE;
}

export async function appendEsslDebugLog(entry: Omit<EsslDebugEntry, "timestamp">) {
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    ...entry,
  });

  writeQueue = writeQueue
    .catch(() => {})
    .then(async () => {
      await ensureLogDir();
      await appendFile(LOG_FILE, `${line}\n`, "utf8");
    })
    .catch((error) => {
      console.error("Failed to write eSSL debug log", error);
    });

  return writeQueue;
}

export async function readRecentEsslDebugLogs(limit = 25) {
  try {
    await ensureLogDir();
    const content = await readFile(LOG_FILE, "utf8");
    return content
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(-Math.max(1, Math.min(limit, 200)))
      .reverse()
      .map((line) => {
        try {
          return JSON.parse(line) as EsslDebugEntry;
        } catch {
          return { timestamp: new Date().toISOString(), source: "parse_error", raw_body: line, error: "Invalid JSON log line" } as EsslDebugEntry;
        }
      });
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      return [] as EsslDebugEntry[];
    }

    throw error;
  }
}
