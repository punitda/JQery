import { useState, useRef } from "react";
import { json, type ActionFunctionArgs } from "@remix-run/node";
import { useFetcher } from "@remix-run/react";
import { generateJqCommand } from "../utils/anthropic.server";
import jq from "node-jq";

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const query = formData.get("query") as string;

  // Check if query is missing or empty
  if (!query || query.trim() === "") {
    return json({ error: "Please enter a query" }, { status: 400 });
  }

  let inputJson: string;

  const jsonFile = formData.get("jsonFile") as File | null;
  const jsonInput = formData.get("inputJson") as string;

  if (jsonFile && jsonFile.size > 0) {
    const fileContent = await jsonFile.text();
    try {
      // Validate JSON
      JSON.parse(fileContent);
      inputJson = fileContent;
    } catch (error) {
      return json({ error: "Invalid JSON file" }, { status: 400 });
    }
  } else if (jsonInput) {
    try {
      // Validate JSON
      JSON.parse(jsonInput);
      inputJson = jsonInput;
    } catch (error) {
      return json({ error: "Invalid JSON input" }, { status: 400 });
    }
  } else {
    return json({ error: "No JSON input provided" }, { status: 400 });
  }

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
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fetcher = useFetcher<typeof action>();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setInputJson(""); // Clear text input when file is selected
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (inputJson) {
      formData.set("inputJson", inputJson);
    }
    fetcher.submit(formData, {
      method: "post",
      encType: "multipart/form-data",
    });
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">JSON Query Tool</h1>
      <fetcher.Form
        method="post"
        encType="multipart/form-data"
        onSubmit={handleSubmit}
      >
        <div className="mb-4">
          <label htmlFor="jsonFile" className="block mb-2">
            Upload JSON File:
          </label>
          <input
            type="file"
            id="jsonFile"
            name="jsonFile"
            accept=".json"
            onChange={handleFileChange}
            ref={fileInputRef}
            className="hidden"
          />
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded mr-2"
            >
              Choose File
            </button>
            <span>{fileName || "No file chosen"}</span>
          </div>
        </div>
        <div className="mb-4">
          <label htmlFor="inputJson" className="block mb-2">
            Or Input JSON:
          </label>
          <textarea
            id="inputJson"
            name="inputJson"
            value={inputJson}
            onChange={(e) => {
              setInputJson(e.target.value);
              setFileName(""); // Clear file name when text input is used
            }}
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
            placeholder="Find list of unique path values"
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
