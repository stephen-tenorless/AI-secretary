<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

# AI Secretary

An AI-powered personal secretary mobile app built with React Native (Expo), AWS, and Nx monorepo.

## Architecture

- `apps/mobile` - React Native (Expo) mobile app
- `apps/infrastructure` - AWS CDK infrastructure (DynamoDB, Lambda, API Gateway, Cognito, SNS/SQS)
- `libs/shared` - Shared TypeScript types, constants, and utilities

## Key Technologies

- **Frontend**: React Native (Expo SDK 52), React Navigation, Zustand, Feather Icons
- **Backend**: AWS Lambda (Node.js 20, ARM64), API Gateway, DynamoDB (single-table design), Cognito
- **AI**: AWS Bedrock (Claude) with tool-use for agentic task management
- **Notifications**: Expo Push Notifications, SQS queues, EventBridge scheduled rules

## DynamoDB Single-Table Design

All entities stored in one table with composite keys (PK/SK) and 2 GSIs:
- GSI1: Secondary access patterns (tasks by status, events by date)
- GSI2: Scheduled lookups (reminders by trigger time)

## AI Agent

The AI chat Lambda (`agent/ai-chat.ts`) uses Claude tool-use with these tools:
- `create_task`, `create_event`, `set_smart_reminder`, `search_tasks`, `get_schedule`, `suggest_task_group`

Context-aware reminders are the key feature - e.g., fasting reminders at dinner time before morning blood work.
