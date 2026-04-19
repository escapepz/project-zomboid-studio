export class TemplateResolutionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'TemplateResolutionError';
    }
}

export class TemplateCloneError extends TemplateResolutionError {
    constructor(
        message: string,
        public readonly cause?: any,
    ) {
        super(message);
        this.name = 'TemplateCloneError';
    }
}

export class TemplateOfflineError extends TemplateResolutionError {
    constructor(message: string) {
        super(message);
        this.name = 'TemplateOfflineError';
    }
}
