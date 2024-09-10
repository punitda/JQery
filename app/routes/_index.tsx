import { useState } from "react";
import { json, type ActionFunctionArgs } from "@remix-run/node";
import { Anthropic } from "@anthropic-ai/sdk";
import jq from "node-jq";
import { useFetcher } from "@remix-run/react";

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const inputJson = formData.get("inputJson") as string;
  const query = formData.get("query") as string;

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

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

  const jqCommand =
    response.content[0].type == "text"
      ? JSON.parse(response.content[0].text).query
      : null;

  // const jqCommand = ".models | map(.path) | unique";
  console.log("JQ command", jqCommand);
  if (!jqCommand) {
    return json({ error: "No command found in response" }, { status: 500 });
  }

  const result = await jq.run(jqCommand, inputJson, {
    input: "string",
    output: "json",
  });

  console.log("JQ result", result);

  return json({ result }, { status: 200 });
};

export default function Index() {
  const [inputJson, setInputJson] = useState("");
  const [query, setQuery] = useState("");
  const fetcher = useFetcher<typeof action>();

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">JSON Query Tool</h1>
      <fetcher.Form method="post">
        <div className="mb-4">
          <label htmlFor="inputJson" className="block mb-2">
            Input JSON:
          </label>
          <textarea
            id="inputJson"
            name="inputJson"
            value={inputJson}
            onChange={(e) => setInputJson(e.target.value)}
            className="w-full h-40 p-2 border rounded"
          />
        </div>
        <div className="mb-4">
          <label htmlFor="query" className="block mb-2">
            Query:
          </label>
          <input
            type="text"
            id="query"
            name="query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Submit
        </button>
      </fetcher.Form>
      {fetcher.data && "error" in fetcher.data ? (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-2">Error:</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
            {fetcher.data.error}
          </pre>
        </div>
      ) : null}
      {fetcher.data && "result" in fetcher.data ? (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-2">Output:</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
            {JSON.stringify(fetcher.data.result, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
