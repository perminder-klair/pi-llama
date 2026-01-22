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

// --- Streaming thinking tag support ---

export interface ThinkingStreamState {
  buffer: string
  inThinking: boolean
  thinking: string
  text: string
}

/**
 * Create initial state for streaming thinking tag processing
 */
export function createThinkingStreamState(): ThinkingStreamState {
  return {
    buffer: '',
    inThinking: false,
    thinking: '',
    text: '',
  }
}

/**
 * Process a token during streaming, handling partial thinking tags.
 * Returns the updated state with thinking and text content.
 */
export function processThinkingToken(
  state: ThinkingStreamState,
  token: string
): ThinkingStreamState {
  const newState = { ...state }
  newState.buffer += token

  // Process buffer looking for tags
  while (true) {
    if (newState.inThinking) {
      // Look for closing tag
      const closeIdx = newState.buffer.indexOf('</think>')
      if (closeIdx !== -1) {
        // Found closing tag
        newState.thinking += newState.buffer.slice(0, closeIdx)
        newState.buffer = newState.buffer.slice(closeIdx + 8) // 8 = '</think>'.length
        newState.inThinking = false
        continue
      }

      // Check for potential partial closing tag at end
      const partialClose = findPartialTag(newState.buffer, '</think>')
      if (partialClose > 0) {
        // Move content before potential tag to thinking
        newState.thinking += newState.buffer.slice(0, partialClose)
        newState.buffer = newState.buffer.slice(partialClose)
      } else {
        // No partial tag, all content is thinking
        newState.thinking += newState.buffer
        newState.buffer = ''
      }
      break
    } else {
      // Look for opening tag
      const openIdx = newState.buffer.indexOf('<think>')
      if (openIdx !== -1) {
        // Found opening tag
        newState.text += newState.buffer.slice(0, openIdx)
        newState.buffer = newState.buffer.slice(openIdx + 7) // 7 = '<think>'.length
        newState.inThinking = true
        continue
      }

      // Check for potential partial opening tag at end
      const partialOpen = findPartialTag(newState.buffer, '<think>')
      if (partialOpen > 0) {
        // Move content before potential tag to text
        newState.text += newState.buffer.slice(0, partialOpen)
        newState.buffer = newState.buffer.slice(partialOpen)
      } else {
        // No partial tag, all content is text
        newState.text += newState.buffer
        newState.buffer = ''
      }
      break
    }
  }

  return newState
}

/**
 * Find where a partial tag might start at the end of a string.
 * Returns the index where the partial tag starts, or 0 if no partial match.
 */
function findPartialTag(str: string, tag: string): number {
  // Check if any suffix of str could be a prefix of tag
  for (let i = 1; i < tag.length && i <= str.length; i++) {
    const suffix = str.slice(-i)
    const prefix = tag.slice(0, i)
    if (suffix === prefix) {
      return str.length - i
    }
  }
  return 0
}
