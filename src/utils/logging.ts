
export function maskSecret(value: string, opts: { prefix?: number; suffix?: number } = {}): string {
  if (typeof value !== "string" || value.length === 0) return "";
  const prefix = opts.prefix ?? 4;
  const suffix = opts.suffix ?? 3;
  if (value.length <= prefix + suffix) return "***";
  return `${value.slice(0, prefix)}***${value.slice(-suffix)}`;
}

// Recursively mask likely secret fields in objects/arrays, preserving structure for safe logging
export function maskSecretsInObject<T = any>(input: T): T {
  const visited = new WeakSet();

  function mask(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === "string") return obj; // only mask strings when they are values of secret-like keys
    if (typeof obj !== "object") return obj;
    if (visited.has(obj)) return obj;
    visited.add(obj);

    if (Array.isArray(obj)) return obj.map((v) => mask(v));

    const out: Record<string, any> = Array.isArray(obj) ? [] as any : {};
    for (const [key, val] of Object.entries(obj)) {
      const isSecretKey = /(?:api[_-]?key|secret|token|authorization|auth[_-]?key|password|private[_-]?key)/i.test(key);
      if (typeof val === "string" && isSecretKey) {
        out[key] = maskSecret(val);
      } else if (val && typeof val === "object") {
        // For maps like providerApiKeys, mask their string values
        if (/provider.*keys?/i.test(key)) {
          const maskedInner: Record<string, any> = {};
          for (const [k, v] of Object.entries(val as Record<string, any>)) {
            maskedInner[k] = typeof v === "string" ? maskSecret(v) : mask(v);
          }
          out[key] = maskedInner;
        } else {
          out[key] = mask(val);
        }
      } else {
        out[key] = val;
      }
    }
    return out as T;
  }

  try {
    return mask(input);
  } catch {
    return input;
  }
}
