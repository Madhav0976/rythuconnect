import http from 'http';
import app from '../app';

async function testHealthEndpoint() {
  console.log('[Test] Starting server on ephemeral port for health test...');
  const server = app.listen(0, () => {
    const address = server.address();
    if (!address || typeof address === 'string') {
      console.error('[Test] Invalid server address');
      process.exit(1);
    }
    const port = address.port;
    console.log(`[Test] Server listening on port ${port}`);

    const req = http.get(`http://127.0.0.1:${port}/api/health`, (res) => {
      let rawData = '';
      res.on('data', (chunk) => {
        rawData += chunk;
      });
      res.on('end', () => {
        try {
          console.log(`[Test] Received status code: ${res.statusCode}`);
          if (res.statusCode !== 200) {
            throw new Error(`Expected status 200, got ${res.statusCode}`);
          }
          const parsed = JSON.parse(rawData);
          console.log('[Test] Response body:', parsed);
          if (parsed.success !== true || parsed.message !== 'RythuConnect API is healthy') {
            throw new Error(`Unexpected payload: ${rawData}`);
          }
          console.log('[Test] Health check endpoint passed successfully.');
          server.close(() => process.exit(0));
        } catch (e: any) {
          console.error('[Test] Test assertion failed:', e.message);
          server.close(() => process.exit(1));
        }
      });
    });

    req.on('error', (err) => {
      console.error('[Test] Request failed:', err.message);
      server.close(() => process.exit(1));
    });
  });
}

testHealthEndpoint().catch((err) => {
  console.error('[Test] Unhandled error:', err);
  process.exit(1);
});
