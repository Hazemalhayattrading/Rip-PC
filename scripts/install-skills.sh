#!/usr/bin/env bash
# Installs the Rig Lab skills into .claude/skills (project scope).
# Run once from the repo root inside a Claude Code session with network access:  bash scripts/install-skills.sh
set -u
run() { echo "→ $*"; "$@" || echo "   ⚠ failed: $* (continue, install manually later)"; }

# Design
run npx -y skills add https://github.com/anthropics/skills --skill frontend-design -y
run npx -y skills add https://github.com/vercel-labs/agent-skills --skill web-design-guidelines -y
run npx -y skills add https://github.com/vercel-labs/agent-skills --skill vercel-react-best-practices -y
run npx -y skills add https://github.com/vercel-labs/agent-skills --skill composition-patterns -y

# Testing & quality
run npx -y skills add https://github.com/anthropics/skills --skill webapp-testing -y
run npx -y skills add https://github.com/addyosmani/web-quality-skills -y

# Process (plans, subagent-driven development, TDD)
run npx -y skills add obra/superpowers -y

# 3D (React Three Fiber) and motion
run npx -y skills add EnzeD/r3f-skills -y
run npx -y skills add https://github.com/freshtechbro/claudedesignskills -y

echo
echo "Plugins — run these two inside Claude Code (slash commands):"
echo "  /plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill"
echo "  /plugin install ui-ux-pro-max@ui-ux-pro-max-skill"
echo
echo "MCP servers (Playwright, Context7) are already declared in .mcp.json."
ls .claude/skills 2>/dev/null
