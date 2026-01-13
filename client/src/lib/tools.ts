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
]

// Mock tool implementations
export function executeTool(
  name: string,
  args: Record<string, unknown>
): string {
  switch (name) {
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
