import type { AppLoadContext, EntryContext } from "react-router";
import { ServerRouter } from "react-router";
import { isbot } from "isbot";
import { renderToReadableStream } from "react-dom/server";
import { StrictMode } from "react";

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
  loadContext: AppLoadContext
) {
  const body = await renderToReadableStream(
    <StrictMode>
      <ServerRouter context={routerContext} url={request.url} />
    </StrictMode>,
    {
      signal: request.signal,
      onError(error: unknown) {
        console.error(error);
        responseStatusCode = 500;
      },
    }
  );

  if (isbot(request.headers.get("user-agent") || "")) {
    await body.allReady;
  }

  // Create full HTML document
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FlowPig - Notion × Linear Mashup</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🐷</text></svg>">
</head>
<body>
  <div id="root">`;

  const htmlEnd = `</div>
</body>
</html>`;

  const encoder = new TextEncoder();
  const htmlStartBytes = encoder.encode(html);
  const htmlEndBytes = encoder.encode(htmlEnd);

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(htmlStartBytes);
      const reader = body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        controller.enqueue(value);
      }
      controller.enqueue(htmlEndBytes);
      controller.close();
    },
  });

  responseHeaders.set("Content-Type", "text/html");
  return new Response(stream, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}
