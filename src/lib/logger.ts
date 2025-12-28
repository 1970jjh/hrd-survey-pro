// HRD Survey Pro - Error Logging Utility
// Production-ready logging with structured output

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const config: LoggerConfig = {
  minLevel: process.env.NODE_ENV === "production" ? "info" : "debug",
  enableConsole: true,
  enableRemote: process.env.NODE_ENV === "production",
};

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[config.minLevel];
}

function formatEntry(entry: LogEntry): string {
  const { timestamp, level, message, context, error } = entry;
  const contextStr = context ? ` ${JSON.stringify(context)}` : "";
  const errorStr = error ? ` [${error.name}: ${error.message}]` : "";
  return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}${errorStr}`;
}

function createEntry(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
  error?: Error
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
    error: error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      : undefined,
  };
}

async function sendToRemote(entry: LogEntry): Promise<void> {
  // In production, you can integrate with services like:
  // - Sentry (recommended for error tracking)
  // - LogRocket
  // - Datadog
  // - Custom logging endpoint

  // Example: Send to a custom endpoint
  // if (process.env.LOG_ENDPOINT) {
  //   await fetch(process.env.LOG_ENDPOINT, {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify(entry),
  //   });
  // }

  // For now, just log to console in production
  if (entry.level === "error") {
    console.error("[REMOTE LOG]", JSON.stringify(entry));
  }
}

function log(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
  error?: Error
): void {
  if (!shouldLog(level)) return;

  const entry = createEntry(level, message, context, error);

  if (config.enableConsole) {
    const formatted = formatEntry(entry);
    switch (level) {
      case "debug":
        console.debug(formatted);
        break;
      case "info":
        console.info(formatted);
        break;
      case "warn":
        console.warn(formatted);
        break;
      case "error":
        console.error(formatted);
        if (error?.stack) {
          console.error(error.stack);
        }
        break;
    }
  }

  if (config.enableRemote && (level === "error" || level === "warn")) {
    sendToRemote(entry).catch(() => {
      // Silently fail if remote logging fails
    });
  }
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => {
    log("debug", message, context);
  },

  info: (message: string, context?: Record<string, unknown>) => {
    log("info", message, context);
  },

  warn: (message: string, context?: Record<string, unknown>, error?: Error) => {
    log("warn", message, context, error);
  },

  error: (
    message: string,
    error?: Error,
    context?: Record<string, unknown>
  ) => {
    log("error", message, context, error);
  },

  // Convenience method for API errors
  apiError: (
    endpoint: string,
    error: Error,
    statusCode?: number,
    requestId?: string
  ) => {
    log(
      "error",
      `API Error: ${endpoint}`,
      {
        endpoint,
        statusCode,
        requestId,
      },
      error
    );
  },

  // Convenience method for database errors
  dbError: (operation: string, error: Error, table?: string) => {
    log(
      "error",
      `Database Error: ${operation}`,
      {
        operation,
        table,
      },
      error
    );
  },

  // Convenience method for authentication errors
  authError: (action: string, error: Error, userId?: string) => {
    log(
      "error",
      `Auth Error: ${action}`,
      {
        action,
        userId,
      },
      error
    );
  },
};

export default logger;
