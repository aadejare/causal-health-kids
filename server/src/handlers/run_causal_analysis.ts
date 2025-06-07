
import { db } from '../db';
import { analysesTable, datasetsTable } from '../db/schema';
import { type Analysis } from '../schema';
import { eq } from 'drizzle-orm';

export const runCausalAnalysis = async (analysisId: number): Promise<Analysis> => {
  try {
    // Get the analysis record
    const analysisResults = await db.select()
      .from(analysesTable)
      .where(eq(analysesTable.id, analysisId))
      .execute();

    if (analysisResults.length === 0) {
      throw new Error(`Analysis with id ${analysisId} not found`);
    }

    const analysis = analysisResults[0];

    // Check if analysis is already completed or running
    if (analysis.status === 'completed') {
      return analysis;
    }

    if (analysis.status === 'running') {
      throw new Error('Analysis is already running');
    }

    // Verify the dataset exists and is ready
    const datasetResults = await db.select()
      .from(datasetsTable)
      .where(eq(datasetsTable.id, analysis.dataset_id))
      .execute();

    if (datasetResults.length === 0 || datasetResults[0].status !== 'ready') {
      throw new Error('Dataset not found or not ready for analysis');
    }

    // Update status to running
    await db.update(analysesTable)
      .set({ status: 'running' })
      .where(eq(analysesTable.id, analysisId))
      .execute();

    // Simulate causal analysis execution
    // In a real implementation, this would call Python/R scripts or ML libraries
    const mockResults = {
      treatment_effect: 0.15,
      confidence_interval: [0.08, 0.22],
      p_value: 0.003,
      standard_error: 0.035,
      method_details: {
        model_type: analysis.method,
        n_observations: 1000,
        convergence: true
      }
    };

    const simpleExplanation = `The analysis found that ${analysis.treatment_variables.join(' and ')} has a positive causal effect of approximately 15% on ${analysis.target_variable}. This result is statistically significant (p < 0.01) with a 95% confidence interval of [8%, 22%].`;

    // Update analysis with results
    const updatedResults = await db.update(analysesTable)
      .set({
        status: 'completed',
        results: mockResults,
        simple_explanation: simpleExplanation,
        completed_at: new Date()
      })
      .where(eq(analysesTable.id, analysisId))
      .returning()
      .execute();

    return updatedResults[0];
  } catch (error) {
    // Update status to failed on error
    await db.update(analysesTable)
      .set({ status: 'failed' })
      .where(eq(analysesTable.id, analysisId))
      .execute();

    console.error('Causal analysis failed:', error);
    throw error;
  }
};
