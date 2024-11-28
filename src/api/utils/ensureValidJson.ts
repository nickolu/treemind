

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function ensureValidJson(
  jsonString: string,
  objectProperties: object,
): Promise<object | undefined> {
  try {
    // Attempt to parse the JSON string directly
    const parsedJSON = JSON.parse(jsonString);

    // Check if all required properties are present
    const requiredProperties = Object.keys(objectProperties);
    const hasAllProperties = requiredProperties.every(
      (prop) => prop in parsedJSON,
    );

    if (hasAllProperties) {
      return parsedJSON;
    } else {
      throw new Error('Failed to parse JSON');
    }
  } catch (error) {
    console.log('error parsing json', error);
    const functionDefinition = {
      name: 'parse_json',
      description: 'Parses a JSON string and returns a valid JSON object',
      parameters: {
        type: 'object',
        properties: objectProperties,
        required: Object.keys(objectProperties),
      },
    };

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content:
            'Please ensure the following input from the user is valid json, transforming it if necessary.',
        },
        {
          role: 'user',
          content: `Parse the following JSON string: ${jsonString}`,
        },
      ],
      functions: [functionDefinition],
      function_call: {name: 'parse_json'},
    });

    const toolCall = response.choices[0].message.tool_calls?.[0];
    if (toolCall && toolCall.function.arguments) {
      const parsedArgs = JSON.parse(toolCall.function.arguments);
      return parsedArgs;
    }
    console.error('Failed to parse JSON');
    throw new Error('Failed to parse JSON');
  }
}

async function ensureValidJsonWithRecursiveRetries(
  jsonString: string,
  objectProperties: object,
  retries: number = 3,
): Promise<object> {
  try {
    const result = await ensureValidJson(jsonString, objectProperties);

    if (result) {
      return result;
    }
    throw new Error('Failed to parse JSON');
  } catch (error) {
    if (retries > 0) {
      return await ensureValidJsonWithRecursiveRetries(
        jsonString,
        objectProperties,
        retries - 1,
      );
    }
    console.error('Failed to parse JSON', error);
    throw error;
  }
}

export {ensureValidJsonWithRecursiveRetries as ensureValidJson};
