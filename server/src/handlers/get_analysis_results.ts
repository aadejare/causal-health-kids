
import { db } from '../db';
import { analysesTable } from '../db/schema';
import { type GetAnalysisResultsInput, type Analysis } from '../schema';
import { eq } from 'drizzle-orm';

export const getAnalysisResults = async (input: GetAnalysisResultsInput): Promise<Analysis> => {
  try {
    // Query for the analysis by ID
    const results = await db.select()
      .from(analysesTable)
      .where(eq(analysesTable.id, input.analysis_id))
      .execute();

    if (results.length === 0) {
      throw new Error(`Analysis with ID ${input.analysis_id} not found`);
    }

    const analysis = results[0];

    // Return the analysis - no numeric conversions needed for this schema
    return {
      id: analysis.id,
      dataset_id: analysis.dataset_id,
      name: analysis.name,
      target_variable: analysis.target_variable,
      treatment_variables: analysis.treatment_variables,
      control_variables: analysis.control_variables,
      method: analysis.method,
      status: analysis.status,
      results: analysis.results,
      simple_explanation: analysis.simple_explanation,
      created_at: analysis.created_at,
      completed_at: analysis.completed_at
    };
  } catch (error) {
    console.error('Failed to get analysis results:', error);
    throw error;
  }
};
