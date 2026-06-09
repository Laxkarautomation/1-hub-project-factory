# 1 Hub Project Factory Rules

## Core Purpose
1 Hub Project Factory is a development factory for creating exportable, deployable, modular projects.

## Golden Rules
- Do not build giant single-file projects.
- Every project must be modular.
- Every project must be exportable as an independent repo/ZIP.
- Factory is only the builder, not the permanent home of projects.
- Secrets must never be committed.
- Use .env for real secrets and .env.example for sample keys.
- Design providers so free/paid APIs can be switched later without major code changes.
- Every project must include README, setup guide, deployment guide, and memory file.

## Required Project Structure
Each project must include:
- docs/
- src/ or apps/
- packages/ if needed
- prompts/
- config/
- tests/
- export/
- README.md
- .env.example
- PROJECT_MEMORY.md

## Security Rules
- Never expose API keys in code.
- Never commit .env files.
- Use role-based access where admin/user roles exist.
- Keep user data separated by workspace/account.
- Log errors without leaking secrets.

## Development Rules
- Plan first.
- Scaffold second.
- Build core modules third.
- Test before expansion.
- Export before cleanup.
