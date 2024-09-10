import { Anthropic } from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function generateJqCommand(
  inputJson: string,
  query: string
): Promise<string | null> {
  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20240620",
    max_tokens: 1024,
    system:
      "You are a perfect jq engineer designed to validate and extract data from JSON files using jq. Only reply with code. Do NOT use any natural language. Do NOT use markdown i.e. ```",
    messages: [
      {
        role: "user",
        content: `
Your task is to generate a jq command to extract the data from the following JSON:
${inputJson}

Your task is to help create a jq query which lets me ${query} from the above JSON

Only reply with json. No need to provide any explanation. The output json format should be:
{"query": <jq command to get the result>}
`,
      },
    ],
    stream: false,
  });

  console.log("Anthropic response", response);

  return response.content[0].type === "text"
    ? JSON.parse(response.content[0].text).query
    : null;
}
