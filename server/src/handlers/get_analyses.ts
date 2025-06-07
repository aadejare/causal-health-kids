
import { db } from '../db';
import { analysesTable } from '../db/schema';
import { type ListAnalysesInput, type Analysis } from '../schema';
import { eq } from 'drizzle-orm';

export const getAnalyses = async (input?: ListAnalysesInput): Promise<Analysis[]> => {
  try {
    // Apply pagination with defaults
    const limit = input?.limit ?? 50;
    const offset = input?.offset ?? 0;

    // Build query conditionally
    const results = input?.dataset_id !== undefined
      ? await db.select()
          .from(analysesTable)
          .where(eq(analysesTable.dataset_id, input.dataset_id))
          .limit(limit)
          .offset(offset)
          .execute()
      : await db.select()
          .from(analysesTable)
          .limit(limit)
          .offset(offset)
          .execute();

    // Return results with proper type conversion
    return results.map(analysis => ({
      ...analysis,
      // Ensure dates are Date objects
      created_at: analysis.created_at,
      completed_at: analysis.completed_at
    }));
  } catch (error) {
    console.error('Failed to get analyses:', error);
    throw error;
  }
};
