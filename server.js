/**
 * server.js
 * 
 * This file implements the MCP (Model Context Protocol) server
 * for Salesforce/nCino analysis.
 */

const { createMcpServer } = require('@modelcontextprotocol/typescript-sdk');
const { NamingConventionAnalyzer } = require('./src/models/NamingConventionAnalyzer');
const { BypassPatternAnalyzer } = require('./src/models/BypassPatternAnalyzer');
const { MetadataExtractor } = require('./src/controllers/MetadataExtractor');
const fs = require('fs');
const path = require('path');

// Create an MCP Server
const server = createMcpServer({
  apiKey: process.env.MCP_API_KEY,
  serverInfo: {
    name: "Salesforce/nCino Analyzer",
    description: "Specialized analyzer for Salesforce/nCino configurations",
    version: "1.0.0",
    vendor: "nCino",
    contactInfo: "https://github.com/ncinotimo/salesforce-ncino-analyzer"
  }
});

// Initialize analyzers
const namingAnalyzer = new NamingConventionAnalyzer();
const bypassAnalyzer = new BypassPatternAnalyzer();
const metadataExtractor = new MetadataExtractor({ tempDir: path.join(__dirname, 'temp') });

// =================================================================
// RESOURCES
// =================================================================

// Resource: Salesforce Field Definitions
server.addResource({
  id: "salesforce.fields",
  name: "Salesforce Field Definitions",
  description: "Field definitions from Salesforce/nCino objects",
  contentType: "application/json",
  getContent: async (params) => {
    try {
      const fieldData = await loadResourceData(params.source);
      return {
        content: fieldData,
        metadata: {
          count: fieldData.length,
          objectName: params.objectName || "LLC_BI__Loan__c"
        }
      };
    } catch (error) {
      throw new Error(`Failed to load field definitions: ${error.message}`);
    }
  }
});

// Resource: Validation Rules
server.addResource({
  id: "salesforce.validationRules",
  name: "Salesforce Validation Rules",
  description: "Validation rule definitions from Salesforce/nCino objects",
  contentType: "application/json",
  getContent: async (params) => {
    try {
      const ruleData = await loadResourceData(params.source);
      return {
        content: ruleData,
        metadata: {
          count: ruleData.length,
          objectName: params.objectName || "LLC_BI__Loan__c"
        }
      };
    } catch (error) {
      throw new Error(`Failed to load validation rules: ${error.message}`);
    }
  }
});

// Resource: Apex Triggers
server.addResource({
  id: "salesforce.triggers",
  name: "Salesforce Apex Triggers",
  description: "Apex trigger definitions from Salesforce/nCino objects",
  contentType: "application/json",
  getContent: async (params) => {
    try {
      const triggerData = await loadResourceData(params.source);
      return {
        content: triggerData,
        metadata: {
          count: triggerData.length,
          objectName: params.objectName || "LLC_BI__Loan__c"
        }
      };
    } catch (error) {
      throw new Error(`Failed to load apex triggers: ${error.message}`);
    }
  }
});

// =================================================================
// TOOLS
// =================================================================

