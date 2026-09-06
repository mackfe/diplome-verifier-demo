import {ai} from '@/ai/genkit';

/**
 * A deterministic wrapper for Genkit's generate function that forces JSON output.
 * It uses a fixed temperature, top_p, and seed to ensure consistent outputs for the same input.
 *
 * @param system The system prompt.
 * @param user The user prompt, which can include media placeholders.
 * @param options Configuration options like seed and maxTokens.
 * @returns A promise that resolves to the parsed JSON object of type T.
 */
export async function callJSON<T>(
  system: string,
  user: string,
  {
    seed = 42,
    maxTokens = 400,
  }: {seed?: number; maxTokens?: number} = {}
): Promise<T> {
  const {output} = await ai.generate({
    model: 'googleai/gemini-2.5-flash',
    system,
    prompt: user,
    temperature: 0,
    top_p: 1,
    config: {
      seed,
      responseMimeType: 'application/json',
      maxOutputTokens: maxTokens,
      stopSequences: ['\n}\n', '\n}\r\n', '\n}\r'], // Optional stop sequences
    },
  });

  if (typeof output !== 'object' || output === null) {
    throw new Error('Model did not return a valid JSON object.');
  }

  return output as T;
}
