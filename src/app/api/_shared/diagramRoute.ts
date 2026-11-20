import {NextResponse} from 'next/server';
import OpenAI from 'openai';
import {ensureSafeUserInput} from '@/app/utils/openaiUtils/ensureSafeUserInput';
import {FAST_REASONING} from '@/app/utils/aiModels';
import {AI_LAYOUT_CHOICES} from '@/app/utils/diagramAi';
import {LAYOUTS} from '@/domain/MindMap/document';
import {LINK_KINDS, LINK_KIND_IDS} from '@/domain/MindMap/links';
import {SHAPES, SHAPE_IDS} from '@/domain/MindMap/shapes';

/** Shared by the diagram routes (expandDiagram, designDiagram). */
export const MAX_MAP_LENGTH = 60_000;
export const MAX_CONTEXT_LENGTH = 100_000;

export const shapeGuide = SHAPE_IDS.map(
  (shape) => `  - ${shape}: ${SHAPES[shape].hint}`,
).join('\n');

export const linkKindGuide = LINK_KIND_IDS.map(
  (kind) => `  - ${kind}: ${LINK_KINDS[kind].description.toLowerCase()}`,
).join('\n');

export const layoutGuide = AI_LAYOUT_CHOICES.map((id) =>
  id === 'keep'
    ? '  - keep: leave the layout as it is'
    : `  - ${id}: ${LAYOUTS[id].description}`,
).join('\n');

export const stringArray = {type: 'array', items: {type: 'string'}};

export const text = (value: unknown, max = 200) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

export const texts = (value: unknown, max = 30) =>
  Array.isArray(value)
    ? value
        .map((v) => text(v))
        .filter(Boolean)
        .slice(0, max)
    : [];

export const list = (value: unknown) =>
  (Array.isArray(value) ? value : []).filter(
    (v): v is Record<string, unknown> => !!v && typeof v === 'object',
  );

interface DiagramPostOptions<Input, Output> {
  request: Request;
  /** Returns the validated input, or an error message for a 400. */
  parse: (body: unknown) => Input | string;
  buildPrompt: (input: Input) => string;
  model: (input: Input) => string;
  /** The text the safety check looks at. */
  safetyText: (input: Input) => string;
  schemaName: string;
  schema: Record<string, unknown>;
  sanitize: (raw: unknown) => Output;
}

/**
 * The common request flow: parse, then run the safety check alongside the
 * completion (the result is discarded if the input is unsafe).
 */
export async function handleDiagramPost<Input, Output>({
  request,
  parse,
  buildPrompt,
  model,
  safetyText,
  schemaName,
  schema,
  sanitize,
}: DiagramPostOptions<Input, Output>) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      {error: 'OPENAI_API_KEY is not configured on the server.'},
      {status: 500},
    );
  }

  let parsed: Input | string;
  try {
    parsed = parse(await request.json());
  } catch {
    return NextResponse.json({error: 'Invalid request body.'}, {status: 400});
  }
  if (typeof parsed === 'string') {
    return NextResponse.json({error: parsed}, {status: 400});
  }
  const input = parsed;

  try {
    const openai = new OpenAI({apiKey: process.env.OPENAI_API_KEY});

    // As in generateContextualNodes, the safety check runs alongside
    // generation and the result is discarded if the input is unsafe.
    const [safety, completion] = await Promise.all([
      ensureSafeUserInput(safetyText(input)) as Promise<{
        isSafe: boolean;
        reason: string;
      }>,
      openai.chat.completions.create({
        model: model(input),
        ...FAST_REASONING,
        messages: [{role: 'user', content: buildPrompt(input)}],
        response_format: {
          type: 'json_schema',
          json_schema: {name: schemaName, strict: true, schema},
        },
      }),
    ]);

    if (!safety?.isSafe) {
      console.error('Unsafe input:', safety?.reason);
      return NextResponse.json(
        {error: 'This content can’t be used to generate a diagram.'},
        {status: 400},
      );
    }

    const content = completion.choices[0]?.message.content ?? '{}';
    return NextResponse.json(sanitize(JSON.parse(content)));
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {error: 'The AI service is unavailable. Please try again.'},
      {status: 502},
    );
  }
}
