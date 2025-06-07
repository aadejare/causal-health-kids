
import { serial, text, pgTable, timestamp, integer, json, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const datasetStatusEnum = pgEnum('dataset_status', ['uploading', 'processing', 'ready', 'error']);
export const analysisStatusEnum = pgEnum('analysis_status', ['pending', 'running', 'completed', 'failed']);
export const analysisMethodEnum = pgEnum('analysis_method', ['doubleml', 'causalml', 'econml', 'pywhy']);
export const columnDataTypeEnum = pgEnum('column_data_type', ['numeric', 'categorical', 'boolean', 'datetime', 'text']);

// Tables
export const datasetsTable = pgTable('datasets', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  file_path: text('file_path').notNull(),
  file_size: integer('file_size').notNull(),
  columns_count: integer('columns_count').notNull(),
  rows_count: integer('rows_count').notNull(),
  status: datasetStatusEnum('status').notNull().default('uploading'),
  sample_rows: json('sample_rows').$type<string[][]>(),
  uploaded_at: timestamp('uploaded_at').defaultNow().notNull(),
  processed_at: timestamp('processed_at')
});

export const analysesTable = pgTable('analyses', {
  id: serial('id').primaryKey(),
  dataset_id: integer('dataset_id').notNull().references(() => datasetsTable.id),
  name: text('name').notNull(),
  target_variable: text('target_variable').notNull(),
  treatment_variables: json('treatment_variables').notNull().$type<string[]>(),
  control_variables: json('control_variables').notNull().$type<string[]>(),
  method: analysisMethodEnum('method').notNull(),
  status: analysisStatusEnum('status').notNull().default('pending'),
  results: json('results').$type<Record<string, unknown>>(),
  simple_explanation: text('simple_explanation'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  completed_at: timestamp('completed_at')
});

export const columnInfoTable = pgTable('column_info', {
  id: serial('id').primaryKey(),
  dataset_id: integer('dataset_id').notNull().references(() => datasetsTable.id),
  column_name: text('column_name').notNull(),
  data_type: columnDataTypeEnum('data_type').notNull(),
  null_count: integer('null_count').notNull(),
  unique_count: integer('unique_count').notNull(),
  sample_values: json('sample_values').$type<string[]>(),
  is_potential_target: boolean('is_potential_target').notNull().default(false),
  is_potential_treatment: boolean('is_potential_treatment').notNull().default(false)
});

// Relations
export const datasetsRelations = relations(datasetsTable, ({ many }) => ({
  analyses: many(analysesTable),
  columnInfo: many(columnInfoTable)
}));

export const analysesRelations = relations(analysesTable, ({ one }) => ({
  dataset: one(datasetsTable, {
    fields: [analysesTable.dataset_id],
    references: [datasetsTable.id]
  })
}));

export const columnInfoRelations = relations(columnInfoTable, ({ one }) => ({
  dataset: one(datasetsTable, {
    fields: [columnInfoTable.dataset_id],
    references: [datasetsTable.id]
  })
}));

// TypeScript types
export type Dataset = typeof datasetsTable.$inferSelect;
export type NewDataset = typeof datasetsTable.$inferInsert;
export type Analysis = typeof analysesTable.$inferSelect;
export type NewAnalysis = typeof analysesTable.$inferInsert;
export type ColumnInfo = typeof columnInfoTable.$inferSelect;
export type NewColumnInfo = typeof columnInfoTable.$inferInsert;

// Export all tables for proper query building
export const tables = {
  datasets: datasetsTable,
  analyses: analysesTable,
  columnInfo: columnInfoTable
};
