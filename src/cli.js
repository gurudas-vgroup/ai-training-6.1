import readline from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import { query } from '@anthropic-ai/claude-agent-sdk'
import { shopifyOpsServer, ALLOWED_TOOLS } from './tools/server.js'

const SYSTEM_PROMPT = [
  'You are a Shopify operations agent for store staff.',
  '',
  'You have exactly two tools:',
  "- check_inventory_level: read-only. Needs a product name and a location",
  '  name exactly as they appear in Shopify. No approval needed.',
  '- update_order_status: closes, reopens, or cancels an order. It needs the',
  "  caller's role (admin, staff, or shopper) and whether they have explicitly",
  '  confirmed the action. Read both from what the user actually told you —',
  '  never assume admin, and never assume confirmed.',
  '',
  'If a tool reports it was not approved, or returns an error, relay that',
  'plainly and do not retry with invented details. Never claim an order was',
  'changed, or stock was checked, unless the tool result actually says so.',
].join('\n')

const baseOptions = {
  mcpServers: { shopify: shopifyOpsServer },
  allowedTools: ALLOWED_TOOLS,
  tools: [], // no built-in tools — only the two MCP tools above are reachable.
  strictMcpConfig: true,
  permissionMode: 'dontAsk', // auto-run allowedTools, hard-deny everything else.
  systemPrompt: SYSTEM_PROMPT,
}

function printAssistantText(message) {
  if (message.type !== 'assistant') return
  for (const block of message.message.content) {
    if (block.type === 'text') stdout.write(`${block.text}\n`)
  }
}

async function runOneShot(prompt) {
  for await (const message of query({ prompt, options: baseOptions })) {
    printAssistantText(message)
    if (message.type === 'result' && message.is_error) {
      console.error(`Agent stopped: ${message.subtype}`)
      process.exitCode = 1
    }
  }
}

/**
 * Yields one SDKUserMessage per line typed. "exit"/"quit" ends the process
 * directly — once an MCP server is registered, the SDK's subprocess waits on
 * bidirectional traffic rather than treating generator completion as EOF, so
 * it will not exit on its own. The SDK's own process 'exit' handler tears
 * down that subprocess cleanly, so calling process.exit() here is safe.
 */
async function* userTurns(rl) {
  for (;;) {
    const line = await rl.question('> ')
    const trimmed = line.trim()

    if (['exit', 'quit'].includes(trimmed.toLowerCase())) {
      process.exit(0)
    }
    if (!trimmed) continue

    yield {
      type: 'user',
      message: { role: 'user', content: trimmed },
      parent_tool_use_id: null,
    }
  }
}

async function runRepl() {
  const rl = readline.createInterface({ input: stdin, output: stdout })
  console.log('Shopify Ops Agent — type "exit" or "quit" to leave.\n')

  for await (const message of query({ prompt: userTurns(rl), options: baseOptions })) {
    printAssistantText(message)
  }
}

const requestArg = process.argv.slice(2).join(' ').trim()

if (requestArg) {
  await runOneShot(requestArg)
} else {
  await runRepl()
}
