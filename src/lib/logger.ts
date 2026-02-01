import { terminal } from 'terminal-kit';

export interface ILogger {
    log(message: string): void;
    info(message: string): void;
    warn(message: string): void;
    error(message: string | Error): void;
}

let externalLogger: ILogger | undefined;

export function setLogger(logger: ILogger | undefined) {
    externalLogger = logger;
}

/**
 * Logs a message to the console.
 * @param message
 */
export function log(message: any) {
    const msg = typeof message === 'string' ? message : JSON.stringify(message);
    if (externalLogger) {
        externalLogger.log(msg);
        return;
    }
    terminal.white(msg, '\n');
}

/**
 * Logs a message to the console as an information.
 * @param message
 */
export function info(message: any) {
    const msg = typeof message === 'string' ? message : JSON.stringify(message);
    if (externalLogger) {
        externalLogger.info(msg);
        return;
    }
    terminal.brightCyan(msg, '\n');
}

/**
 * Logs a message to the console as a warning.
 * @param message
 */
export function warn(message: any) {
    const msg = typeof message === 'string' ? message : JSON.stringify(message);
    if (externalLogger) {
        externalLogger.warn(msg);
        return;
    }
    terminal.yellow(msg, '\n');
}

/**
 * Logs a message to the console as an error.
 * @param error
 */
export function error(error: any) {
    if (externalLogger) {
        externalLogger.error(error);
        return;
    }
    terminal.red(error, '\n');
}
