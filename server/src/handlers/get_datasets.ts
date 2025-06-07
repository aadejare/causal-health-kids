
import { db } from '../db';
import { datasetsTable } from '../db/schema';
import { type ListDatasetsInput, type Dataset } from '../schema';
import { desc } from 'drizzle-orm';

export const getDatasets = async (input?: ListDatasetsInput): Promise<Dataset[]> => {
  try {
    // Set default values for pagination
    const limit = input?.limit || 50;
    const offset = input?.offset || 0;

    // Build query with ordering and pagination
    const results = await db.select()
      .from(datasetsTable)
      .orderBy(desc(datasetsTable.uploaded_at))
      .limit(limit)
      .offset(offset)
      .execute();

    // Return results (no numeric conversions needed for this table)
    return results;
  } catch (error) {
    console.error('Get datasets failed:', error);
    throw error;
  }
};
