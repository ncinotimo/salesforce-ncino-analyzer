/**
 * ClaudeIntegration.js
 * 
 * This module handles integration with Claude, serving as the presenter layer.
 * It's designed to be used directly within the Claude application, where it receives
 * user inputs, triggers the analysis process, and formats results for presentation.
 */

const AnalysisController = require('../controllers/AnalysisController');

class ClaudeIntegration {
  constructor(options = {}) {
    this.options = options;
    this.controller = new AnalysisController(options);
  }

  /**
   * Process a user request from Claude
   * @param {Object} request - The parsed user request
   * @returns {Object} Formatted results for Claude to present
   */
  async processRequest(request) {
    try {
      console.log('Processing user request...');
      
      // Parse the user request to determine what they want to analyze
      const analysisParams = this.parseUserRequest(request);
      
      // Run the analysis using the controller
      const results = await this.controller.runAnalysis(analysisParams);
      
      // Format the results for presentation back to the user through Claude
      const formattedResults = this.formatResultsForClaude(results);
      
      return formattedResults;
    } catch (error) {
      console.error('Error processing request:', error);
      return {
        error: true,
        message: `There was an error processing your request: ${error.message}`,
        suggestions: [
          "Make sure you've uploaded valid Salesforce metadata files",
          "Check that your org credentials are correct if you provided them",
          "Try analyzing one component at a time (e.g., just fields or just validation rules)"
        ]
      };
    }
  }
  
  /**
   * Parse the user request to extract analysis parameters
   * @param {Object} request - The user request object
   * @returns {Object} Parameters for the analysis
   */
  parseUserRequest(request) {
    const params = {
      uploadedFiles: {},
      jsonData: {},
      orgCredentials: null,
      analysisTypes: {
        namingConventions: true,
        validationRules: true,
        triggers: true
      }
    };
    
    // Handle uploaded files
    if (request.files && Array.isArray(request.files)) {
      request.files.forEach(file => {
        // Check file type and categorize accordingly
        if (file.name.includes('field') || file.path.includes('field')) {
          params.uploadedFiles.fields = file;
        } else if (file.name.includes('validation') || file.path.includes('validation')) {
          params.uploadedFiles.validationRules = file;
        } else if (file.name.includes('trigger') || file.path.includes('trigger')) {
          params.uploadedFiles.triggers = file;
        }
      });
    }
    
    // Handle org credentials if provided
    if (request.orgCredentials) {
      params.orgCredentials = request.orgCredentials;
    }
    
    // Handle raw JSON data if provided
    if (request.jsonData) {
      params.jsonData = request.jsonData;
    }
    
    // Handle analysis type preferences
    if (request.analysisTypes) {
      if (typeof request.analysisTypes.namingConventions === 'boolean') {
        params.analysisTypes.namingConventions = request.analysisTypes.namingConventions;
      }
      if (typeof request.analysisTypes.validationRules === 'boolean') {
        params.analysisTypes.validationRules = request.analysisTypes.validationRules;
      }
      if (typeof request.analysisTypes.triggers === 'boolean') {
        params.analysisTypes.triggers = request.analysisTypes.triggers;
      }
    }
    
    return params;
  }
  
  /**
   * Format analysis results for presentation by Claude
   * @param {Object} results - The analysis results
   * @returns {Object} Formatted results for Claude to present
   */
  formatResultsForClaude(results) {
    // Create a structured response that Claude can present effectively
    const response = {
      executiveSummary: this.formatExecutiveSummary(results.executiveSummary),
      overallScore: this.formatOverallScore(results.overallScore),
      detailedFindings: this.formatDetailedFindings(results.detailedFindings),
      recommendations: results.recommendations || [],
      visualizationData: this.prepareVisualizationData(results)
    };
    
    return response;
  }
  
  /**
   * Format the executive summary for Claude presentation
   * @param {Object} summary - The executive summary
   * @returns {string} Formatted executive summary
   */
  formatExecutiveSummary(summary) {
    if (!summary) return '';
    
    let formattedSummary = `## Executive Summary\n\n`;
    formattedSummary += `${summary.overallAssessment}\n\n`;
    
    formattedSummary += `### Key Findings\n\n`;
    
    if (summary.keyFindings && summary.keyFindings.length > 0) {
      summary.keyFindings.forEach(finding => {
        formattedSummary += `- ${finding}\n`;
      });
    }
    
    formattedSummary += `\n### Risk Breakdown\n\n`;
    formattedSummary += `- Critical Issues: ${summary.risksIdentified.critical}\n`;
    formattedSummary += `- Medium Issues: ${summary.risksIdentified.medium}\n`;
    formattedSummary += `- Low Issues: ${summary.risksIdentified.low}\n`;
    
    return formattedSummary;
  }
  
