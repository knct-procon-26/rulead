const LOG_TYPE = ["qdrant", "embedding", "jev"] as const;

export function log(logType: (typeof LOG_TYPE)[number], message: string) {
  console.log(`[${logType}] ${message}`);
}

export function logs(logType: (typeof LOG_TYPE)[number], message: string[]) {
  for (const i of message) {
    log(logType, i);
  }
}
