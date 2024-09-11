import { useState, useRef, useCallback } from "react";
import { json, type ActionFunctionArgs } from "@remix-run/node";
import { useFetcher } from "@remix-run/react";
import { generateJqCommand } from "../utils/anthropic.server";
import jq from "node-jq";
import { truncateJSON } from "../utils/util";

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const query = formData.get("query") as string;

  // Check if query is missing or empty
  if (!query || query.trim() === "") {
    return json({ error: "Please enter a query" }, { status: 400 });
  }

  let inputJson: any;
  let input: string;

  const jsonFile = formData.get("jsonFile") as File | null;
  const jsonInput = formData.get("inputJson") as string;

  if (jsonFile && jsonFile.size > 0) {
    const fileContent = await jsonFile.text();
    try {
      input = fileContent;
      inputJson = JSON.parse(fileContent);
    } catch (error) {
      return json({ error: "Invalid JSON file" }, { status: 400 });
    }
  } else if (jsonInput) {
    try {
      input = jsonInput;
      inputJson = JSON.parse(jsonInput);
    } catch (error) {
      return json({ error: "Invalid JSON input" }, { status: 400 });
    }
  } else {
    return json({ error: "No JSON input provided" }, { status: 400 });
  }

  // We truncate the input JSON to avoid larger window context for Anthropic messages
  // Saves $$$ and speeds up response times
  const truncatedInputJson = truncateJSON(inputJson, 2);
  const jqCommand = await generateJqCommand(
    JSON.stringify(truncatedInputJson),
    query
  );

  if (!jqCommand) {
    return json({ error: "No command found in response" }, { status: 500 });
  }

  const result = await jq.run(jqCommand, input, {
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

  const isSubmitting = fetcher.state === "submitting";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setInputJson("");
    }
  };

  const [copySuccess, setCopySuccess] = useState(false);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      },
      (err) => {
        console.error("Could not copy text: ", err);
      }
    );
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-8">
          <h1 className="text-3xl font-bold text-gray-700 mb-6">JQNL</h1>
          <fetcher.Form
            method="post"
            encType="multipart/form-data"
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
                disabled={isSubmitting}
                className={`w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                  isSubmitting
                    ? "bg-indigo-400 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  "Submit"
                )}
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
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-900">Output</h2>
                <button
                  onClick={() => {
                    if (fetcher.data && "result" in fetcher.data) {
                      copyToClipboard(
                        JSON.stringify(fetcher.data.result, null, 2)
                      );
                    }
                  }}
                  className="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {copySuccess ? "Copied!" : "Copy"}
                </button>
              </div>
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
