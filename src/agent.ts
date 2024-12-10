import { addMessages, getMessages, saveToolResponse } from './memory';
import { runApprovalLLM, runLLM } from './llm';
import { showLoader, logMessage } from './ui';
import { runTool } from './toolRunner';
import type { AIMessage } from '../types';
import { generateImageToolDefinition } from './tools/generateImage';
import { protectedToolsName } from './tools';

export const handleApprovalFlow = async (
  history: AIMessage[],
  userMessage: string
) => {
  const lastMessage = history.at(-1);
  const toolCall = lastMessage?.tool_calls?.[0];

  if (!toolCall || !protectedToolsName.includes(toolCall.function.name)) {
    // we dont need an approval for this tool
    return false;
  }

  /* This is an approval state:
     The last message was a tool call that requires approval
     When we enter here, we pass the approval's user reponse to anoter LLM
  */

  const loader = showLoader('Processing approval... 🤔');
  const approved = await runApprovalLLM(userMessage, protectedToolsName);

  if (approved) {
    loader.update(`Approved! ${toolCall.function.name}`);
    const toolResponse = await runTool(toolCall, userMessage);
    await saveToolResponse(toolCall.id, toolResponse);
    loader.update(`done: ${toolCall.function.name}`);
  } else {
    await saveToolResponse(
      toolCall.id,
      'Nothing went wrong; the user simply did not approve that action at this time'
    );
  }

  loader.stop();
  return true;
};

export const runAgent = async ({
  userMessage,
  tools,
}: {
  userMessage: string;
  tools: any[];
}) => {
  const history = await getMessages();
  const isApproval = await handleApprovalFlow(history, userMessage);

  if (!isApproval) {
    await addMessages([{ role: 'user', content: userMessage }]);
  }

  const loader = showLoader('🤔');

  while (true) {
    const history = await getMessages();
    const response = await runLLM({ messages: history, tools });

    await addMessages([response]);

    if (response.content) {
      loader.stop();
      logMessage(response);
      return getMessages();
    }

    if (response.tool_calls) {
      const toolCall = response.tool_calls[0];
      logMessage(response);

      if (protectedToolsName.includes(toolCall.function.name)) {
        loader.update(`need user approval for: ${toolCall.function.name}`);
        loader.stop();
        return getMessages();
      }

      loader.update(`executing: ${toolCall.function.name}`);
      const toolResponse = await runTool(toolCall, userMessage);
      await saveToolResponse(toolCall.id, toolResponse);
      loader.update(`done: ${toolCall.function.name}`);
    }
  }
};
