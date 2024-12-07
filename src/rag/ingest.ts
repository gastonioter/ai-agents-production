import 'dotenv/config';
import { Index as UpstashIndex } from '@upstash/vector';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';
import ora from 'ora';

// Initialize Upstash Vector client.
// Here we are using the REST API client to connect to the
// previous created Index in the Upstash console. (i could use the API also)
// The URL and Token are stored in the .env file.
const index = new UpstashIndex({
  url: process.env.UPSTASH_VECTOR_REST_URL as string,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN as string,
});

// Function to index IMDB movie data
export async function indexMovieData() {
  const spinner = ora('Reading movie data...').start();

  // Read and parse CSV file
  const csvPath = path.join(process.cwd(), 'src/rag/imdb_movie_dataset.csv');
  console.log(csvPath);
  const csvData = fs.readFileSync(csvPath, 'utf-8'); // we could use a stream for large files
  const records = parse(csvData, {
    columns: true,
    skip_empty_lines: true,
  });

  console.log(records[0]);

  spinner.text = 'Starting movie indexing...';

  // Index each movie
  for (const movie of records) {
    spinner.text = `Indexing movie: ${movie.Title}`;

    // extract the most important information from the movie
    const text = `${movie.Title}. ${movie.Genre}. ${movie.Description}`;

    // In this case, thankfully, the tokens to be embedded are not a lot.

    // Otherwise, if they were thousands of tokens, we would need to chunk them (break that out).

    // In that case, each chunk would be a separate request to the Upstash Vector API to upsert .

    // What you need to thkink about is: What your users are going to search for?
    // the response is what you need to index,

    try {
      await index.upsert({
        id: movie.Title, // Using Rank as unique ID
        data: text, // Text will be automatically embedded (converted to a vector)
        metadata: {
          // i could do filtering based on this for example
          title: movie.Title,
          year: Number(movie.Year),
          genre: movie.Genre,
          director: movie.Director,
          actors: movie.Actors,
          rating: Number(movie.Rating),
          votes: Number(movie.Votes),
          revenue: movie.Revenue,
          metascore: Number(movie.Metascore),
        },
      });
    } catch (error) {
      spinner.fail(`Error indexing movie ${movie.Title}`);
      console.error(error);
    }
  }

  spinner.succeed('Finished indexing movie data');
}
indexMovieData();
