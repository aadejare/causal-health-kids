
import { db } from '../db';
import { datasetsTable } from '../db/schema';
import { type UploadDatasetInput, type Dataset } from '../schema';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

export const uploadDataset = async (input: UploadDatasetInput): Promise<Dataset> => {
  try {
    // Decode base64 file data
    const fileBuffer = Buffer.from(input.file_data, 'base64');
    
    // Generate unique file path
    const timestamp = Date.now();
    const fileName = `${timestamp}_${input.file_name}`;
    const uploadsDir = 'uploads';
    const filePath = join(uploadsDir, fileName);
    
    // Create uploads directory if it doesn't exist
    if (!existsSync(uploadsDir)) {
      mkdirSync(uploadsDir, { recursive: true });
    }
    
    // Write file to disk (in a real app, you'd use cloud storage)
    writeFileSync(filePath, fileBuffer);
    
    // Parse CSV to get basic metadata (simplified - in real app would use a proper CSV parser)
    const fileContent = fileBuffer.toString('utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim());
    const headers = lines[0] ? lines[0].split(',') : [];
    const rowsCount = Math.max(0, lines.length - 1); // Subtract header row
    const columnsCount = headers.length;
    
    // Insert dataset record
    const result = await db.insert(datasetsTable)
      .values({
        name: input.name,
        description: input.description,
        file_path: filePath,
        file_size: fileBuffer.length,
        columns_count: columnsCount,
        rows_count: rowsCount,
        status: 'uploading'
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Dataset upload failed:', error);
    throw error;
  }
};
