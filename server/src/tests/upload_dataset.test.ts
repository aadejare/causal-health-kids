
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { datasetsTable } from '../db/schema';
import { type UploadDatasetInput } from '../schema';
import { uploadDataset } from '../handlers/upload_dataset';
import { eq } from 'drizzle-orm';
import { existsSync, unlinkSync, rmSync } from 'fs';
import { join } from 'path';

// Test CSV data
const csvData = 'name,age,city\nJohn,25,NYC\nJane,30,LA\nBob,35,Chicago';
const base64Data = Buffer.from(csvData).toString('base64');

const testInput: UploadDatasetInput = {
  name: 'Test Dataset',
  description: 'A dataset for testing',
  file_data: base64Data,
  file_name: 'test.csv'
};

describe('uploadDataset', () => {
  beforeEach(createDB);
  afterEach(async () => {
    // Clean up any created files and uploads directory
    const datasets = await db.select().from(datasetsTable).execute();
    datasets.forEach(dataset => {
      if (existsSync(dataset.file_path)) {
        unlinkSync(dataset.file_path);
      }
    });
    
    // Clean up uploads directory if it exists
    if (existsSync('uploads')) {
      rmSync('uploads', { recursive: true, force: true });
    }
    
    await resetDB();
  });

  it('should upload a dataset', async () => {
    const result = await uploadDataset(testInput);

    // Basic field validation
    expect(result.name).toEqual('Test Dataset');
    expect(result.description).toEqual('A dataset for testing');
    expect(result.file_path).toMatch(/uploads\/\d+_test\.csv/);
    expect(result.file_size).toEqual(Buffer.from(csvData).length);
    expect(result.columns_count).toEqual(3);
    expect(result.rows_count).toEqual(3);
    expect(result.status).toEqual('uploading');
    expect(result.id).toBeDefined();
    expect(result.uploaded_at).toBeInstanceOf(Date);
    expect(result.processed_at).toBeNull();
  });

  it('should save dataset to database', async () => {
    const result = await uploadDataset(testInput);

    const datasets = await db.select()
      .from(datasetsTable)
      .where(eq(datasetsTable.id, result.id))
      .execute();

    expect(datasets).toHaveLength(1);
    expect(datasets[0].name).toEqual('Test Dataset');
    expect(datasets[0].description).toEqual('A dataset for testing');
    expect(datasets[0].file_path).toMatch(/uploads\/\d+_test\.csv/);
    expect(datasets[0].file_size).toEqual(Buffer.from(csvData).length);
    expect(datasets[0].columns_count).toEqual(3);
    expect(datasets[0].rows_count).toEqual(3);
    expect(datasets[0].status).toEqual('uploading');
    expect(datasets[0].uploaded_at).toBeInstanceOf(Date);
  });

  it('should create physical file', async () => {
    const result = await uploadDataset(testInput);

    // Check file exists
    expect(existsSync(result.file_path)).toBe(true);
    
    // Verify file content matches original
    const fileContent = Bun.file(result.file_path);
    const actualContent = await fileContent.text();
    expect(actualContent).toEqual(csvData);
  });

  it('should handle dataset with null description', async () => {
    const inputWithNullDescription: UploadDatasetInput = {
      ...testInput,
      description: null
    };

    const result = await uploadDataset(inputWithNullDescription);

    expect(result.name).toEqual('Test Dataset');
    expect(result.description).toBeNull();
    expect(result.id).toBeDefined();
  });

  it('should handle empty CSV file', async () => {
    const emptyCSV = '';
    const emptyBase64 = Buffer.from(emptyCSV).toString('base64');
    
    const emptyInput: UploadDatasetInput = {
      name: 'Empty Dataset',
      description: 'Empty test dataset',
      file_data: emptyBase64,
      file_name: 'empty.csv'
    };

    const result = await uploadDataset(emptyInput);

    expect(result.columns_count).toEqual(0);
    expect(result.rows_count).toEqual(0);
    expect(result.file_size).toEqual(0);
  });

  it('should create uploads directory if it does not exist', async () => {
    // Ensure uploads directory doesn't exist
    if (existsSync('uploads')) {
      rmSync('uploads', { recursive: true, force: true });
    }
    
    expect(existsSync('uploads')).toBe(false);
    
    await uploadDataset(testInput);
    
    // Directory should now exist
    expect(existsSync('uploads')).toBe(true);
  });
});
