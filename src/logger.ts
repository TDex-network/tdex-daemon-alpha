import * as winston from 'winston';
const { combine, timestamp, colorize, printf, prettyPrint } = winston.format;

export type LogConfig = {
  level?: string;
  logPath?: string;
  silent?: boolean;
};

export default function createLogger(config: LogConfig = {}): winston.Logger {
  const level = config.level || 'info';
  const { logPath, silent } = config;
  const transports: any[] = [];
  transports.push(
    new winston.transports.Console({
      level,
      silent,
      format: combine(
        timestamp(),
        colorize(),
        printf((info) => `${info.timestamp} ${info.level}: ${info.message}`)
      ),
    })
  );
  if (logPath)
    transports.push(
      new winston.transports.File({
        level: 'error',
        filename: logPath,
        format: combine(timestamp(), prettyPrint()),
      })
    );
  return winston.createLogger({ transports });
}
