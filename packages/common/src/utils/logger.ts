import winston from 'winston';

const { combine, timestamp, errors, json, colorize, simple } = winston.format;

export const createLogger = (service: string) => {
  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
      timestamp(),
      errors({ stack: true }),
      process.env.NODE_ENV === 'production'
        ? json()
        : combine(colorize(), simple())
    ),
    defaultMeta: { service },
    transports: [new winston.transports.Console()],
  });
};
