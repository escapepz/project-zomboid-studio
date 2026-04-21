export interface ILogger {
    log(message: string): void;
    info(message: string): void;
    warn(message: string): void;
    error(message: string | Error): void;
    verbose?(message: string): void;
    clear?(): void;
}

let externalLogger: ILogger | undefined;
let verboseEnabled = false;

/**
 * Strips ANSI escape codes from a string.
 */
function stripAnsi(str: string): string {
    return str.replace(
        /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
        '',
    );
}

/**
 * Checks if the output destination is a TTY.
 */
function isTTY(): boolean {
    return process.stdout.isTTY;
}

function getTerminal() {
    try {
        const terminal = require('terminal-kit').terminal;
        return terminal;
    } catch (e) {
        const fallback = (msg: string) => {
            console.log(isTTY() ? msg : stripAnsi(msg));
        };
        const fallbackError = (msg: string) => {
            console.error(isTTY() ? msg : stripAnsi(msg));
        };
        return {
            white: fallback,
            brightCyan: fallback,
            yellow: fallback,
            red: fallbackError,
            gray: fallback,
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

export function setVerbose(enabled: boolean) {
    verboseEnabled = enabled;
}

export function isVerbose(): boolean {
    return verboseEnabled;
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
    const term = getTerminal();
    const output = isTTY() ? msg : stripAnsi(msg);
    term.white(output, '\n');
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
    const term = getTerminal();
    const output = `[${getTimestamp()}] [INFO] ${msg}`;
    term.brightCyan(isTTY() ? output : stripAnsi(output), '\n');
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
    const term = getTerminal();
    const output = `[${getTimestamp()}] [WARN] ${msg}`;
    term.yellow(isTTY() ? output : stripAnsi(output), '\n');
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
    const term = getTerminal();
    const output = `[${getTimestamp()}] [ERROR] ${msg}`;
    term.red(isTTY() ? output : stripAnsi(output), '\n');
}

/**
 * Logs a diagnostic message if verbose mode is enabled.
 * @param message
 */
export function verbose(message: any) {
    if (!verboseEnabled) return;
    const msg = typeof message === 'string' ? message : JSON.stringify(message);
    if (externalLogger && externalLogger.verbose) {
        externalLogger.verbose(msg);
        return;
    }
    const term = getTerminal();
    const output = `[${getTimestamp()}] [DEBUG] ${msg}`;
    if (term.gray) {
        term.gray(isTTY() ? output : stripAnsi(output), '\n');
    } else {
        term.white(isTTY() ? output : stripAnsi(output), '\n');
    }
}
