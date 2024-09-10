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
      setInputJson("");
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
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-8">
          <h1 className="text-3xl font-bold text-gray-700 mb-6">JQNL</h1>
          <fetcher.Form
            method="post"
            encType="multipart/form-data"
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            <div>
              <label
                htmlFor="jsonFile"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                JSON File
              </label>
              <div className="mt-1 flex items-center">
                <input
                  type="file"
                  id="jsonFile"
                  name="jsonFile"
                  accept=".json"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Choose File
                </button>
                <span className="ml-3 text-sm text-gray-500">
                  {fileName || "No file chosen"}
                </span>
              </div>
            </div>
            <div className="relative">
              <div
                aria-hidden="true"
                className="absolute inset-0 flex items-center"
              >
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-2 text-sm text-gray-500">Or</span>
              </div>
            </div>
            <div>
              <label
                htmlFor="inputJson"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                JSON Input
              </label>
              <textarea
                id="inputJson"
                name="inputJson"
                value={inputJson}
                onChange={(e) => {
                  setInputJson(e.target.value);
                  setFileName("");
                }}
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 h-40"
                placeholder="Paste your JSON here"
              />
            </div>
            <div>
              <label
                htmlFor="query"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Query
              </label>
              <input
                type="text"
                id="query"
                name="query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                placeholder="Enter your query here E.x - find all unique path values"
              />
            </div>
            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Submit
              </button>
            </div>
          </fetcher.Form>
          {fetcher.data && "error" in fetcher.data && (
            <div className="mt-8 bg-red-50 border-l-4 border-red-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{fetcher.data.error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          {fetcher.data && "result" in fetcher.data && (
            <div className="mt-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Output</h2>
              <pre className="bg-gray-50 p-4 rounded-md overflow-x-auto text-sm text-gray-900">
                {JSON.stringify(fetcher.data.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
