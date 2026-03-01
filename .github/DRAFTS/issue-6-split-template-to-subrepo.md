---
name: Split Templates into Separate Git Repositories
about: Plan and implement separation of templates into individual git repositories
title: Split template into sub git repositories
labels: enhancement, architecture
assignees: ''
---

**Is your feature request related to a problem? Please describe.**

Templates are currently managed within the main repository. This makes it difficult to maintain, version, and contribute to individual templates independently. Community contributors may want to maintain their own template repositories.

**Describe the solution you'd like**

Split the template system into separate git repositories (e.g., `pzstudio-template-project`, `pzstudio-template-mod-simple`, `pzstudio-template-workshop`, `pzstudio-template-language`). The main pzstudio CLI will dynamically resolve templates using a configuration-driven system.

**Implementation Details**

The solution uses a 5-step template resolution chain to support multiple sources:

1. **Override URL** — If `--template <url>` flag provided, clone to temp directory, validate manifest, and return
2. **Cache Check** — If `~/.pzstudio/templates/<category>/` exists and is non-empty, return cached path
3. **Config/Default Clone** — If cache is missing, clone from `~/.pzstudio/config.json` settings or hardcoded defaults
4. **Embedded Fallback** — If cloning fails, warn and fall back to embedded `.template-<category>` in CLI distribution
5. **Error** — If no template is found, throw an actionable error

**Configuration Structure**

Templates are configured via `~/.pzstudio/config.json`:

```json
{
    "templates": {
        "project": {
            "url": "https://github.com/escapepz/pzstudio-template-project",
            "ref": "42.13.1"
        },
        "mod": {
            "url": "https://github.com/escapepz/pzstudio-template-mod",
            "ref": "42.13.1-simple"
        },
        "workshop": {
            "url": "https://github.com/escapepz/pzstudio-template-workshop",
            "ref": "default"
        },
        "language": {
            "url": "https://github.com/escapepz/pzstudio-template-language",
            "ref": "default"
        }
    }
}
```

Each template requires a `template.json` manifest in the repository root:

```json
{
    "type": "project|mod|workshop|language",
    "version": "1.0.0",
    "description": "Template description"
}
```

**CLI Integration**

- `pzstudio new <projectTitle> [modId] [--template <url>]` — Create project with optional custom template
- `pzstudio add <modName> [modId] [--template <url>]` — Add mod with optional custom template
- Commands automatically cache downloaded templates to `~/.pzstudio/templates/<category>/`

**Describe alternatives you've considered**

- Continue managing all templates in the main repository
- Use Git submodules without extracting to separate repos
- Implement a centralized template registry system

**Additional context**

- Embedded templates in `.template-*` directories serve as fallback when network templates are unavailable
- This change improves maintainability and allows independent template development
- Users can create and maintain custom templates in their own repositories
- Template updates are managed via direct JSON config editing (no CLI commands needed)
- VSCode extension can provide UI for editing template configuration in future

**Implementation Status**

- ✅ Phase 1: Template resolution infrastructure (`src/lib/templates.ts`)
- ✅ Phase 2: CLI integration with `--template` flag support in `new` and `add` commands
- ✅ Phase 3: Documentation updates (this issue)
- 🔄 Future: Template config management via `~/.pzstudio/config.json`
