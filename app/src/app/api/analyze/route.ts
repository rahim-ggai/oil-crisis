import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPT = `You are a senior analyst for Pakistan's National Energy Security Working Group, April 2026. The US-Israel attack on Iran (Operation Epic Fury, 28 Feb 2026) has effectively closed the Strait of Hormuz. Pakistan faces a fuel supply crisis.

You have access to the current scenario data from the crisis simulation model. Answer the question with:

1. **Recommendation** — A clear, direct 1-2 sentence recommendation for the Committee.
2. **Reasoning** — 3-5 bullet points with specific numbers from the data. Each bullet should cite a data point.
3. **Key Risks** — 2-3 risk factors that could change this recommendation.
4. **Monitor** — 2-3 metrics to watch going forward.

Be concise, authoritative, and decisive. This is for the DG ISI and senior Cabinet members. Do not hedge. Use specific numbers. Do not use emojis or markdown headers — use plain text with bullet points (- prefix).`;

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
