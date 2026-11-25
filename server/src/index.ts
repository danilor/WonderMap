import { createApp } from './app.ts';
import { loadConfig } from './config.ts';
import { MapStorage } from './storage.ts';

const config = loadConfig();
await new MapStorage(config.dataDir).init();

const app = createApp(config);
app.listen(config.port, () => {
  console.log(`WonderMap server listening on http://localhost:${config.port}`);
  console.log(`  maps are stored in ${config.dataDir}`);
  console.log(config.clientDist ? `  serving the built client from ${config.clientDist}` : '  no built client found (run "npm run build" or use the Vite dev server)');
});
