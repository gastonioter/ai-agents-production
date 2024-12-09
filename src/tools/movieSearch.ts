import type { ToolFn } from '../../types';
import { z } from 'zod';
import { queryMovies } from '../rag/query';

export const movieSearchToolDefinition = {
  name: 'search_movies',
  description:
    'use this tool to find movies or answer questions about movies and thier metadata like score, rating, costs, director, actors and more.',
  parameters: z.object({
    reasoning: z.string(),
    query: z.string().describe('query used to vector search on movies'),
    topK: z.number().optional(),
    filters: z.object({}).optional(),
  }),
};

type Args = z.infer<typeof movieSearchToolDefinition.parameters>;

export const searchMovies: ToolFn<Args, string> = async ({
  userMessage,
  toolArgs,
}) => {
  let movies;
  try {
    movies = await queryMovies({ query: toolArgs.query });
  } catch (e) {
    console.error(e);
    return 'An error occured while searching for';
  }

  const formattedMovies = movies.map((movie) => {
    const { metadata, data } = movie;
    return {
      ...metadata,
      description: data,
    };
  });

  return JSON.stringify(formattedMovies, null, 2);
};
