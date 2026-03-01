export interface ILogger {
    log(message: string): void;
    info(message: string): void;
    warn(message: string): void;
    error(message: string | Error): void;
    clear?(): void;
}

let externalLogger: ILogger | undefined;

function getTerminal() {
    try {
        return require('terminal-kit').terminal;
    } catch (e) {
        return {
            white: console.log,
            brightCyan: console.log,
            yellow: console.log,
            red: console.log,
        };
    }
}

function getTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export function setLogger(logger: ILogger | undefined) {
    externalLogger = logger;
}

/**
 * Clears the console.
 */
export function clear() {
    if (externalLogger && externalLogger.clear) {
        externalLogger.clear();
        return;
    }
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
    getTerminal().white(`${msg}`, '\n');
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
    getTerminal().brightCyan(`[${getTimestamp()}] [INFO] ${msg}`, '\n');
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
    getTerminal().yellow(`[${getTimestamp()}] [WARN] ${msg}`, '\n');
}

/**
 * Logs a message to the console as an error.
 * @param error
 */
export function error(error: any) {
    const msg =
        error instanceof Error ? error.stack || error.message : String(error);
    if (externalLogger) {
        externalLogger.error(error);
        return;
    }
    getTerminal().red(`[${getTimestamp()}] [ERROR] ${msg}`, '\n');
}
