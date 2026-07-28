@"
# CLAUDE.md

This file gives AI assistants (Claude Code, Cursor, etc.) the context they need to work in this repository.

## Project Overview

**Capstone Project** is [one-sentence description of the project].

## Tech Stack

- Runtime: Node.js (LTS)
- Language: TypeScript
- Package manager: npm

## Conventions

### Commits

All commits follow the Conventional Commits specification: `<type>: <description>`.
Types used: feat, fix, docs, refactor, test, chore.
Example: `feat(auth): add login endpoint`

### Code Style

- Use TypeScript for all source files.
- Keep functions small and single-purpose.
- Prefer clear, descriptive names.

## Notes for AI Assistants

- Follow the commit convention above for every commit.
- Match the existing code style and file structure.
- Ask before introducing a new dependency or framework.
"@ | Out-File -Encoding utf8 CLAUDE.md