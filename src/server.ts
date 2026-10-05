import { serve } from "@hono/node-server";
import { createApp, createDeps } from "./app.ts";
import { SAMPLE_ITEMS, sampleLoans } from "./data/sample-data.ts";
import { toISODate } from "./lib/date.ts";

const port = Number(process.env.PORT ?? 3000);
const deps = createDeps({
  items: SAMPLE_ITEMS,
  loans: sampleLoans(toISODate(new Date())),
});

serve({ fetch: createApp(deps).fetch, port }, (info) => {
  console.log(`備品貸出 API: http://localhost:${info.port}`);
  console.log("例: curl -H 'Authorization: Bearer u-alice' http://localhost:3000/items");
});
