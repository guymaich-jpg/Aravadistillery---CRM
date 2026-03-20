# Security Scan — Snyk Agent Scan

You are a security engineer. Run Snyk Agent Scan to detect prompt injections, tool poisoning, malware payloads, hardcoded secrets, and other vulnerabilities in agent configurations and skills.

**Source:** [snyk/agent-scan](https://github.com/snyk/agent-scan)

## Prerequisites Check

First, verify the environment is ready:

```bash
# Check uv is installed
which uv || echo "ERROR: uv not installed. Install from https://docs.astral.sh/uv/getting-started/installation/"

# Check SNYK_TOKEN is set
if [ -z "$SNYK_TOKEN" ]; then
  echo "WARNING: SNYK_TOKEN not set. Get one from https://app.snyk.io/account"
  echo "Set it with: export SNYK_TOKEN=your-api-token"
fi
```

If SNYK_TOKEN is not set, ask the user to provide it before proceeding.

## Scan Modes

Based on the argument `$ARGUMENTS`, determine what to scan:

- **No argument or `full`** → Full scan: auto-discover all agents, MCP servers, and skills on this machine
- **`skills`** → Skills-only scan: scan agent skills (Claude Code, Cursor, etc.)
- **`mcp`** → MCP-only scan: scan MCP server configurations
- **A file/directory path** → Scan that specific config file or skills directory

## Execute Scan

Run the appropriate scan command:

### Full Scan (default)
```bash
uvx snyk-agent-scan@latest --skills 2>&1
```

### Skills Only
```bash
uvx snyk-agent-scan@latest --skills ~/.claude/skills 2>&1
```

### MCP Only
```bash
uvx snyk-agent-scan@latest 2>&1
```

### Specific Path
```bash
uvx snyk-agent-scan@latest --skills <path> 2>&1
```

### JSON Output (for CI/programmatic use)
```bash
uvx snyk-agent-scan@latest --skills --json 2>&1
```

## Interpret Results

After the scan completes, analyze and present the findings:

### Issue Severity Reference

| Code | Severity | Description |
|------|----------|-------------|
| E001 | CRITICAL | Prompt injection in MCP tool description |
| E002 | CRITICAL | Cross-server tool reference (tool shadowing) |
| E003 | CRITICAL | Tool description hijacks agent behavior |
| E004 | CRITICAL | Prompt injection in skill |
| E005 | CRITICAL | Suspicious download URL in skill |
| E006 | CRITICAL | Malicious code patterns in skill |
| TF001 | HIGH | Toxic data flow between tools |
| W001 | MEDIUM | Suspicious words in tool description |
| W002 | MEDIUM | Too many entities (>100 tools/resources) |
| W007 | MEDIUM | Insecure credential handling in skill |
| W008 | MEDIUM | Hardcoded secrets in skill |
| W009 | LOW | Missing description in skill |
| W010 | LOW | Missing tool annotations |
| W011 | MEDIUM | Untrusted content reference in skill |

## Output Format

Present results as a **Security Scan Report**:

```
# Snyk Agent Scan Report
**Date:** <current date>
**Scan Mode:** <Full / Skills / MCP / Custom path>
**Scanner Version:** snyk-agent-scan (latest)

## Summary
- Critical (E001-E006): <count>
- High (TF001): <count>
- Warnings (W001-W011): <count>
- Clean components: <count>

## Findings

### [CRITICAL] E00X: <Issue title>
**Component:** <MCP server name / Skill name>
**Location:** <file path>
**Evidence:** <what was detected>
**Recommendation:** <specific remediation>

### [WARNING] W00X: <Issue title>
...

## Clean Components
<List components that passed all checks>

## Recommendations
<Prioritized list of actions to take>
```

**Rules:**
- Always show the raw scan output first, then your analysis
- For CRITICAL findings, recommend immediate action
- For warnings, provide context on whether they're actionable in this project
- If the scan finds no issues, confirm the clean bill of health
