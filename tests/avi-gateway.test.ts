import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { OpenAIAdapter } from "../src/infrastructure/ai/adapters/openai.adapter";

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("OpenRouter forwards tool definitions/results with deny collection and returns calls", async () => {
  globalThis.fetch = async (url, init) => {
    assert.equal(url, "https://openrouter.ai/api/v1/chat/completions");
    const body = JSON.parse(String(init?.body));
    assert.equal(body.provider.data_collection, "deny");
    assert.equal(body.tool_choice, "auto");
    assert.equal(body.tools[0].function.name, "catalog");
    assert.deepEqual(body.messages[1], {
      role: "tool",
      content: "{}",
      tool_call_id: "prior",
    });
    return Response.json({
      id: "r1",
      choices: [
        {
          message: {
            content: null,
            tool_calls: [
              {
                id: "call1",
                type: "function",
                function: { name: "catalog", arguments: "{}" },
              },
            ],
          },
          finish_reason: "tool_calls",
        },
      ],
      usage: { prompt_tokens: 9, completion_tokens: 2, total_tokens: 11 },
    });
  };
  const adapter = new OpenAIAdapter(
    "https://openrouter.ai/api/v1",
    "openrouter",
  );
  const result = await adapter.generateText(
    {
      model: "test",
      messages: [
        { role: "user", content: "price" },
        { role: "tool", content: "{}", tool_call_id: "prior" },
      ],
      tools: [
        {
          type: "function",
          function: { name: "catalog", parameters: { type: "object" } },
        },
      ],
    },
    "fake-test-key",
  );
  assert.equal(result.toolCalls?.[0].function.name, "catalog");
  assert.equal(result.usage.totalTokens, 11);
});

test("SSE preserves tool-call deltas including partial arguments", async () => {
  const encoder = new TextEncoder();
  const frames = [
    {
      id: "r2",
      choices: [
        {
          delta: {
            tool_calls: [
              {
                index: 0,
                id: "call2",
                type: "function",
                function: { name: "catalog", arguments: '{"q":' },
              },
            ],
          },
        },
      ],
    },
    {
      id: "r2",
      choices: [
        {
          delta: {
            tool_calls: [{ index: 0, function: { arguments: '"tile"}' } }],
          },
          finish_reason: "tool_calls",
        },
      ],
    },
  ];
  globalThis.fetch = async () =>
    new Response(
      new ReadableStream({
        start(controller) {
          for (const frame of frames)
            controller.enqueue(
              encoder.encode("data: " + JSON.stringify(frame) + "\n\n"),
            );
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      }),
    );
  const adapter = new OpenAIAdapter();
  const chunks = [];
  for await (const chunk of adapter.streamText(
    { messages: [{ role: "user", content: "find" }] },
    "fake-test-key",
  ))
    chunks.push(chunk);
  assert.equal(chunks[0].toolCallDeltas?.[0].id, "call2");
  assert.equal(chunks[1].finishReason, "tool_calls");
  assert.ok(chunks[1].toolCallDeltas?.[0].function?.arguments);
  assert.equal(chunks.at(-1)?.isFinished, true);
});
