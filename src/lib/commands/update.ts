import { addHelp } from '../help';
import { info, log, verbose, warn } from '../logger';
import { resolveTemplateDir, TemplateCategory } from '../templateManager';

addHelp(
    'update',
    `Update global template caches to the latest version.
    This command pulls the latest changes for all template categories (project, mod, workshop, language)
    and resets the local cache to match the remote source.

    Usages:
        pzstudio update - Refresh all global template caches from their remote sources.
    
    Flags:
        --verbose        - Enable diagnostic output.`,
);

export async function updateCmd() {
    log(`\nRefreshing global template caches...`);

    const categories: TemplateCategory[] = [
        'project',
        'mod',
        'workshop',
        'language',
    ];

    let successCount = 0;
    for (const category of categories) {
        try {
            log(`- Updating '${category}' templates...`);
            verbose(`Requesting template resolution for category: ${category}`);
            const path = resolveTemplateDir(category, false, true);
            verbose(`Templates for '${category}' updated at: ${path}`);
            successCount++;
        } catch (e: any) {
            warn(`Failed to update ${category} template: ${e.message}`);
        }
    }

    if (successCount === categories.length) {
        info('\nAll template caches refreshed successfully!');
    } else if (successCount > 0) {
        warn(
            `\nRefreshed ${successCount}/${categories.length} template caches. Some updates failed.`,
        );
    } else {
        warn('\nFailed to refresh template caches.');
    }
}
