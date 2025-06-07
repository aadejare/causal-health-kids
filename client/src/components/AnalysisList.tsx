
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, Brain, Target, Zap, Shield, Play, Eye } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Analysis } from '../../../server/src/schema';

interface AnalysisListProps {
  analyses: Analysis[];
  onAnalysisSelect: (analysis: Analysis) => void;
  selectedAnalysis: Analysis | null;
  onRefresh: () => void;
  getStatusColor: (status: string) => string;
}

export function AnalysisList({ 
  analyses, 
  onAnalysisSelect, 
  selectedAnalysis, 
  onRefresh, 
  getStatusColor 
}: AnalysisListProps) {
  const [runningAnalyses, setRunningAnalyses] = useState<Set<number>>(new Set());

  const handleRunAnalysis = async (analysisId: number) => {
    setRunningAnalyses(prev => new Set(prev).add(analysisId));
    try {
      await trpc.runCausalAnalysis.mutate({ analysis_id: analysisId });
      // Refresh the analyses list after starting
      setTimeout(() => {
        onRefresh();
        setRunningAnalyses(prev => {
          const newSet = new Set(prev);
          newSet.delete(analysisId);
          return newSet;
        });
      }, 1000);
    } catch (error) {
      console.error('Failed to run analysis:', error);
      setRunningAnalyses(prev => {
        const newSet = new Set(prev);
        newSet.delete(analysisId);
        return newSet;
      });
    }
  };

  const getStatusEmoji = (status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'running': return '⚙️';
      case 'pending': return '⏳';
      case 'failed': return '❌';
      default: return '❓';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Discovery Complete';
      case 'running': return 'AI Working...';
      case 'pending': return 'Ready to Run';
      case 'failed': return 'Analysis Failed';
      default: return 'Unknown Status';
    }
  };

  const getMethodEmoji = (method: string) => {
    switch (method) {
      case 'doubleml': return '🎯';
      case 'causalml': return '🔍';
      case 'econml': return '📊';
      case 'pywhy': return '🤔';
      default: return '🔬';
    }
  };

  if (analyses.length === 0) {
    return (
      <div className="text-center py-12">
        <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-600 mb-2">
          🔬 No Analyses Yet
        </h3>
        <p className="text-gray-500 mb-4">
          Create your first causal analysis to start discovering what really works in healthcare!
        </p>
        <Button onClick={onRefresh} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-700">
          🧪 Your Causal Analyses ({analyses.length})
        </h3>
        <Button onClick={onRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4">
        {analyses.map((analysis: Analysis) => {
          const isSelected = selectedAnalysis?.id === analysis.id;
          const isRunning = runningAnalyses.has(analysis.id);
          
          return (
            <Card 
              key={analysis.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                isSelected 
                  ? 'ring-2 ring-purple-500 bg-purple-50 border-purple-200' 
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => onAnalysisSelect(analysis)}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg text-gray-800 mb-2">
                      🧪 {analysis.name}
                    </CardTitle>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <div className="flex items-center gap-1 bg-blue-100 px-2 py-1 rounded">
                        <Target className="h-3 w-3 text-blue-600" />
                        <span className="text-blue-800">Target: {analysis.target_variable}</span>
                      </div>
                      <div className="flex items-center gap-1 bg-green-100 px-2 py-1 rounded">
                        <Zap className="h-3 w-3 text-green-600" />
                        <span className="text-green-800">
                          Treatments: {analysis.treatment_variables.length}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 bg-orange-100 px-2 py-1 rounded">
                        <Shield className="h-3 w-3 text-orange-600" />
                        <span className="text-orange-800">
                          Controls: {analysis.control_variables.length}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge className={`${getStatusColor(analysis.status)} text-white`}>
                      {getStatusEmoji(analysis.status)} {getStatusText(analysis.status)}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {getMethodEmoji(analysis.method)} {analysis.method.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                {/* Progress for running analysis */}
                {(analysis.status === 'running' || isRunning) && (
                  <div className="mb-4 space-y-2">
                    <div className="flex justify-between text-sm text-blue-700">
                      <span>🤖 AI is discovering causal relationships...</span>
                      <span>Working hard!</span>
                    </div>
                    <Progress value={65} className="h-2" />
                    <p className="text-xs text-blue-600">
                      This usually takes 2-5 minutes depending on your data size
                    </p>
                  </div>
                )}

                {/* Treatment and Control Variables */}
                <div className="space-y-2 mb-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-1">💊 Testing Treatments:</p>
                    <div className="flex flex-wrap gap-1">
                      {analysis.treatment_variables.map((variable: string) => (
                        <Badge key={variable} variant="secondary" className="text-xs">
                          {variable}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  {analysis.control_variables.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">🛡️ Controlling for:</p>
                      <div className="flex flex-wrap gap-1">
                        {analysis.control_variables.slice(0, 5).map((variable: string) => (
                          <Badge key={variable} variant="outline" className="text-xs">
                            {variable}
                          </Badge>
                        ))}
                        {analysis.control_variables.length > 5 && (
                          <Badge variant="outline" className="text-xs">
                            +{analysis.control_variables.length - 5} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {analysis.status === 'pending' && (
                    <Button 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRunAnalysis(analysis.id);
                      }}
                      disabled={isRunning}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isRunning ? (
                        <>⚙️ Starting...</>
                      ) : (
                        <>
                          <Play className="h-3 w-3 mr-1" />
                          🚀 Run Analysis
                        </>
                      )}
                    </Button>
                  )}
                  
                  {analysis.status === 'completed' && (
                    <Button 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAnalysisSelect(analysis);
                      }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      👀 View Results
                    </Button>
                  )}
                </div>

                {/* Simple Explanation Preview */}
                {analysis.simple_explanation && (
                  <Alert className="mt-3 border-green-200 bg-green-50">
                    <Brain className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800 text-sm">
                      <strong>🎯 Quick Discovery:</strong> {analysis.simple_explanation.slice(0, 100)}
                      {analysis.simple_explanation.length > 100 && '...'}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Creation Date */}
                <p className="text-xs text-gray-400 mt-3">
                  Created: {analysis.created_at.toLocaleDateString()} at {analysis.created_at.toLocaleTimeString()}
                </p>

                {isSelected && (
                  <div className="mt-3 p-3 bg-purple-100 rounded-md">
                    <p className="text-sm text-purple-800">
                      🎯 <strong>Selected!</strong> 
                      {analysis.status === 'completed' 
                        ? ' Switch to Results tab to see the full discovery!'
                        : ' This analysis is ready for your review.'
                      }
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
