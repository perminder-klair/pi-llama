// Parse thinking tags from LLM response
export function parseThinkingTags(reply: string): {
  text: string
  thinking: string | null
} {
  const thinkMatch = reply.match(/<think>([\s\S]*?)<\/think>/)
  if (thinkMatch) {
    return {
      thinking: thinkMatch[1].trim(),
      text: reply.replace(/<think>[\s\S]*?<\/think>/, '').trim(),
    }
  }
  return { text: reply, thinking: null }
}
