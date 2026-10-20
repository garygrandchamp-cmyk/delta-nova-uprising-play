// Export delivery only: streamed pieces reconstruct the original exported files byte-for-byte.
(() => {
  const files = {"index.wasm": {"parts": ["index.wasm.part1", "index.wasm.part2"], "bytes": 39514754, "type": "application/wasm", "sha256": "fc74679e3b97f76878947fcd4fbe1268cbfa6188182a2e33bbc3f5dc9bfa57d0"}, "index.pck": {"parts": ["index.pck.part1", "index.pck.part2", "index.pck.part3", "index.pck.part4", "index.pck.part5", "index.pck.part6", "index.pck.part7", "index.pck.part8", "index.pck.part9"], "bytes": 200234868, "type": "application/octet-stream", "sha256": "1dd90fee9701b38ed24e6b50cc60da1dcf3185112219e83a6ad74f569969bc11"}};
  const originalFetch = window.fetch.bind(window);
  const root = new URL('.', document.baseURI);
  window.fetch = async function(input, options) {
    const requestURL = new URL(typeof input === 'string' || input instanceof URL ? input : input.url, document.baseURI);
    const filename = Object.keys(files).find(name => requestURL.href === new URL(name, root).href);
    if (!filename) return originalFetch(input, options);
    const file = files[filename];
    const body = new ReadableStream({
      async start(controller) {
        try {
          for (const name of file.parts) {
            const response = await originalFetch(new URL(name, root), options);
            if (!response.ok) throw new Error(`Could not download ${name}: ${response.status}`);
            const reader = response.body.getReader();
            for (;;) {
              const value = await reader.read();
              if (value.done) break;
              controller.enqueue(value.value);
            }
          }
          controller.close();
        } catch (error) { controller.error(error); }
      }
    });
    return new Response(body, {status:200, headers:{'Content-Type':file.type,'Content-Length':String(file.bytes)}});
  };
})();
