import { runEval } from '../evalTools';
import { runLLM } from '../../src/llm';
import { ToolCallMatch } from '../scorers';
import { dadJokeToolDefinition } from '../../src/tools/dadJoke';
import { generateImageToolDefinition } from '../../src/tools/generateImage';

const createToolCallMessage = (toolName: string) => ({
  role: 'assistant',
  tool_calls: [
    {
      type: 'function',
      function: { name: toolName },
    },
  ],
});

runEval('generateImage', {
  task: (input) =>
    runLLM({
      messages: [{ role: 'user', content: input }],
      tools: [generateImageToolDefinition],
    }),
  data: [
    {
      input: 'create an image about the sun',
      expected: createToolCallMessage(generateImageToolDefinition.name),
    },
    {
      input: 'how would you draw a tree?',
      expected: createToolCallMessage(generateImageToolDefinition.name),
    },
    {
      input: `how would a dog looks like in a beach?`,
      expected: createToolCallMessage(generateImageToolDefinition.name),
    },
  ],
  scorers: [ToolCallMatch],
});
