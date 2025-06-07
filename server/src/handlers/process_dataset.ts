
import { db } from '../db';
import { datasetsTable, columnInfoTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type Dataset } from '../schema';
import * as fs from 'fs';
import * as path from 'path';

export const processDataset = async (datasetId: number): Promise<Dataset> => {
  try {
    // Find the dataset
    const datasets = await db.select()
      .from(datasetsTable)
      .where(eq(datasetsTable.id, datasetId))
      .execute();

    if (datasets.length === 0) {
      throw new Error(`Dataset with id ${datasetId} not found`);
    }

    const dataset = datasets[0];

    // Check if dataset is in a processable state
    if (dataset.status !== 'uploading' && dataset.status !== 'error') {
      throw new Error(`Dataset ${datasetId} is not in a processable state. Current status: ${dataset.status}`);
    }

    // Update status to processing
    await db.update(datasetsTable)
      .set({ status: 'processing' })
      .where(eq(datasetsTable.id, datasetId))
      .execute();

    // Simulate processing by reading the file and analyzing columns
    let columnsCount = 0;
    let rowsCount = 0;
    let sampleRows: string[][] | null = null;
    const columnInfos: Array<{
      column_name: string;
      data_type: 'numeric' | 'categorical' | 'boolean' | 'datetime' | 'text';
      null_count: number;
      unique_count: number;
      sample_values: string[] | null;
      is_potential_target: boolean;
      is_potential_treatment: boolean;
    }> = [];

    try {
      // Check if file exists
      if (fs.existsSync(dataset.file_path)) {
        const fileContent = fs.readFileSync(dataset.file_path, 'utf-8');
        const lines = fileContent.trim().split('\n');
        
        if (lines.length > 0) {
          // Parse CSV header
          const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
          columnsCount = headers.length;
          rowsCount = Math.max(0, lines.length - 1); // Subtract header row

          // Extract first 5 data rows (excluding header) for sample_rows
          const dataLines = lines.slice(1, Math.min(6, lines.length));
          if (dataLines.length > 0) {
            sampleRows = dataLines.map(line => 
              line.split(',').map(cell => cell.trim().replace(/"/g, ''))
            );
          }

          // Generate column info for each column
          headers.forEach((columnName, index) => {
            // Sample some values from this column (excluding header)
            const columnValues = lines.slice(1, Math.min(6, lines.length))
              .map(line => {
                const values = line.split(',');
                return values[index] ? values[index].trim().replace(/"/g, '') : '';
              })
              .filter(v => v !== '');

            // Determine data type based on sample values
            let dataType: 'numeric' | 'categorical' | 'boolean' | 'datetime' | 'text' = 'text';
            let isPotentialTarget = false;
            let isPotentialTreatment = false;

            if (columnValues.length > 0) {
              // Check if numeric
              const numericValues = columnValues.filter(v => !isNaN(parseFloat(v)) && isFinite(parseFloat(v)));
              if (numericValues.length === columnValues.length) {
                dataType = 'numeric';
                isPotentialTarget = true; // Numeric columns can be targets
              }
              
              // Check if boolean
              const booleanValues = columnValues.filter(v => 
                ['true', 'false', '1', '0', 'yes', 'no'].includes(v.toLowerCase())
              );
              if (booleanValues.length === columnValues.length) {
                dataType = 'boolean';
                isPotentialTreatment = true; // Boolean columns can be treatments
              }
              
              // Check if categorical (limited unique values)
              const uniqueValues = [...new Set(columnValues)];
              if (uniqueValues.length <= 10 && uniqueValues.length < columnValues.length) {
                if (dataType === 'text') {
                  dataType = 'categorical';
                  isPotentialTreatment = true; // Categorical columns can be treatments
                }
              }
            }

            columnInfos.push({
              column_name: columnName,
              data_type: dataType,
              null_count: Math.floor(Math.random() * Math.max(1, rowsCount * 0.1)), // Simulate null count
              unique_count: Math.min(rowsCount, Math.max(1, Math.floor(Math.random() * rowsCount * 0.8))),
              sample_values: columnValues.length > 0 ? columnValues.slice(0, 3) : null,
              is_potential_target: isPotentialTarget,
              is_potential_treatment: isPotentialTreatment
            });
          });
        }
      }
    } catch (fileError) {
      console.error('Error processing file:', fileError);
      // Continue with default values if file processing fails
    }

    // Insert column info records
    if (columnInfos.length > 0) {
      await db.insert(columnInfoTable)
        .values(columnInfos.map(info => ({
          dataset_id: datasetId,
          ...info
        })))
        .execute();
    }

    // Update dataset with processing results
    const updateResult = await db.update(datasetsTable)
      .set({
        columns_count: columnsCount || dataset.columns_count,
        rows_count: rowsCount || dataset.rows_count,
        sample_rows: sampleRows,
        status: 'ready',
        processed_at: new Date()
      })
      .where(eq(datasetsTable.id, datasetId))
      .returning()
      .execute();

    return updateResult[0];
  } catch (error) {
    // Update status to error if processing fails
    try {
      await db.update(datasetsTable)
        .set({ status: 'error' })
        .where(eq(datasetsTable.id, datasetId))
        .execute();
    } catch (updateError) {
      console.error('Failed to update dataset status to error:', updateError);
    }

    console.error('Dataset processing failed:', error);
    throw error;
  }
};
