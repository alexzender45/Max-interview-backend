
import { createLogger, format, transports } from 'winston';
import 'winston-daily-rotate-file';

const { combine, timestamp, printf, colorize, errors } = format;
const consoleFormat = printf(({ level, message, timestamp, stack }) => {
  const text = `${timestamp} [${level}]: ${stack || message}`;
  return colorize().colorize(level, text);
});

const fileFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  return JSON.stringify({
    timestamp,
    level,
    message: stack || message,
    meta
  });
});


const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })
  ),
  transports: [
    new transports.Console({
      format: combine(consoleFormat),
      silent: process.env.NODE_ENV === 'production'
    }),

    new transports.DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      format: combine(fileFormat)
    }),
  ],
  exceptionHandlers: [
    new transports.File({ filename: 'logs/exceptions.log' })
  ],
  rejectionHandlers: [
    new transports.File({ filename: 'logs/rejections.log' })
  ]
});

export const morganStream = {
  write: (message: string) => {
    logger.http(message.trim());
  }
};

export const requestLogger = (req: any, res: any, next: any) => {
  logger.info(`${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });
  next();
};

export const errorLogger = (err: Error, req: any, res: any, next: any) => {
  logger.error(err.stack || err.message, {
    url: req.originalUrl,
    method: req.method,
    params: req.params,
    body: req.body
  });
  next(err);
};

export default logger;