  /**
   * Format the overall score for Claude presentation
   * @param {Object} score - The overall score
   * @returns {string} Formatted overall score
   */
  formatOverallScore(score) {
    if (!score) return '';
    
    let formattedScore = `## Overall Configuration Health Score: ${score.score}/100 (${score.rating})\n\n`;
    
    if (score.componentScores) {
      formattedScore += `### Component Scores\n\n`;
      
      if (score.componentScores.namingConventions) {
        formattedScore += `- Naming Conventions: ${score.componentScores.namingConventions}/100\n`;
      }
      
      if (score.componentScores.validationRules) {
        formattedScore += `- Validation Rules: ${score.componentScores.validationRules}/100\n`;
      }
      
      if (score.componentScores.triggers) {
        formattedScore += `- Apex Triggers: ${score.componentScores.triggers}/100\n`;
      }
    }
    
    return formattedScore;
  }
  
  /**
   * Format the detailed findings for Claude presentation
   * @param {Object} findings - The detailed findings
   * @returns {string} Formatted detailed findings
   */
  formatDetailedFindings(findings) {
    if (!findings) return '';
    
    let formattedFindings = `## Detailed Findings\n\n`;
    
    // Naming conventions
    if (findings.namingConventions) {
      formattedFindings += `### Naming Convention Compliance: ${findings.namingConventions.compliancePercentage}%\n\n`;
      
      if (findings.namingConventions.violations && findings.namingConventions.violations.length > 0) {
        formattedFindings += `#### Field Naming Issues\n\n`;
        
        // Only show the first 10 violations to keep it manageable
        const displayViolations = findings.namingConventions.violations.slice(0, 10);
        
        formattedFindings += `| Field | Issues | Recommendation |\n`;
        formattedFindings += `| ----- | ------ | -------------- |\n`;
        
        displayViolations.forEach(violation => {
          const issues = Array.isArray(violation.issues) 
            ? violation.issues.join(', ') 
            : violation.issues;
            
          formattedFindings += `| ${violation.field} | ${issues} | ${violation.recommendation} |\n`;
        });
        
        if (findings.namingConventions.violations.length > 10) {
          formattedFindings += `\n_...and ${findings.namingConventions.violations.length - 10} more fields with issues._\n`;
        }
      }
      
      if (findings.namingConventions.topIssues && findings.namingConventions.topIssues.length > 0) {
        formattedFindings += `\n#### Top Naming Convention Issues\n\n`;
        
        findings.namingConventions.topIssues.forEach(issue => {
          formattedFindings += `- ${issue.rule}: ${issue.count} occurrences\n`;
        });
      }
    }
    
    // Validation rules
    if (findings.validationRules) {
      formattedFindings += `\n### Validation Rule Security Score: ${findings.validationRules.securityScore}/100\n\n`;
      formattedFindings += `${findings.validationRules.bypassPercentage}% of validation rules contain bypass patterns.\n\n`;
      
      if (findings.validationRules.patterns && findings.validationRules.patterns.length > 0) {
        formattedFindings += `#### Validation Rules with Bypass Patterns\n\n`;
        
        // Only show the first 10 to keep it manageable
        const displayPatterns = findings.validationRules.patterns.slice(0, 10);
        
        formattedFindings += `| Rule | Patterns | Severity |\n`;
        formattedFindings += `| ---- | -------- | -------- |\n`;
        
        displayPatterns.forEach(pattern => {
          const patternList = Array.isArray(pattern.patterns) 
            ? pattern.patterns.join(', ') 
            : pattern.patterns;
            
          formattedFindings += `| ${pattern.rule} | ${patternList} | ${pattern.severity} |\n`;
        });
        
        if (findings.validationRules.patterns.length > 10) {
          formattedFindings += `\n_...and ${findings.validationRules.patterns.length - 10} more validation rules with issues._\n`;
        }
      }
      
      if (findings.validationRules.refactoringPriorities && findings.validationRules.refactoringPriorities.length > 0) {
        formattedFindings += `\n#### Validation Rules to Refactor (Priority Order)\n\n`;
        
        findings.validationRules.refactoringPriorities.forEach((rule, index) => {
          formattedFindings += `${index + 1}. ${rule}\n`;
        });
      }
    }
    
    // Triggers
    if (findings.triggers) {
      formattedFindings += `\n### Apex Trigger Security Score: ${findings.triggers.securityScore}/100\n\n`;
      formattedFindings += `${findings.triggers.bypassPercentage}% of Apex triggers contain bypass patterns.\n\n`;
      
      if (findings.triggers.patterns && findings.triggers.patterns.length > 0) {
        formattedFindings += `#### Triggers with Bypass Patterns\n\n`;
        
        // Only show the first 10 to keep it manageable
        const displayPatterns = findings.triggers.patterns.slice(0, 10);
        
        formattedFindings += `| Trigger | Patterns | Severity |\n`;
        formattedFindings += `| ------- | -------- | -------- |\n`;
        
        displayPatterns.forEach(pattern => {
          const patternList = Array.isArray(pattern.patterns) 
            ? pattern.patterns.join(', ') 
            : pattern.patterns;
            
          formattedFindings += `| ${pattern.trigger} | ${patternList} | ${pattern.severity} |\n`;
        });
        
        if (findings.triggers.patterns.length > 10) {
          formattedFindings += `\n_...and ${findings.triggers.patterns.length - 10} more triggers with issues._\n`;
        }
      }
      
      if (findings.triggers.refactoringPriorities && findings.triggers.refactoringPriorities.length > 0) {
        formattedFindings += `\n#### Triggers to Refactor (Priority Order)\n\n`;
        
        findings.triggers.refactoringPriorities.forEach((trigger, index) => {
          formattedFindings += `${index + 1}. ${trigger}\n`;
        });
      }
    }
    
    return formattedFindings;
  }
  
