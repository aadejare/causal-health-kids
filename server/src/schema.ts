
import { z } from 'zod';

// Dataset schema
export const datasetSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  file_path: z.string(),
  file_size: z.number(),
  columns_count: z.number().int(),
  rows_count: z.number().int(),
  status: z.enum(['uploading', 'processing', 'ready', 'error']),
  uploaded_at: z.coerce.date(),
  processed_at: z.coerce.date().nullable()
});

export type Dataset = z.infer<typeof datasetSchema>;

// Analysis schema
export const analysisSchema = z.object({
  id: z.number(),
  dataset_id: z.number(),
  name: z.string(),
  target_variable: z.string(),
  treatment_variables: z.array(z.string()),
  control_variables: z.array(z.string()),
  method: z.enum(['doubleml', 'causalml', 'econml', 'pywhy']),
  status: z.enum(['pending', 'running', 'completed', 'failed']),
  results: z.record(z.unknown()).nullable(),
  simple_explanation: z.string().nullable(),
  created_at: z.coerce.date(),
  completed_at: z.coerce.date().nullable()
});

export type Analysis = z.infer<typeof analysisSchema>;

// Column info schema for dataset metadata
export const columnInfoSchema = z.object({
  id: z.number(),
  dataset_id: z.number(),
  column_name: z.string(),
  data_type: z.enum(['numeric', 'categorical', 'boolean', 'datetime', 'text']),
  null_count: z.number().int(),
  unique_count: z.number().int(),
  sample_values: z.array(z.string()).nullable(),
  is_potential_target: z.boolean(),
  is_potential_treatment: z.boolean()
});

export type ColumnInfo = z.infer<typeof columnInfoSchema>;

// Input schemas
export const uploadDatasetInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable(),
  file_data: z.string(), // Base64 encoded file data
  file_name: z.string()
});

export type UploadDatasetInput = z.infer<typeof uploadDatasetInputSchema>;

export const createAnalysisInputSchema = z.object({
  dataset_id: z.number(),
  name: z.string().min(1),
  target_variable: z.string(),
  treatment_variables: z.array(z.string()).min(1),
  control_variables: z.array(z.string()),
  method: z.enum(['doubleml', 'causalml', 'econml', 'pywhy'])
});

export type CreateAnalysisInput = z.infer<typeof createAnalysisInputSchema>;

export const getAnalysisResultsInputSchema = z.object({
  analysis_id: z.number()
});

export type GetAnalysisResultsInput = z.infer<typeof getAnalysisResultsInputSchema>;

export const getDatasetInputSchema = z.object({
  dataset_id: z.number()
});

export type GetDatasetInput = z.infer<typeof getDatasetInputSchema>;

export const listDatasetsInputSchema = z.object({
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional()
});

export type ListDatasetsInput = z.infer<typeof listDatasetsInputSchema>;

export const listAnalysesInputSchema = z.object({
  dataset_id: z.number().optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional()
});

export type ListAnalysesInput = z.infer<typeof listAnalysesInputSchema>;
