import winston from 'winston';

const isProduction = process.env.NODE_ENV === 'production';

// Custom console format for local development (clean, colored)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
  })
);

export const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      level: isProduction ? 'error' : 'debug',
      format: consoleFormat,
    })
  ],
});

// Helper for sanitizing sensitive data (passwords, tokens, keys)
export const sanitizeData = (data: any): any => {
  if (!data) return data;
  const sensitiveKeys = ['password', 'token', 'secret', 'authorization', 'apikey', 'jwt'];
  const sanitized = { ...data };
  
  Object.keys(sanitized).forEach(key => {
    if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeData(sanitized[key]);
    }
  });
  
  return sanitized;
};

export const sensitiveLogger = {
  info: (message: string, data?: any) => {
    logger.info(message, data ? { metadata: sanitizeData(data) } : undefined);
  },
  error: (message: string, error?: any) => {
    logger.error(message, error ? { error: error.message || error } : undefined);
  }
};