  /**
   * Prepare visualization data for Claude to display
   * @param {Object} results - The analysis results
   * @returns {Object} Visualization data
   */
  prepareVisualizationData(results) {
    // Prepare data for visualizations that Claude can render
    const visualizationData = {
      scoreChart: this.prepareScoreChartData(results),
      issueBreakdown: this.prepareIssueBreakdownData(results),
      bypassPatternDistribution: this.prepareBypassPatternData(results)
    };
    
    return visualizationData;
  }
  
  /**
   * Prepare data for the score chart visualization
   * @param {Object} results - The analysis results
   * @returns {Object} Score chart data
   */
  prepareScoreChartData(results) {
    const scoreData = {
      labels: [],
      datasets: [{
        label: 'Score',
        data: []
      }]
    };
    
    if (results.overallScore && results.overallScore.componentScores) {
      const scores = results.overallScore.componentScores;
      
      if (scores.namingConventions) {
        scoreData.labels.push('Naming Conventions');
        scoreData.datasets[0].data.push(scores.namingConventions);
      }
      
      if (scores.validationRules) {
        scoreData.labels.push('Validation Rules');
        scoreData.datasets[0].data.push(scores.validationRules);
      }
      
      if (scores.triggers) {
        scoreData.labels.push('Apex Triggers');
        scoreData.datasets[0].data.push(scores.triggers);
      }
      
      scoreData.labels.push('Overall');
      scoreData.datasets[0].data.push(results.overallScore.score);
    }
    
    return scoreData;
  }
  
  /**
   * Prepare data for the issue breakdown visualization
   * @param {Object} results - The analysis results
   * @returns {Object} Issue breakdown data
   */
  prepareIssueBreakdownData(results) {
    let criticalCount = 0;
    let mediumCount = 0;
    let lowCount = 0;
    
    if (results.executiveSummary && results.executiveSummary.risksIdentified) {
      criticalCount = results.executiveSummary.risksIdentified.critical || 0;
      mediumCount = results.executiveSummary.risksIdentified.medium || 0;
      lowCount = results.executiveSummary.risksIdentified.low || 0;
    }
    
    return {
      labels: ['Critical', 'Medium', 'Low'],
      datasets: [{
        label: 'Issue Count',
        data: [criticalCount, mediumCount, lowCount],
        backgroundColor: ['#FF6384', '#FFCE56', '#36A2EB']
      }]
    };
  }
  
  /**
   * Prepare data for the bypass pattern distribution visualization
   * @param {Object} results - The analysis results
   * @returns {Object} Bypass pattern distribution data
   */
  prepareBypassPatternData(results) {
    const patternData = {
      labels: [],
      datasets: [{
        label: 'Count',
        data: []
      }]
    };
    
    // Collect all bypass patterns from validation rules and triggers
    const patternCounts = {};
    
    if (results.detailedFindings) {
      // From validation rules
      if (results.detailedFindings.validationRules && results.detailedFindings.validationRules.patterns) {
        results.detailedFindings.validationRules.patterns.forEach(item => {
          if (Array.isArray(item.patterns)) {
            item.patterns.forEach(pattern => {
              if (!patternCounts[pattern]) {
                patternCounts[pattern] = 0;
              }
              patternCounts[pattern]++;
            });
          }
        });
      }
      
      // From triggers
      if (results.detailedFindings.triggers && results.detailedFindings.triggers.patterns) {
        results.detailedFindings.triggers.patterns.forEach(item => {
          if (Array.isArray(item.patterns)) {
            item.patterns.forEach(pattern => {
              if (!patternCounts[pattern]) {
                patternCounts[pattern] = 0;
              }
              patternCounts[pattern]++;
            });
          }
        });
      }
    }
    
    // Convert to chart data format
    Object.entries(patternCounts).forEach(([pattern, count]) => {
      patternData.labels.push(pattern);
      patternData.datasets[0].data.push(count);
    });
    
    return patternData;
  }
}

module.exports = ClaudeIntegration;