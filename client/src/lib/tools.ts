import type { ToolDefinition } from './chat-types'

// Tool definitions for the API
export const toolDefinitions: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: 'Get current weather for a location',
      parameters: {
        type: 'object',
        properties: {
          location: { type: 'string', description: 'City name' },
          unit: {
            type: 'string',
            enum: ['celsius', 'fahrenheit'],
            description: 'Temperature unit',
          },
        },
        required: ['location'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calculator',
      description: 'Perform mathematical calculations',
      parameters: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: "Math expression to evaluate, e.g. '15 * 23'",
          },
        },
        required: ['expression'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_time',
      description: 'Get current date and time',
      parameters: {
        type: 'object',
        properties: {
          timezone: { type: 'string', description: 'Timezone (optional)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'save_memory',
      description:
        'Save an important fact about the user for future reference. Use this when the user shares preferences, personal information, or anything worth remembering.',
      parameters: {
        type: 'object',
        properties: {
          content: {
            type: 'string',
            description:
              'The fact or preference to remember, e.g. "User prefers dark mode" or "User\'s name is Alex"',
          },
          category: {
            type: 'string',
            enum: ['preference', 'personal', 'general'],
            description: 'Category of the memory',
          },
        },
        required: ['content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'recall_memories',
      description:
        'Search for relevant memories about the user. Use this to recall previously saved information.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description:
              'Search query to find relevant memories, e.g. "name" or "preferences"',
          },
        },
        required: ['query'],
      },
    },
  },
]

// Tool implementations (some mock, some real API calls)
export async function executeTool(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case 'save_memory': {
      try {
        const response = await fetch('/memories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: args.content as string,
            category: (args.category as string) || 'general',
          }),
        })
        const data = await response.json()
        return JSON.stringify({
          saved: true,
          id: data.id,
          content: data.content,
        })
      } catch (error) {
        return JSON.stringify({
          saved: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    case 'recall_memories': {
      try {
        const query = encodeURIComponent(args.query as string)
        const response = await fetch(`/memories/search?q=${query}&limit=5`)
        const data = await response.json()
        if (data.results && data.results.length > 0) {
          return JSON.stringify({
            found: true,
            memories: data.results.map(
              (m: { content: string; category: string; similarity: number }) => ({
                content: m.content,
                category: m.category,
                relevance: m.similarity,
              })
            ),
          })
        }
        return JSON.stringify({ found: false, memories: [] })
      } catch (error) {
        return JSON.stringify({
          found: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    case 'get_weather': {
      const temps: Record<string, number> = {
        Tokyo: 22,
        London: 15,
        'New York': 18,
        Paris: 17,
        Sydney: 25,
      }
      const conditions = ['sunny', 'cloudy', 'partly cloudy', 'rainy']
      const location = args.location as string
      const temp = temps[location] || Math.floor(Math.random() * 20) + 10
      const condition = conditions[Math.floor(Math.random() * conditions.length)]
      const unit = (args.unit as string) || 'celsius'
      const displayTemp =
        unit === 'fahrenheit' ? Math.round((temp * 9) / 5 + 32) : temp
      return JSON.stringify({ location, temperature: displayTemp, unit, condition })
    }

    case 'calculator': {
      try {
        const expression = args.expression as string
        // Safe eval for basic math - remove non-math characters
        const sanitized = expression.replace(/[^0-9+\-*/().%\s]/g, '')
        const result = Function('"use strict"; return (' + sanitized + ')')()
        return JSON.stringify({ expression, result })
      } catch {
        return JSON.stringify({ error: 'Invalid expression' })
      }
    }

    case 'get_time': {
      const now = new Date()
      return JSON.stringify({
        datetime: now.toISOString(),
        local: now.toLocaleString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })
    }

    default:
      return JSON.stringify({ error: 'Unknown tool' })
  }
}
