
import { db } from '../db';
import { analysesTable, datasetsTable } from '../db/schema';
import { type CreateAnalysisInput, type Analysis } from '../schema';
import { eq } from 'drizzle-orm';

export const createAnalysis = async (input: CreateAnalysisInput): Promise<Analysis> => {
  try {
    // Verify dataset exists
    const dataset = await db.select()
      .from(datasetsTable)
      .where(eq(datasetsTable.id, input.dataset_id))
      .execute();

    if (dataset.length === 0) {
      throw new Error(`Dataset with ID ${input.dataset_id} not found`);
    }

    // Insert analysis record
    const result = await db.insert(analysesTable)
      .values({
        dataset_id: input.dataset_id,
        name: input.name,
        target_variable: input.target_variable,
        treatment_variables: input.treatment_variables,
        control_variables: input.control_variables,
        method: input.method
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Analysis creation failed:', error);
    throw error;
  }
};
