import { useState } from "react";
import { json, type ActionFunctionArgs } from "@remix-run/node";
import jq from "node-jq";
import { useFetcher } from "@remix-run/react";
import { generateJqCommand } from "../utils/anthropic.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const inputJson = formData.get("inputJson") as string;
  const query = formData.get("query") as string;

  const jqCommand = await generateJqCommand(inputJson, query);

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
