export interface ILogger {
    log(message: string): void;
    info(message: string): void;
    warn(message: string): void;
    error(message: string | Error): void;
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
    getTerminal().white(msg, '\n');
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
    getTerminal().brightCyan(msg, '\n');
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
    getTerminal().yellow(msg, '\n');
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
    getTerminal().red(error, '\n');
}
