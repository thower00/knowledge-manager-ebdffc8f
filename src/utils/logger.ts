import { maskSecretsInObject } from "@/utils/logging";

export type LogLevel = "debug" | "info" | "warn" | "error";

const levelRank: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function readLevelFromStorage(): LogLevel | null {
  try {
    const v = localStorage.getItem("app:log-level");
    if (!v) return null;
    if (["debug", "info", "warn", "error"].includes(v)) return v as LogLevel;
    return null;
  } catch {
    return null;
  }
}

let currentLevel: LogLevel = readLevelFromStorage() ?? (import.meta.env.DEV ? "info" : "warn");

function shouldLog(level: LogLevel) {
  return levelRank[level] >= levelRank[currentLevel];
}

function maskArg(arg: any) {
  try {
    if (arg instanceof Error) {
      return { name: arg.name, message: arg.message, stack: arg.stack };
    }
    if (typeof arg === "object" && arg !== null) {
      return maskSecretsInObject(arg);
    }
    return arg;
  } catch {
    return arg;
  }
}

function log(level: LogLevel, msg?: any, ...args: any[]) {
  if (!shouldLog(level)) return;
  const maskedArgs = args.map(maskArg);
  const maskedMsg = maskArg(msg);
  const prefix = `[${level.toUpperCase()}]`;
  // Use the matching console method internally
  const method = level === "debug" ? console.debug : level === "info" ? console.info : level === "warn" ? console.warn : console.error;
  method(prefix, maskedMsg, ...maskedArgs);
}

export const logger = {
  debug: (msg?: any, ...args: any[]) => log("debug", msg, ...args),
  info: (msg?: any, ...args: any[]) => log("info", msg, ...args),
  warn: (msg?: any, ...args: any[]) => log("warn", msg, ...args),
  error: (msg?: any, ...args: any[]) => log("error", msg, ...args),
  getLevel: (): LogLevel => currentLevel,
  setLevel: (level: LogLevel) => {
    if (!(["debug", "info", "warn", "error"] as const).includes(level)) return;
    currentLevel = level;
    try {
      localStorage.setItem("app:log-level", level);
    } catch {
      // ignore
    }
  },
};
