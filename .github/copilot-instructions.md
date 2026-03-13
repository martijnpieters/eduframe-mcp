# Copilot Instructions

## Environment Setup

This project uses [asdf](https://asdf-vm.com/) for managing runtime versions. The required versions are defined in `.tool-versions`. Run `asdf install` after cloning to install them.

Use [pnpm](https://pnpm.io/) as the package manager. Install dependencies with `pnpm install`.

## Development Guidelines

- When adding new MCP tools, update the `README.md` to document them.
- Before every commit, run `pnpm build` to typecheck and ensure the project compiles without errors.