// Tool: Extract Metadata
server.addTool({
  id: "salesforce.extractMetadata",
  name: "Extract Salesforce Metadata",
  description: "Extract metadata from a Salesforce org",
  parameters: {
    type: "object",
    properties: {
      instanceUrl: {
        type: "string",
        description: "Salesforce instance URL (e.g., https://mycompany.my.salesforce.com)"
      },
      accessToken: {
        type: "string",
        description: "Salesforce access token"
      },
      objectName: {
        type: "string",
        description: "Object name to extract (default: LLC_BI__Loan__c)",
        default: "LLC_BI__Loan__c"
      }
    },
    required: ["instanceUrl", "accessToken"]
  },
  handler: async ({ instanceUrl, accessToken, objectName }) => {
    try {
      const credentials = {
        instanceUrl,
        accessToken
      };
      
      const metadata = await metadataExtractor.extractMetadata(credentials);
      
      return {
        success: true,
        data: {
          fields: metadata.fields || [],
          validationRules: metadata.validationRules || [],
          triggers: metadata.triggers || []
        },
        message: `Successfully extracted metadata for ${objectName}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: `Failed to extract metadata: ${error.message}`
      };
    }
  }
});

// Tool: Analyze Naming Conventions
server.addTool({
  id: "salesforce.analyzeNamingConventions",
  name: "Analyze Naming Conventions",
  description: "Analyze field naming conventions against nCino standards",
  parameters: {
    type: "object",
    properties: {
      fields: {
        type: "array",
        description: "Array of field metadata objects",
        items: {
          type: "object"
        }
      },
      resourceId: {
        type: "string",
        description: "Optional resource ID to analyze instead of providing fields directly"
      }
    },
    anyOf: [
      { required: ["fields"] },
      { required: ["resourceId"] }
    ]
  },
  handler: async ({ fields, resourceId }) => {
    try {
      let fieldsToAnalyze = fields;
      
      // If resourceId is provided, get the fields from that resource
      if (resourceId && !fields) {
        const resource = await server.getResourceContent(resourceId);
        fieldsToAnalyze = resource.content;
      }
      
      if (!fieldsToAnalyze || !Array.isArray(fieldsToAnalyze)) {
        throw new Error("No valid fields provided for analysis");
      }
      
      const results = namingAnalyzer.analyzeFields(fieldsToAnalyze);
      const summary = namingAnalyzer.generateSummaryReport(results);
      
      return {
        success: true,
        results,
        summary,
        message: `Analyzed ${fieldsToAnalyze.length} fields. Compliance: ${results.compliancePercentage}%`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: `Failed to analyze naming conventions: ${error.message}`
      };
    }
  }
});

// Tool: Analyze Validation Rule Bypass Patterns
server.addTool({
  id: "salesforce.analyzeValidationRules",
  name: "Analyze Validation Rule Bypass Patterns",
  description: "Detect bypass patterns in validation rules",
  parameters: {
    type: "object",
    properties: {
      validationRules: {
        type: "array",
        description: "Array of validation rule metadata objects",
        items: {
          type: "object"
        }
      },
      resourceId: {
        type: "string",
        description: "Optional resource ID to analyze instead of providing validation rules directly"
      }
    },
    anyOf: [
      { required: ["validationRules"] },
      { required: ["resourceId"] }
    ]
  },
  handler: async ({ validationRules, resourceId }) => {
    try {
      let rulesToAnalyze = validationRules;
      
      // If resourceId is provided, get the validation rules from that resource
      if (resourceId && !validationRules) {
        const resource = await server.getResourceContent(resourceId);
        rulesToAnalyze = resource.content;
      }
      
      if (!rulesToAnalyze || !Array.isArray(rulesToAnalyze)) {
        throw new Error("No valid validation rules provided for analysis");
      }
      
      const results = bypassAnalyzer.analyzeValidationRules(rulesToAnalyze);
      const priorities = bypassAnalyzer.generateRefactoringPriorities(results, 'validation');
      const recommendations = bypassAnalyzer.generateGeneralRecommendations(results, 'validation');
      
      return {
        success: true,
        results,
        refactoringPriorities: priorities,
        recommendations,
        message: `Analyzed ${rulesToAnalyze.length} validation rules. Security score: ${results.securityScore}/100`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: `Failed to analyze validation rules: ${error.message}`
      };
    }
  }
});

// Tool: Analyze Apex Trigger Bypass Patterns
server.addTool({
  id: "salesforce.analyzeApexTriggers",
  name: "Analyze Apex Trigger Bypass Patterns",
  description: "Detect bypass patterns in Apex triggers",
  parameters: {
    type: "object",
    properties: {
      triggers: {
        type: "array",
        description: "Array of trigger metadata objects",
        items: {
          type: "object"
        }
      },
      resourceId: {
        type: "string",
        description: "Optional resource ID to analyze instead of providing triggers directly"
      }
    },
    anyOf: [
      { required: ["triggers"] },
      { required: ["resourceId"] }
    ]
  },
  handler: async ({ triggers, resourceId }) => {
    try {
      let triggersToAnalyze = triggers;
      
      // If resourceId is provided, get the triggers from that resource
      if (resourceId && !triggers) {
        const resource = await server.getResourceContent(resourceId);
        triggersToAnalyze = resource.content;
      }
      
      if (!triggersToAnalyze || !Array.isArray(triggersToAnalyze)) {
        throw new Error("No valid triggers provided for analysis");
      }
      
      const results = bypassAnalyzer.analyzeApexTriggers(triggersToAnalyze);
      const priorities = bypassAnalyzer.generateRefactoringPriorities(results, 'trigger');
      const recommendations = bypassAnalyzer.generateGeneralRecommendations(results, 'trigger');
      
      return {
        success: true,
        results,
        refactoringPriorities: priorities,
        recommendations,
        message: `Analyzed ${triggersToAnalyze.length} triggers. Security score: ${results.securityScore}/100`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: `Failed to analyze triggers: ${error.message}`
      };
    }
  }
});

// Tool: Generate Comprehensive Report
server.addTool({
  id: "salesforce.generateReport",
  name: "Generate Comprehensive Report",
  description: "Generate a comprehensive report combining all analyses",
  parameters: {
    type: "object",
    properties: {
      namingResults: {
        type: "object",
        description: "Results from naming convention analysis"
      },
      validationResults: {
        type: "object",
        description: "Results from validation rule analysis"
      },
      triggerResults: {
        type: "object",
        description: "Results from trigger analysis"
      }
    },
    required: []
  },
  handler: async ({ namingResults, validationResults, triggerResults }) => {
    try {
      // Build analyses object
      const analyses = {};
      
      if (namingResults) {
        analyses.namingConventions = namingResults.results;
        analyses.namingConventionsSummary = namingResults.summary;
      }
      
      if (validationResults) {
        analyses.validationRules = validationResults.results;
        analyses.validationRulesRefactoringPriorities = validationResults.refactoringPriorities;
        analyses.validationRulesRecommendations = validationResults.recommendations;
      }
      
      if (triggerResults) {
        analyses.triggers = triggerResults.results;
        analyses.triggersRefactoringPriorities = triggerResults.refactoringPriorities;
        analyses.triggersRecommendations = triggerResults.recommendations;
      }
      
      // Generate report structure
      const report = generateComprehensiveReport(analyses);
      
      return {
        success: true,
        report,
        message: "Successfully generated comprehensive report"
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: `Failed to generate report: ${error.message}`
      };
    }
  }
});

// =================================================================
// PROMPTS
// =================================================================

// Prompt Template: Basic Analysis
server.addPromptTemplate({
  id: "salesforce.basicAnalysis",
  name: "Basic Salesforce/nCino Analysis",
  description: "Analyze Salesforce/nCino configuration for basic issues",
  systemPrompt: `You are a Salesforce/nCino configuration expert who specializes in analyzing metadata for naming convention violations and security issues. 
  
You will be analyzing:
- Field naming conventions against nCino standards
- Validation rule bypass patterns
- Apex trigger security issues

Provide a clear, concise analysis with:
1. Executive summary with key findings
2. Detailed list of issues found, grouped by type
3. Prioritized recommendations for improvement
4. Overall configuration health score`,
  userPrompt: `Analyze the provided Salesforce/nCino configuration and identify any issues with naming conventions or security patterns. 

{{#if resourceIds}}
I've provided the following resources to analyze:
{{#each resourceIds}}
- {{this}}
{{/each}}
{{/if}}

Please focus on:
{{#if focus}}
{{focus}}
{{else}}
- Naming convention compliance
- Security bypass patterns
- Overall configuration health
{{/if}}`,
  handler: async (params) => {
    // This template doesn't need a custom handler - the MCP server
    // will handle the templating
    return params;
  }
});

// Prompt Template: Security Analysis
server.addPromptTemplate({
  id: "salesforce.securityAnalysis",
  name: "Salesforce/nCino Security Analysis",
  description: "Analyze Salesforce/nCino configuration for security issues",
  systemPrompt: `You are a Salesforce/nCino security expert specializing in detecting bypass patterns and security vulnerabilities in configurations.

Focus primarily on:
- Validation rule bypass patterns (profile-based, user-based, etc.)
- Apex trigger security concerns
- Permission-based security issues
- Hardcoded IDs and other security risks

Provide a thorough security analysis with:
1. Executive summary with critical security findings
2. Detailed breakdown of all security vulnerabilities found
3. Security risk score for each component
4. Remediation plan with prioritized actions`,
  userPrompt: `Perform a comprehensive security analysis of the provided Salesforce/nCino configuration, focusing specifically on security bypass patterns and vulnerabilities.

{{#if resourceIds}}
I've provided the following resources to analyze:
{{#each resourceIds}}
- {{this}}
{{/each}}
{{/if}}

Please identify:
- All bypass patterns in validation rules and triggers
- Hardcoded IDs and credentials
- Profile-based or user-based security bypasses
- Other security vulnerabilities

For each issue, provide:
1. Severity level
2. Explanation of the security risk
3. Recommended fix`,
  handler: async (params) => {
    // This template doesn't need a custom handler - the MCP server
    // will handle the templating
    return params;
  }
});

// Helper function to load resource data
async function loadResourceData(source) {
  if (!source) {
    throw new Error("No source provided for resource data");
  }
  
  // If the source is a file path
  if (typeof source === 'string' && (source.endsWith('.json') || source.endsWith('.xml') || source.endsWith('.csv'))) {
    if (!fs.existsSync(source)) {
      throw new Error(`File not found: ${source}`);
    }
    
    if (source.endsWith('.json')) {
      const fileContent = fs.readFileSync(source, 'utf8');
      return JSON.parse(fileContent);
    } else if (source.endsWith('.xml')) {
      const fileContent = fs.readFileSync(source, 'utf8');
      return await metadataExtractor.convertXmlToJson(fileContent);
    } else if (source.endsWith('.csv')) {
      return await metadataExtractor.parseCsvFile(source);
    }
  }
  
  // If the source is already a data object
  if (typeof source === 'object') {
    return source;
  }
  
  throw new Error("Unsupported resource source format");
}

// Helper function to generate a comprehensive report
function generateComprehensiveReport(analyses) {
  // Create report structure
  const report = {
    executiveSummary: generateExecutiveSummary(analyses),
    detailedFindings: {},
    recommendations: generateRecommendations(analyses),
    overallScore: calculateOverallScore(analyses)
  };
  
  // Add detailed findings
  if (analyses.namingConventions) {
    report.detailedFindings.namingConventions = {
      compliancePercentage: analyses.namingConventions.compliancePercentage,
      violations: analyses.namingConventions.violations.map(v => ({
        field: v.apiName,
        issues: v.violations.map(issue => issue.rule),
        recommendation: v.recommendedFix
      })),
      topIssues: analyses.namingConventionsSummary?.topIssues || []
    };
  }
  
  if (analyses.validationRules) {
    report.detailedFindings.validationRules = {
      securityScore: analyses.validationRules.securityScore,
      bypassPercentage: analyses.validationRules.bypassPercentage,
      patterns: analyses.validationRules.bypassPatterns.map(p => ({
        rule: p.apiName,
        patterns: p.patterns.map(pattern => pattern.name),
        severity: p.highestSeverity
      })),
      refactoringPriorities: analyses.validationRulesRefactoringPriorities?.slice(0, 5) || []
    };
  }
  
  if (analyses.triggers) {
    report.detailedFindings.triggers = {
      securityScore: analyses.triggers.securityScore,
      bypassPercentage: analyses.triggers.bypassPercentage,
      patterns: analyses.triggers.bypassPatterns.map(p => ({
        trigger: p.name,
        patterns: p.patterns.map(pattern => pattern.name),
        severity: p.highestSeverity
      })),
      refactoringPriorities: analyses.triggersRefactoringPriorities?.slice(0, 5) || []
    };
  }
  
  return report;
}

// Helper function to generate executive summary
function generateExecutiveSummary(analyses) {
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
  if (analyses.namingConventions) {
    summary.risksIdentified.critical += analyses.namingConventions.bySeverity.critical.length;
    summary.risksIdentified.medium += analyses.namingConventions.bySeverity.medium.length;
    summary.risksIdentified.low += analyses.namingConventions.bySeverity.low.length;
  }
  
  if (analyses.validationRules) {
    summary.risksIdentified.critical += analyses.validationRules.rulesBySeverity.High.length;
    summary.risksIdentified.medium += analyses.validationRules.rulesBySeverity.Medium.length;
    summary.risksIdentified.low += analyses.validationRules.rulesBySeverity.Low.length;
  }
  
  if (analyses.triggers) {
    summary.risksIdentified.critical += analyses.triggers.triggersBySeverity.High.length;
    summary.risksIdentified.medium += analyses.triggers.triggersBySeverity.Medium.length;
    summary.risksIdentified.low += analyses.triggers.triggersBySeverity.Low.length;
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
  if (analyses.namingConventions) {
    summary.keyFindings.push(`${analyses.namingConventions.compliancePercentage}% of fields comply with naming conventions.`);
  }
  
  if (analyses.validationRules) {
    summary.keyFindings.push(`${analyses.validationRules.bypassPercentage}% of validation rules contain bypass patterns.`);
  }
  
  if (analyses.triggers) {
    summary.keyFindings.push(`${analyses.triggers.bypassPercentage}% of Apex triggers contain bypass patterns.`);
  }
  
  return summary;
}

// Helper function to generate recommendations
function generateRecommendations(analyses) {
  const recommendations = [];
  
  // Add naming convention recommendations
  if (analyses.namingConventionsSummary?.recommendations) {
    recommendations.push(...analyses.namingConventionsSummary.recommendations);
  }
  
  // Add validation rule recommendations
  if (analyses.validationRulesRecommendations) {
    recommendations.push(...analyses.validationRulesRecommendations);
  }
  
  // Add trigger recommendations
  if (analyses.triggersRecommendations) {
    recommendations.push(...analyses.triggersRecommendations);
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

// Helper function to calculate overall score
function calculateOverallScore(analyses) {
  let scores = [];
  let weights = [];
  
  if (analyses.namingConventions) {
    scores.push(analyses.namingConventions.compliancePercentage);
    weights.push(1);
  }
  
  if (analyses.validationRules) {
    scores.push(analyses.validationRules.securityScore);
    weights.push(1.5);
  }
  
  if (analyses.triggers) {
    scores.push(analyses.triggers.securityScore);
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
      namingConventions: analyses.namingConventions?.compliancePercentage || 0,
      validationRules: analyses.validationRules?.securityScore || 0,
      triggers: analyses.triggers?.securityScore || 0
    }
  };
}

// Start the server
const port = process.env.PORT || 3000;
server.start(port).then(() => {
  console.log(`MCP Server running on port ${port}`);
}).catch(error => {
  console.error(`Failed to start server: ${error.message}`);
});

// Export the server for testing purposes
module.exports = server;