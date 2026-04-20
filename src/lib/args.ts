export type ArgType =
    | 'string'
    | 'number'
    | 'boolean'
    | 'string|undefined'
    | 'number|undefined'
    | 'boolean|undefined';

/**
 * Parses the type of the argument
 * @param arg The argument to parse
 * @returns The parsed argument
 */
/**
 * Parses the type of the argument
 * @param arg The argument to parse
 * @returns The parsed argument
 */
export function parseArgType(arg: any) {
    if (!arg) return undefined;
    if (!isNaN(arg) && !isNaN(parseFloat(arg))) return parseFloat(arg);
    if (typeof arg === 'string') {
        if (arg.toLowerCase() === 'true') return true;
        if (arg.toLowerCase() === 'false') return false;
    }
    return String(arg);
}

/**
 * Returns the command passed to the program
 * @param argv Optional argument array (defaults to process.argv)
 * @returns {string} The command passed to the program
 */
export function cmd(argv: string[] = process.argv) {
    return argv[2];
}

/**
 * Returns the arguments passed to the program
 * @param argv Optional argument array (defaults to process.argv)
 * @returns {any[]} The arguments passed to the program
 */
export function args(argv: string[] = process.argv) {
    return argv.slice(3).map((a) => parseArgType(a));
}

/**
 * Returns the argument at the specified index
 * @param {number} index The index of the argument to return
 * @param argv Optional argument array (defaults to process.argv)
 * @returns {any} The argument at the specified index
 */
export function arg(index: number, argv: string[] = process.argv) {
    return args(argv)[index];
}

/**
 * Returns the arguments passed to the program
 * @param argv Optional argument array (defaults to process.argv)
 * @returns {string[]} The arguments passed to the program
 */
export function processArgs(argv: string[] = process.argv) {
    return argv.slice(2);
}
