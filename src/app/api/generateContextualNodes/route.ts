import {ensureSafeUserInput} from '@/app/utils/openaiUtils/ensureSafeUserInput';
import {ensureValidJson} from '@/app/utils/openaiUtils/ensureValidJson';
import {NextResponse} from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const prompt = (input: string) => {
  return `Please suggest 3 additional nodes to add as children to the last node of the following mindmap: 

  MIND MAP TREE:
  \`\`\`
  ${input}
  \`\`\`
  
  please return a valid json object with the suggested nodes in the following format:

{
  "nodes": [
    'Suggestion 1',
    'Suggestion 2',
    'Suggestion 3'
  ]
}

please only include valid json in your response and no other comments and limit your response to three books. Also please don't wrap the JSON in backticks
`;
};

export async function POST(request: Request) {
  try {
    const {input} = await request.json();

    const safeInput = (await ensureSafeUserInput(input)) as {
      isSafe: boolean;
      reason: string;
    };

    if (!safeInput?.isSafe) {
      console.error(safeInput.reason);
      return NextResponse.json({error: 'Input is not safe'}, {status: 400});
    }

    if (safeInput && safeInput.isSafe && safeInput.reason) {
      console.log('determined input is safe because: ', safeInput.reason);
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{role: 'user', content: prompt(input)}],
    });

    const response = completion.choices[0].message.content ?? '';

    const validJson = await ensureValidJson(response, {
      nodes: {
        type: 'array',
        items: {
          type: 'string',
        },
      },
    });

    return NextResponse.json(validJson);
  } catch (error) {
    console.error(error);
    return NextResponse.json({error: 'An error occurred'}, {status: 500});
  }
}
