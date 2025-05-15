/**
 * AnalysisController.js
 * Controller component for coordinating metadata analysis workflow
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const NamingConventionAnalyzer = require('../models/NamingConventionAnalyzer');
const BypassPatternAnalyzer = require('../models/BypassPatternAnalyzer');
const MetadataExtractor = require('./MetadataExtractor');

class AnalysisController {
  constructor(options = {}) {
    this.options = options;
    this.tempDir = options.tempDir || path.join(__dirname, '../../temp');
    this.namingAnalyzer = new NamingConventionAnalyzer();
    this.bypassAnalyzer = new BypassPatternAnalyzer();
    this.metadataExtractor = new MetadataExtractor(options);
    
    // Create temp directory if it doesn't exist
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Main method to run a complete analysis
   * @param {Object} params - Analysis parameters
   * @returns {Object} Analysis results
   */
  async runAnalysis(params) {
    try {
      console.log('Starting analysis process...');
      
      // Step 1: Parse and prepare input data
      const inputData = await this.prepareInputData(params);
      
      // Step 2: Perform the analyses
      const results = await this.performAnalyses(inputData);
      
      // Step 3: Generate the comprehensive report
      const report = this.generateComprehensiveReport(results);
      
      // Step 4: Clean up temporary files
      this.cleanupTempFiles();
      
      return report;
    } catch (error) {
      console.error('Error in analysis controller:', error);
      throw error;
    }
  }
  
  /**
   * Prepare input data based on provided parameters
   * @param {Object} params - Input parameters
   * @returns {Object} Prepared input data
   */
  async prepareInputData(params) {
    const inputData = {
      fields: null,
      validationRules: null,
      triggers: null
    };
    
    // If files were uploaded, process them
    if (params.uploadedFiles) {
      if (params.uploadedFiles.fields) {
        inputData.fields = await this.processUploadedFile(params.uploadedFiles.fields);
      }
      if (params.uploadedFiles.validationRules) {
        inputData.validationRules = await this.processUploadedFile(params.uploadedFiles.validationRules);
      }
      if (params.uploadedFiles.triggers) {
        inputData.triggers = await this.processUploadedFile(params.uploadedFiles.triggers);
      }
    }
    // If org credentials were provided, extract metadata
    else if (params.orgCredentials) {
      const extractedData = await this.metadataExtractor.extractMetadata(params.orgCredentials);
      inputData.fields = extractedData.fields;
      inputData.validationRules = extractedData.validationRules;
      inputData.triggers = extractedData.triggers;
    }
    // If raw JSON data was provided
    else if (params.jsonData) {
      if (params.jsonData.fields) {
        inputData.fields = params.jsonData.fields;
      }
      if (params.jsonData.validationRules) {
        inputData.validationRules = params.jsonData.validationRules;
      }
      if (params.jsonData.triggers) {
        inputData.triggers = params.jsonData.triggers;
      }
    }
    
    // Verify that we have some data to analyze
    if (!inputData.fields && !inputData.validationRules && !inputData.triggers) {
      throw new Error('No metadata provided for analysis. Please provide fields, validation rules, or triggers.');
    }
    
    return inputData;
  }
  
  /**
   * Process an uploaded file and return its parsed content
   * @param {Object} fileInfo - Information about the uploaded file
   * @returns {Object} Parsed file content
   */
  async processUploadedFile(fileInfo) {
    const filePath = fileInfo.path || '';
    const fileContent = fileInfo.content || '';
    
    // If we have direct content, parse it
    if (fileContent) {
      if (typeof fileContent === 'string') {
        try {
          return JSON.parse(fileContent);
        } catch (e) {
          if (fileContent.trim().startsWith('<?xml')) {
            // XML content, convert to JSON
            return this.metadataExtractor.convertXmlToJson(fileContent);
          } else {
            throw new Error(`Unable to parse file content: ${e.message}`);
          }
        }
      } else {
        return fileContent; // Already parsed object
      }
    }
    // If we have a file path, read and parse it
    else if (filePath) {
      const extension = path.extname(filePath).toLowerCase();
      
      if (extension === '.json') {
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
      } else if (extension === '.xml') {
        const content = fs.readFileSync(filePath, 'utf8');
        return this.metadataExtractor.convertXmlToJson(content);
      } else if (extension === '.csv') {
        return this.metadataExtractor.parseCsvFile(filePath);
      } else {
        throw new Error(`Unsupported file format: ${extension}`);
      }
    }
    
    throw new Error('No valid file content or path provided');
  }
  
  /**
   * Perform the analyses on the input data
   * @param {Object} inputData - Prepared input data
   * @returns {Object} Analysis results
   */
  async performAnalyses(inputData) {
    const results = {};
    
    // Analyze field naming conventions
    if (inputData.fields) {
      try {
        console.log(`Analyzing naming conventions for ${inputData.fields.length} fields...`);
        results.namingConventions = this.namingAnalyzer.analyzeFields(inputData.fields);
        results.namingConventionsSummary = this.namingAnalyzer.generateSummaryReport(results.namingConventions);
      } catch (error) {
        console.error('Error analyzing naming conventions:', error);
        results.namingConventionsError = error.message;
      }
    }
    
    // Analyze validation rule bypass patterns
    if (inputData.validationRules) {
      try {
        console.log(`Analyzing bypass patterns in ${inputData.validationRules.length} validation rules...`);
        results.validationRules = this.bypassAnalyzer.analyzeValidationRules(inputData.validationRules);
        results.validationRulesRefactoringPriorities = 
          this.bypassAnalyzer.generateRefactoringPriorities(results.validationRules, 'validation');
        results.validationRulesRecommendations = 
          this.bypassAnalyzer.generateGeneralRecommendations(results.validationRules, 'validation');
      } catch (error) {
        console.error('Error analyzing validation rules:', error);
        results.validationRulesError = error.message;
      }
    }
    
    // Analyze Apex trigger bypass patterns
    if (inputData.triggers) {
      try {
        console.log(`Analyzing bypass patterns in ${inputData.triggers.length} Apex triggers...`);
        results.triggers = this.bypassAnalyzer.analyzeApexTriggers(inputData.triggers);
        results.triggersRefactoringPriorities = 
          this.bypassAnalyzer.generateRefactoringPriorities(results.triggers, 'trigger');
        results.triggersRecommendations = 
          this.bypassAnalyzer.generateGeneralRecommendations(results.triggers, 'trigger');
      } catch (error) {
        console.error('Error analyzing Apex triggers:', error);
        results.triggersError = error.message;
      }
    }
    
    return results;
  }
  
  /**
   * Generate a comprehensive report from the analysis results
   * @param {Object} results - Analysis results
   * @returns {Object} Comprehensive report
   */
  generateComprehensiveReport(results) {
    // Start building the report
    const report = {
      executiveSummary: this.generateExecutiveSummary(results),
      detailedFindings: {},
      recommendations: this.generateRecommendations(results),
      overallScore: this.calculateOverallScore(results)
    };
    
    // Add detailed findings
    if (results.namingConventions) {
      report.detailedFindings.namingConventions = {
        compliancePercentage: results.namingConventions.compliancePercentage,
        violations: results.namingConventions.violations.map(v => ({
          field: v.apiName,
          issues: v.violations.map(issue => issue.rule),
          recommendation: v.recommendedFix
        })),
        topIssues: results.namingConventionsSummary?.topIssues || []
      };
    }
    
    if (results.validationRules) {
      report.detailedFindings.validationRules = {
        securityScore: results.validationRules.securityScore,
        bypassPercentage: results.validationRules.bypassPercentage,
        patterns: results.validationRules.bypassPatterns.map(p => ({
          rule: p.apiName,
          patterns: p.patterns.map(pattern => pattern.name),
          severity: p.highestSeverity
        })),
        refactoringPriorities: results.validationRulesRefactoringPriorities?.slice(0, 5).map(p => p.apiName) || []
      };
    }
    
    if (results.triggers) {
      report.detailedFindings.triggers = {
        securityScore: results.triggers.securityScore,
        bypassPercentage: results.triggers.bypassPercentage,
        patterns: results.triggers.bypassPatterns.map(p => ({
          trigger: p.name,
          patterns: p.patterns.map(pattern => pattern.name),
          severity: p.highestSeverity
        })),
        refactoringPriorities: results.triggersRefactoringPriorities?.slice(0, 5).map(p => p.name) || []
      };
    }
    
    return report;
  }
  
  /**
   * Generate the executive summary for the report
   * @param {Object} results - Analysis results
   * @returns {Object} Executive summary
   */
  generateExecutiveSummary(results) {
    const summary = {
      overallAssessment: '',
      keyFindings: [],
      risksIdentified: {
        critical: 0,
        medium: 0,
        low: 0
      }
    };
    
    // Count risks by severity
    if (results.namingConventions) {
      summary.risksIdentified.critical += results.namingConventions.bySeverity.critical.length;
      summary.risksIdentified.medium += results.namingConventions.bySeverity.medium.length;
      summary.risksIdentified.low += results.namingConventions.bySeverity.low.length;
    }
    
    if (results.validationRules) {
      summary.risksIdentified.critical += results.validationRules.rulesBySeverity.High.length;
      summary.risksIdentified.medium += results.validationRules.rulesBySeverity.Medium.length;
      summary.risksIdentified.low += results.validationRules.rulesBySeverity.Low.length;
    }
    
    if (results.triggers) {
      summary.risksIdentified.critical += results.triggers.triggersBySeverity.High.length;
      summary.risksIdentified.medium += results.triggers.triggersBySeverity.Medium.length;
      summary.risksIdentified.low += results.triggers.triggersBySeverity.Low.length;
    }
    
    // Generate overall assessment
    const totalIssues = summary.risksIdentified.critical + summary.risksIdentified.medium + summary.risksIdentified.low;
    const criticalPercent = (summary.risksIdentified.critical / totalIssues) * 100 || 0;
    
    if (summary.risksIdentified.critical > 5 || criticalPercent > 20) {
      summary.overallAssessment = 'Critical attention required. The configuration contains significant risk factors that should be addressed immediately.';
    } else if (summary.risksIdentified.critical > 0 || summary.risksIdentified.medium > 10) {
      summary.overallAssessment = 'Moderate risk identified. The configuration has several issues that should be addressed in the near term.';
    } else {
      summary.overallAssessment = 'Low risk identified. The configuration is generally sound with minor improvements recommended.';
    }
    
    // Add key findings
    if (results.namingConventions) {
      summary.keyFindings.push(`${results.namingConventions.compliancePercentage}% of fields comply with naming conventions.`);
    }
    
    if (results.validationRules) {
      summary.keyFindings.push(`${results.validationRules.bypassPercentage}% of validation rules contain bypass patterns.`);
    }
    
    if (results.triggers) {
      summary.keyFindings.push(`${results.triggers.bypassPercentage}% of Apex triggers contain bypass patterns.`);
    }
    
    return summary;
  }
  
  /**
   * Generate prioritized recommendations
   * @param {Object} results - Analysis results
   * @returns {Array} Prioritized recommendations
   */
  generateRecommendations(results) {
    const recommendations = [];
    
    // Add naming convention recommendations
    if (results.namingConventionsSummary?.recommendations) {
      recommendations.push(...results.namingConventionsSummary.recommendations);
    }
    
    // Add validation rule recommendations
    if (results.validationRulesRecommendations) {
      recommendations.push(...results.validationRulesRecommendations);
    }
    
    // Add trigger recommendations
    if (results.triggersRecommendations) {
      recommendations.push(...results.triggersRecommendations);
    }
    
    // Add general recommendations
    recommendations.push(
      "Implement a governance process to regularly review and audit configuration changes.",
      "Document all configuration standards and patterns in a central location.",
      "Provide training to developers on secure and maintainable configuration practices."
    );
    
    // Remove any duplicates
    return [...new Set(recommendations)];
  }
  
  /**
   * Calculate an overall score for the configuration
   * @param {Object} results - Analysis results
   * @returns {Object} Overall score information
   */
  calculateOverallScore(results) {
    let scores = [];
    let weights = [];
    
    if (results.namingConventions) {
      scores.push(results.namingConventions.compliancePercentage);
      weights.push(1);
    }
    
    if (results.validationRules) {
      scores.push(results.validationRules.securityScore);
      weights.push(1.5);
    }
    
    if (results.triggers) {
      scores.push(results.triggers.securityScore);
      weights.push(1.5);
    }
    
    // Calculate weighted average
    if (scores.length === 0) {
      return { score: 0, rating: 'N/A' };
    }
    
    let totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let weightedSum = scores.reduce((sum, score, i) => sum + (score * weights[i]), 0);
    let weightedAverage = Math.round(weightedSum / totalWeight);
    
    // Determine rating
    let rating;
    if (weightedAverage >= 90) {
      rating = 'Excellent';
    } else if (weightedAverage >= 75) {
      rating = 'Good';
    } else if (weightedAverage >= 60) {
      rating = 'Fair';
    } else if (weightedAverage >= 40) {
      rating = 'Poor';
    } else {
      rating = 'Critical';
    }
    
    return {
      score: weightedAverage,
      rating,
      componentScores: {
        namingConventions: results.namingConventions?.compliancePercentage || 0,
        validationRules: results.validationRules?.securityScore || 0,
        triggers: results.triggers?.securityScore || 0
      }
    };
  }
  
  /**
   * Clean up temporary files
   */
  cleanupTempFiles() {
    // Implementation depends on how files are stored
    console.log('Cleaning up temporary files...');
    // For example, remove all files in the temp directory
    // fs.readdirSync(this.tempDir).forEach(file => {
    //   fs.unlinkSync(path.join(this.tempDir, file));
    // });
  }
}

module.exports = AnalysisController;