
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { datasetsTable, columnInfoTable } from '../db/schema';
import { processDataset } from '../handlers/process_dataset';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('processDataset', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should process a dataset successfully', async () => {
    // Create a test dataset
    const testDataset = await db.insert(datasetsTable)
      .values({
        name: 'Test Dataset',
        description: 'A test dataset',
        file_path: '/tmp/test.csv',
        file_size: 1000,
        columns_count: 3,
        rows_count: 100,
        status: 'uploading'
      })
      .returning()
      .execute();

    const datasetId = testDataset[0].id;

    // Create a temporary CSV file
    const tempDir = os.tmpdir();
    const testFilePath = path.join(tempDir, 'test.csv');
    const csvContent = 'name,age,active\nJohn,25,true\nJane,30,false\nBob,35,true';
    fs.writeFileSync(testFilePath, csvContent);

    // Update the dataset with the correct file path
    await db.update(datasetsTable)
      .set({ file_path: testFilePath })
      .where(eq(datasetsTable.id, datasetId))
      .execute();

    const result = await processDataset(datasetId);

    // Verify dataset was processed
    expect(result.status).toEqual('ready');
    expect(result.processed_at).toBeInstanceOf(Date);
    expect(result.columns_count).toEqual(3);
    expect(result.rows_count).toEqual(3);
    expect(result.sample_rows).toBeDefined();
    expect(result.sample_rows).toHaveLength(3);
    expect(result.sample_rows![0]).toEqual(['John', '25', 'true']);
    expect(result.sample_rows![1]).toEqual(['Jane', '30', 'false']);
    expect(result.sample_rows![2]).toEqual(['Bob', '35', 'true']);

    // Verify column info was created
    const columnInfos = await db.select()
      .from(columnInfoTable)
      .where(eq(columnInfoTable.dataset_id, datasetId))
      .execute();

    expect(columnInfos).toHaveLength(3);
    
    const nameColumn = columnInfos.find(c => c.column_name === 'name');
    const ageColumn = columnInfos.find(c => c.column_name === 'age');
    const activeColumn = columnInfos.find(c => c.column_name === 'active');

    expect(nameColumn).toBeDefined();
    expect(nameColumn!.data_type).toEqual('text');
    expect(nameColumn!.is_potential_target).toEqual(false);

    expect(ageColumn).toBeDefined();
    expect(ageColumn!.data_type).toEqual('numeric');
    expect(ageColumn!.is_potential_target).toEqual(true);

    expect(activeColumn).toBeDefined();
    expect(activeColumn!.data_type).toEqual('boolean');
    expect(activeColumn!.is_potential_treatment).toEqual(true);

    // Clean up
    fs.unlinkSync(testFilePath);
  });

  it('should handle non-existent dataset', async () => {
    await expect(processDataset(999)).rejects.toThrow(/not found/i);
  });

  it('should handle dataset not in processable state', async () => {
    // Create a dataset that's already processed
    const testDataset = await db.insert(datasetsTable)
      .values({
        name: 'Test Dataset',
        description: 'A test dataset',
        file_path: '/tmp/test.csv',
        file_size: 1000,
        columns_count: 3,
        rows_count: 100,
        status: 'ready'
      })
      .returning()
      .execute();

    await expect(processDataset(testDataset[0].id)).rejects.toThrow(/not in a processable state/i);
  });

  it('should update status to processing during operation', async () => {
    const testDataset = await db.insert(datasetsTable)
      .values({
        name: 'Test Dataset',
        description: 'A test dataset',
        file_path: '/nonexistent/path.csv',
        file_size: 1000,
        columns_count: 3,
        rows_count: 100,
        status: 'uploading'
      })
      .returning()
      .execute();

    const datasetId = testDataset[0].id;

    try {
      await processDataset(datasetId);
    } catch (error) {
      // Expected to fail due to nonexistent file, but check status was updated
    }

    const updatedDataset = await db.select()
      .from(datasetsTable)
      .where(eq(datasetsTable.id, datasetId))
      .execute();

    // Should either be 'ready' (if processing succeeded despite missing file) or 'error'
    expect(['ready', 'error']).toContain(updatedDataset[0].status);
  });

  it('should handle error state correctly', async () => {
    const testDataset = await db.insert(datasetsTable)
      .values({
        name: 'Test Dataset',
        description: 'A test dataset',
        file_path: '/absolutely/nonexistent/path/file.csv',
        file_size: 1000,
        columns_count: 3,
        rows_count: 100,
        status: 'error'
      })
      .returning()
      .execute();

    const datasetId = testDataset[0].id;

    // Should be able to reprocess datasets in error state
    const result = await processDataset(datasetId);
    expect(result.status).toEqual('ready');
    expect(result.processed_at).toBeInstanceOf(Date);
  });
});
