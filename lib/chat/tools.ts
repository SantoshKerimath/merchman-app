import Anthropic from '@anthropic-ai/sdk'

export const TOOL_DEFINITIONS: Anthropic.Tool[] = [
  {
    name: 'run_sql',
    description:
      'Execute a read-only SQL SELECT query against the MerchMan database. Always include brand_id in WHERE clause. Use transaction_date for settlements, start_date for ppc_data, date for business_metrics.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Valid PostgreSQL SELECT statement' },
        description: { type: 'string', description: 'What this query fetches (for display)' },
      },
      required: ['query', 'description'],
    },
  },
  {
    name: 'generate_chart',
    description:
      'Render a chart from data. Call this after run_sql when visualization would help.',
    input_schema: {
      type: 'object' as const,
      properties: {
        type: { type: 'string', enum: ['bar', 'line', 'area', 'pie'] },
        title: { type: 'string' },
        data: { type: 'array', items: { type: 'object' } },
        xKey: { type: 'string' },
        yKeys: { type: 'array', items: { type: 'string' } },
        currency: { type: 'boolean', description: 'Format y-axis as INR' },
      },
      required: ['type', 'title', 'data', 'xKey', 'yKeys'],
    },
  },
  {
    name: 'export_xlsx',
    description: 'Export data as an Excel spreadsheet and return a download link.',
    input_schema: {
      type: 'object' as const,
      properties: {
        filename: { type: 'string' },
        sheets: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              headers: { type: 'array', items: { type: 'string' } },
              rows: { type: 'array', items: { type: 'array' } },
            },
          },
        },
      },
      required: ['filename', 'sheets'],
    },
  },
  {
    name: 'build_ppt',
    description: 'Build a PowerPoint presentation and return a download link.',
    input_schema: {
      type: 'object' as const,
      properties: {
        filename: { type: 'string' },
        title: { type: 'string' },
        slides: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              heading: { type: 'string' },
              body: { type: 'string' },
              bullets: { type: 'array', items: { type: 'string' } },
            },
            required: ['heading'],
          },
        },
      },
      required: ['filename', 'title', 'slides'],
    },
  },
  {
    name: 'draft_email',
    description:
      'Compose a professional client-ready email about brand performance. Use this when the user asks to draft, write, or create an email — performance update, weekly summary, campaign review, or any client communication. The email is returned as formatted text the user can copy.',
    input_schema: {
      type: 'object' as const,
      properties: {
        subject: { type: 'string', description: 'Email subject line' },
        to: { type: 'string', description: 'Recipient name or role, e.g. "Client — Kridlo Team"' },
        body: {
          type: 'string',
          description:
            'Full email body in plain text with markdown formatting. Include greeting, key metrics/insights, narrative, and a clear closing. Use actual numbers from the data you queried.',
        },
        tone: {
          type: 'string',
          enum: ['professional', 'friendly', 'concise'],
          description: 'Email tone',
        },
      },
      required: ['subject', 'to', 'body'],
    },
  },
  {
    name: 'analyze_with_gemini',
    description:
      'Use Gemini 2.5 Pro for heavy context analysis — long documents, multi-month data dumps, or cross-brand reports exceeding 10,000 words of context. Returns analysis as text.',
    input_schema: {
      type: 'object' as const,
      properties: {
        prompt: { type: 'string', description: 'Specific question to answer' },
        context: { type: 'string', description: 'The large body of text/data to analyse' },
      },
      required: ['prompt', 'context'],
    },
  },
]
