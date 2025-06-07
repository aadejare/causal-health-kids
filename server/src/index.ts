
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

import { 
  uploadDatasetInputSchema,
  listDatasetsInputSchema,
  getDatasetInputSchema,
  createAnalysisInputSchema,
  listAnalysesInputSchema,
  getAnalysisResultsInputSchema
} from './schema';

import { uploadDataset } from './handlers/upload_dataset';
import { getDatasets } from './handlers/get_datasets';
import { getDataset } from './handlers/get_dataset';
import { createAnalysis } from './handlers/create_analysis';
import { getAnalyses } from './handlers/get_analyses';
import { getAnalysisResults } from './handlers/get_analysis_results';
import { processDataset } from './handlers/process_dataset';
import { runCausalAnalysis } from './handlers/run_causal_analysis';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),
  
  // Dataset operations
  uploadDataset: publicProcedure
    .input(uploadDatasetInputSchema)
    .mutation(({ input }) => uploadDataset(input)),
    
  getDatasets: publicProcedure
    .input(listDatasetsInputSchema.optional())
    .query(({ input }) => getDatasets(input)),
    
  getDataset: publicProcedure
    .input(getDatasetInputSchema)
    .query(({ input }) => getDataset(input)),
    
  processDataset: publicProcedure
    .input(getDatasetInputSchema)
    .mutation(({ input }) => processDataset(input.dataset_id)),
  
  // Analysis operations
  createAnalysis: publicProcedure
    .input(createAnalysisInputSchema)
    .mutation(({ input }) => createAnalysis(input)),
    
  getAnalyses: publicProcedure
    .input(listAnalysesInputSchema.optional())
    .query(({ input }) => getAnalyses(input)),
    
  getAnalysisResults: publicProcedure
    .input(getAnalysisResultsInputSchema)
    .query(({ input }) => getAnalysisResults(input)),
    
  runCausalAnalysis: publicProcedure
    .input(getAnalysisResultsInputSchema)
    .mutation(({ input }) => runCausalAnalysis(input.analysis_id)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`Causal ML TRPC server listening at port: ${port}`);
}

start();
