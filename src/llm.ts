import type { AIMessage } from '../types';
import { openai } from './ai';
import { zodFunction, zodResponseFormat } from 'openai/helpers/zod';
import { systemPrompt as defaultSystemPrompt } from './systemPrompt';
import { z } from 'zod';

export const runLLM = async ({
  messages,
  tools = [],
  temperature = 0.1,
  systemPrompt,
}: {
  messages: AIMessage[];
  tools?: any[];
  temperature?: number;
  systemPrompt?: string;
}) => {
  const formattedTools = tools.map(zodFunction);

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature,
    messages: [
      {
        role: 'system',
        content: systemPrompt || defaultSystemPrompt,
      },
      ...messages,
    ],
    ...(formattedTools.length > 0 && {
      tools: formattedTools,
      tool_choice: 'auto',
      parallel_tool_calls: false,
    }),
  });

  return response.choices[0].message;
};

const approvalFormat = zodResponseFormat(
  z.object({
    approved: z.boolean().describe('did the user say they approved or not?'),
  }),
  'approval_format'
);

export const runApprovalLLM = async (userMessage: string, tools: string[]) => {
  const response = await openai.beta.chat.completions.parse({
    response_format: approvalFormat,
    model: 'gpt-4o-mini',
    temperature: 0.1,
    messages: [
      {
        role: 'system',
        content: `
        Your job is to determine if the user approved any of the actions below:
        ${tools.map((tool) => `- ${tool}`).join('\n')}
        . If you are note sure, then it is not approved.`,
      },
      {
        role: 'user',
        content: userMessage,
      },
    ],
  });

  console.log(response.choices[0].message.parsed);

  return response.choices[0].message.parsed?.approved;
};
