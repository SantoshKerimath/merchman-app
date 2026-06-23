import { GoogleGenerativeAI } from '@google/generative-ai'

let client: GoogleGenerativeAI | null = null

function getClient(): GoogleGenerativeAI {
  if (!client) {
    const key = process.env.GOOGLE_API_KEY
    if (!key) throw new Error('GOOGLE_API_KEY env var not set')
    client = new GoogleGenerativeAI(key)
  }
  return client
}

export async function analyzeWithGemini(
  prompt: string,
  context: string
): Promise<string> {
  const genai = getClient()
  const model = genai.getGenerativeModel({ model: 'gemini-2.5-pro' })

  const fullPrompt = `${context}\n\n---\n\n${prompt}`

  const result = await model.generateContent(fullPrompt)
  return result.response.text()
}
