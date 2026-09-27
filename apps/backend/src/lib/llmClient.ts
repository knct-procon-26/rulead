import OpenAI from "openai";

export const llmClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
