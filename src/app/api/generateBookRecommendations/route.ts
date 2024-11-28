import {ensureSafeUserInput} from '@/app/utils/openaiUtils/ensureSafeUserInput';
import {ensureValidJson} from '@/app/utils/openaiUtils/ensureValidJson';
import {NextResponse} from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const prompt = (input: string) => {
  return `What books can you recommend to solve this problem: 
  PROBLEM DESCRIPTION:
  \`\`\`
  ${input}
  \`\`\`
  
  please return a valid json object with the book recommendations with the following format:

{
  "books": [
    {
      "title": "The Great Gatsby",
      "author": "F. Scott Fitzgerald"
    }
  ]
}

please only include valid json in your response and no other comments and limit your response to three books
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
      books: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            book: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: {type: 'string'},
                  author: {type: 'string'},
                },
                required: ['title', 'author'],
              },
            },
          },
          required: ['book'],
        },
      },
    });

    return NextResponse.json(validJson);
  } catch (error) {
    console.error(error);
    return NextResponse.json({error: 'An error occurred'}, {status: 500});
  }
}
