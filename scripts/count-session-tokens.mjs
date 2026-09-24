#!/usr/bin/env node
/**
 * Counts the tokens an AI coding session spent, from a Claude Code transcript
 * (~/.claude/projects/<project>/<session-id>.jsonl). This is how the "This
 * project" preset's number was measured.
 *
 * Usage: node scripts/count-session-tokens.mjs <transcript.jsonl> [...more]
 *
 * "Processed" counts every token the model read or wrote on every call. Most
 * of it is cache reads: each turn re-reads the conversation so far, which is
 * far cheaper to compute than fresh input, but still processed.
 */
import { readFileSync } from 'node:fs'

const files = process.argv.slice(2)
if (files.length === 0) {
  console.error('Usage: node scripts/count-session-tokens.mjs <transcript.jsonl> [...more]')
  process.exit(1)
}

// Claude Code writes one line per content block, repeating the same message usage: keep one per message id.
const messages = new Map()
for (const file of files) {
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue
    let entry
    try {
      entry = JSON.parse(line)
    } catch {
      continue
    }
    const message = entry.message
    if (message?.role === 'assistant' && message.usage) messages.set(message.id ?? entry.uuid, message.usage)
  }
}

const totals = { input: 0, cacheWrite: 0, cacheRead: 0, output: 0 }
for (const usage of messages.values()) {
  totals.input += usage.input_tokens ?? 0
  totals.cacheWrite += usage.cache_creation_input_tokens ?? 0
  totals.cacheRead += usage.cache_read_input_tokens ?? 0
  totals.output += usage.output_tokens ?? 0
}
const processed = totals.input + totals.cacheWrite + totals.cacheRead + totals.output
const format = (value) => value.toLocaleString('en')
console.log(`API calls:              ${format(messages.size)}`)
console.log(`Fresh input:            ${format(totals.input + totals.cacheWrite)}`)
console.log(`Re-read context (cache): ${format(totals.cacheRead)}`)
console.log(`Output:                 ${format(totals.output)}`)
console.log(`Processed (total):      ${format(processed)}`)
