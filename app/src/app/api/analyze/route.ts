import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPT = `You are a senior analyst for Pakistan's National Energy Security Working Group, April 2026. The US-Israel attack on Iran (Operation Epic Fury, 28 Feb 2026) has effectively closed the Strait of Hormuz. Pakistan faces a fuel supply crisis.

You have access to the current scenario data from the crisis simulation model. Structure your response EXACTLY as follows with these section headers on their own lines:

**Recommendation**
A clear, direct 1-2 sentence recommendation for the Committee.

**Reasoning**
- First bullet point with specific data (cite numbers)
- Second bullet point
- Third bullet point (3-5 total)

**Key Risks**
- Risk factor 1
- Risk factor 2
- Risk factor 3

**Monitor**
- Metric to watch 1
- Metric to watch 2

RULES:
- Use **bold** only for section headers and key numbers within bullet points
- Each bullet starts with "- "
- Be concise, authoritative, decisive. No hedging.
- Cite specific numbers from the scenario data.
- This is for senior Cabinet members and the DG ISI.
- No emojis, no hashtag headers, no code blocks.`;

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY not configured', reasoning: null },
      { status: 503 }
    );
  }

  try {
    const { question, scenarioContext } = await request.json();

    if (!question || !scenarioContext) {
      return NextResponse.json(
        { error: 'Missing question or scenarioContext' },
        { status: 400 }
      );
    }

    const client = new Anthropic({ apiKey });

    const userMessage = `SCENARIO DATA:
${JSON.stringify(scenarioContext, null, 2)}

QUESTION: ${question}

Provide your analysis based on the scenario data above.`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    return NextResponse.json({ reasoning: text });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: `Claude API error: ${message}`, reasoning: null },
      { status: 500 }
    );
  }
}
