import {ensureSafeUserInput} from '@/app/utils/openaiUtils/ensureSafeUserInput';
import {NEW_NODES_MARKER} from '@/app/utils/aiConstants';
import {NextResponse} from 'next/server';
import OpenAI from 'openai';

const MAX_INPUT_LENGTH = 20_000;
const MAX_IDEAS = 8;

const prompt = (
  input: string,
) => `You are helping someone brainstorm with a mind map.

Suggest new child nodes for the node marked "${NEW_NODES_MARKER}" in the tree below.

Guidelines:
- Suggest between 3 and ${MAX_IDEAS} ideas, as many as genuinely make sense.
- Each idea is a short phrase (ideally under 8 words), not a sentence.
- Ideas must fit the target node in the context of the whole map.
- Don't repeat the node's existing children or other nodes in the map.

MIND MAP:
\`\`\`
${input}
\`\`\``;

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      {error: 'OPENAI_API_KEY is not configured on the server.'},
      {status: 500},
    );
  }

  let input: unknown;
  try {
    ({input} = await request.json());
  } catch {
    return NextResponse.json({error: 'Invalid request body.'}, {status: 400});
  }
  if (typeof input !== 'string' || !input.trim()) {
    return NextResponse.json({error: 'Missing input.'}, {status: 400});
  }
  if (input.length > MAX_INPUT_LENGTH) {
    return NextResponse.json(
      {error: 'This mind map is too large to send to the AI.'},
      {status: 413},
    );
  }

  try {
    const openai = new OpenAI({apiKey: process.env.OPENAI_API_KEY});

    // Run the safety check alongside generation instead of before it, which
    // roughly halves the wait; the result is discarded if the input is unsafe.
    const [safety, completion] = await Promise.all([
      ensureSafeUserInput(input) as Promise<{isSafe: boolean; reason: string}>,
      openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{role: 'user', content: prompt(input)}],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'mind_map_ideas',
            strict: true,
            schema: {
              type: 'object',
              properties: {nodes: {type: 'array', items: {type: 'string'}}},
              required: ['nodes'],
              additionalProperties: false,
            },
          },
        },
      }),
    ]);

    if (!safety?.isSafe) {
      console.error('Unsafe input:', safety?.reason);
      return NextResponse.json(
        {error: 'This content can’t be used to generate ideas.'},
        {status: 400},
      );
    }

    const content = completion.choices[0]?.message.content ?? '{}';
    const parsed = JSON.parse(content) as {nodes?: unknown};
    const nodes = Array.isArray(parsed.nodes)
      ? parsed.nodes
          .filter((n): n is string => typeof n === 'string')
          .map((n) => n.trim())
          .filter(Boolean)
          .slice(0, MAX_IDEAS)
      : [];

    return NextResponse.json({nodes});
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {error: 'The AI service is unavailable. Please try again.'},
      {status: 502},
    );
  }
}
