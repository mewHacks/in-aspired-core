// secureLogger.ts — Safe logging utility that redacts sensitive data

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

// Fields that should never be logged
const SENSITIVE_FIELDS = [
  'password', 'token', 'secret', 'key', 'apiKey', 'apikey',
  'authorization', 'cookie', 'session', 'credential',
  'creditCard', 'cardNumber', 'cvv', 'iban',
  'ssn', 'nationalId', 'icNumber', 'passport'
];

// Redact sensitive fields from objects
const redactSensitive = (data: any): any => {
  if (!data) return data;
  if (typeof data === 'string') return data;
  
  const redacted = { ...data };
  for (const field of SENSITIVE_FIELDS) {
    if (redacted[field]) {
      redacted[field] = '[REDACTED]';
    }
  }
  return redacted;
};

// Safe logger - doesn't expose sensitive data
export const secureLog = {
  info: (message: string, ...args: any[]) => {
    const safeArgs = args.map(arg => redactSensitive(arg));
    console.log(`[INFO] ${message}`, ...safeArgs);
  },
  
  warn: (message: string, ...args: any[]) => {
    const safeArgs = args.map(arg => redactSensitive(arg));
    console.warn(`[WARN] ${message}`, ...safeArgs);
  },
  
  error: (message: string, ...args: any[]) => {
    // For errors, log message but sanitize any data
    const safeArgs = args.map(arg => {
      if (arg instanceof Error) {
        return { message: arg.message, stack: process.env.NODE_ENV === 'development' ? arg.stack : undefined };
      }
      return redactSensitive(arg);
    });
    console.error(`[ERROR] ${message}`, ...safeArgs);
  },
  
  debug: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      const safeArgs = args.map(arg => redactSensitive(arg));
      console.log(`[DEBUG] ${message}`, ...safeArgs);
    }
  },

  // Log user activity without PII
  userAction: (action: string, userId?: string) => {
    console.log(`[USER_ACTION] ${action} ${userId ? `user:${userId.slice(0, 8)}...` : 'anonymous'}`);
  }
};

export default secureLog;
