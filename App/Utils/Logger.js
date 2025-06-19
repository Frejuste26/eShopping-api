import winston from 'winston';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import path from 'path';
import DailyRotateFile from 'winston-daily-rotate-file';

class Logger {
    constructor(options = {}) {
        this.__filename = fileURLToPath(import.meta.url);
        this.__dirname = path.dirname(this.__filename);
        this.options = {
            logLevel: options.logLevel || process.env.LOG_LEVEL || 'debug',
            logDir: options.logDir || path.join(this.__dirname, '../logs'),
            maxFileSize: options.maxFileSize || '20m',
            maxFiles: options.maxFiles || '30d',
        };
        this.logColors = { error: 'red', warn: 'yellow', info: 'green', http: 'cyan', debug: 'blue' };
        this.logEmojis = { error: '❌', warn: '⚠️', info: 'ℹ️', http: '🌐', debug: '🐛' };
        this.logLevels = { error: 0, warn: 1, info: 2, http: 3, debug: 4 };

        // Console format
        const consoleFormat = winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.printf(({ level, message, timestamp, stack }) => {
                const color = chalk[this.logColors[level]] || chalk.white;
                const emoji = this.logEmojis[level] || '';
                let logMessage = `${chalk.gray(timestamp)} ${color.bold(level.toUpperCase())} ${emoji} ${message}`;
                if (stack) logMessage += `\n${stack}`;
                return logMessage;
            })
        );

        // File format
        const fileFormat = winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.errors({ stack: true }),
            winston.format.json()
        );

        // Transports
        const transports = [
            new winston.transports.Console({
                format: consoleFormat,
                level: this.options.logLevel
            }),
            new DailyRotateFile({
                filename: path.join(this.options.logDir, '/application-%DATE%.log'),
                datePattern: 'YYYY-MM-DD',
                zippedArchive: true,
                maxSize: this.options.maxFileSize,
                maxFiles: this.options.maxFiles,
                format: fileFormat,
                level: 'info'
            }),
            new DailyRotateFile({
                filename: path.join(this.options.logDir, '/error-%DATE%.log'),
                datePattern: 'YYYY-MM-DD',
                zippedArchive: true,
                maxSize: this.options.maxFileSize,
                maxFiles: '90d',
                format: fileFormat,
                level: 'error'
            })
        ];

        // Create main logger
        this.logger = winston.createLogger({
            level: this.options.logLevel,
            levels: this.logLevels,
            transports: transports,
            format: winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                winston.format.errors({ stack: true }),
                winston.format.json()
            )
        });

        // Create HTTP logger
        this.httpLogger = winston.createLogger({
            level: 'http',
            levels: this.logLevels,
            transports: [
                new DailyRotateFile({
                    filename: path.join(this.options.logDir, '/access-%DATE%.log'),
                    datePattern: 'YYYY-MM-DD',
                    zippedArchive: true,
                    maxSize: this.options.maxFileSize,
                    maxFiles: this.options.maxFiles,
                    format: winston.format.combine(
                        winston.format.timestamp(),
                        winston.format.json()
                    )
                })
            ]
        });
    }

    expressLogger() {
        return (req, res, next) => {
            const start = Date.now();

            res.on('finish', () => {
                const duration = Date.now() - start;
                const logData = {
                    method: req.method,
                    url: req.originalUrl,
                    status: res.statusCode,
                    duration: `${duration}ms`,
                    ip: req.ip,
                    userAgent: req.get('user-agent'),
                    contentLength: res.get('content-length') || '0',
                    referrer: req.get('referer') || ''
                };

                if (res.statusCode >= 500) {
                    this.logger.error('HTTP Error', logData);
                } else if (res.statusCode >= 400) {
                    this.logger.warn('HTTP Warning', logData);
                } else {
                    this.httpLogger.http('HTTP Access', logData);
                }
            });

            // Gestion des erreurs asynchrones
            Promise.resolve(next()).catch(next);
        };
    }

    logDatabaseQuery(query, duration) {
        this.logger.debug(`[DB] ${query} | Duration: ${duration}ms`, {
            timestamp: new Date().toISOString()
        });
    }

    logErrorWithContext(error, context = {}) {
        this.logger.error(`${error.message}`, {
            stack: error.stack,
            ...context
        });
    }

    getLoggerInstance() {
        return this.logger;
    }
}

export default Logger;
