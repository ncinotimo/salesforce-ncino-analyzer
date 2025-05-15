const fs = require('fs');
const path = require('path');
const axios = require('axios');

/**
 * nCinoAnalyzer - Core class for analyzing Salesforce/nCino metadata using Claude
 */
class nCinoAnalyzer {
  constructor(config) {
    this.config = config || {};
    this.apiKey = config.apiKey || process.env.CLAUDE_API_KEY;
    this.apiUrl = config.apiUrl || 'https://api.anthropic.com/v1/messages';
    this.model = config.model || 'claude-3-opus-20240229';
    this.maxTokens = config.maxTokens || 4096;
    this.promptDir = config.promptDir || path.join(__dirname, '..', 'prompts');
    this.outputDir = config.outputDir || path.join(__dirname, '..', 'output');
  }

  /**
   * Initialize the analyzer
   */
  async initialize() {
    if (!this.apiKey) {
      throw new Error('Claude API key is required. Set CLAUDE_API_KEY environment variable or pass in config.');
    }

    // Create output directory if it doesn't exist
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    console.log('nCino Analyzer initialized');
  }

  /**
   * Load a prompt template from the prompts directory
   * @param {string} promptName - Name of the prompt template file (without extension)
   * @returns {string} The prompt template content
   */
  loadPromptTemplate(promptName) {
    const promptPath = path.join(this.promptDir, `${promptName}.xml`);
    if (!fs.existsSync(promptPath)) {
      throw new Error(`Prompt template not found: ${promptPath}`);
    }
    return fs.readFileSync(promptPath, 'utf8');
  }

  /**
   * Replace the metadata section in a prompt template
   * @param {string} promptTemplate - The prompt template content
   * @param {string} metadataContent - The metadata to insert
   * @returns {string} The prompt with metadata inserted
   */
  insertMetadata(promptTemplate, metadataContent, metadataTag = 'metadata') {
    // Create a regex that matches the metadata tag and its empty content
    const metadataRegex = new RegExp(`<${metadataTag}>([\\s\\S]*?)<\\/${metadataTag}>`, 'g');
    return promptTemplate.replace(metadataRegex, `<${metadataTag}>\n${metadataContent}\n</${metadataTag}>`);
  }

  /**
   * Insert metadata into the validation_rules section of a prompt
   * @param {string} promptTemplate - The prompt template content
   * @param {string} validationRulesContent - The validation rules metadata content
   * @returns {string} The prompt with validation rules inserted
   */
  insertValidationRules(promptTemplate, validationRulesContent) {
    return this.insertMetadata(promptTemplate, validationRulesContent, 'validation_rules');
  }

  /**
   * Send a prompt to Claude API and get the response
   * @param {string} prompt - The full prompt to send to Claude
   * @returns {Promise<object>} Claude's response
   */
  async analyzeWithClaude(prompt) {
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          max_tokens: this.maxTokens,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01'
          }
        }
      );

      return response.data.content;
    } catch (error) {
      console.error('Error calling Claude API:', error.response ? error.response.data : error.message);
      throw error;
    }
  }

  /**
   * Analyze naming conventions for nCino fields
   * @param {string} fieldsJsonPath - Path to the JSON file containing field metadata
   * @returns {Promise<object>} Analysis results
   */
  async analyzeNamingConventions(fieldsJsonPath) {
    console.log('Analyzing naming conventions...');
    
    // Load field metadata
    const fieldsData = JSON.parse(fs.readFileSync(fieldsJsonPath, 'utf8'));
    
    // Convert fields to a simplified format for Claude
    const fieldsMetadata = fieldsData.map(field => {
      return {
        apiName: field.apiName,
        label: field.label,
        type: field.type,
        description: field.description
      };
    });
    
    // Format as XML for Claude
    const fieldsXml = `<fields>\n${fieldsMetadata.map(field => 
      `  <field>
    <apiName>${field.apiName}</apiName>
    <label>${field.label || ''}</label>
    <type>${field.type || ''}</type>
    <description>${field.description || ''}</description>
  </field>`).join('\n')}\n</fields>`;
    
    // Load naming convention prompt template
    const promptTemplate = this.loadPromptTemplate('naming_convention_analysis');
    
    // Insert field metadata into prompt
    const prompt = this.insertMetadata(promptTemplate, fieldsXml);
    
    // Analyze with Claude
    const response = await this.analyzeWithClaude(prompt);
    
    // Save response
    const outputPath = path.join(this.outputDir, 'naming_convention_analysis.md');
    fs.writeFileSync(outputPath, response, 'utf8');
    
    console.log(`Naming convention analysis complete. Results saved to ${outputPath}`);
    
    return response;
  }

  /**
   * Analyze validation rules for bypass patterns
   * @param {string} validationRulesJsonPath - Path to the JSON file containing validation rule metadata
   * @returns {Promise<object>} Analysis results
   */
  async analyzeValidationRules(validationRulesJsonPath) {
    console.log('Analyzing validation rules for bypass patterns...');
    
    // Load validation rule metadata
    const validationRulesData = JSON.parse(fs.readFileSync(validationRulesJsonPath, 'utf8'));
    
    // Format as XML for Claude
    const validationRulesXml = `<rules>\n${validationRulesData.map(rule => 
      `  <rule>
    <apiName>${rule.apiName}</apiName>
    <active>${rule.active}</active>
    <description>${rule.description || ''}</description>
    <errorMessage>${rule.errorMessage || ''}</errorMessage>
    <errorDisplayField>${rule.errorDisplayField || ''}</errorDisplayField>
    <formula><![CDATA[${rule.errorConditionFormula || ''}]]></formula>
  </rule>`).join('\n')}\n</rules>`;
    
    // Load validation rule prompt template
    const promptTemplate = this.loadPromptTemplate('validation_rule_analysis');
    
    // Insert validation rule metadata into prompt
    const prompt = this.insertValidationRules(promptTemplate, validationRulesXml);
    
    // Analyze with Claude
    const response = await this.analyzeWithClaude(prompt);
    
    // Save response
    const outputPath = path.join(this.outputDir, 'validation_rule_analysis.md');
    fs.writeFileSync(outputPath, response, 'utf8');
    
    console.log(`Validation rule analysis complete. Results saved to ${outputPath}`);
    
    return response;
  }

  /**
   * Analyze Apex triggers for bypass patterns
   * @param {string} triggersJsonPath - Path to the JSON file containing trigger metadata
   * @returns {Promise<object>} Analysis results
   */
  async analyzeApexTriggers(triggersJsonPath) {
    console.log('Analyzing Apex triggers for bypass patterns...');
    
    // Load trigger metadata
    const triggersData = JSON.parse(fs.readFileSync(triggersJsonPath, 'utf8'));
    
    // Format as XML for Claude
    const triggersXml = `<triggers>\n${triggersData.map(trigger => 
      `  <trigger>
    <name>${trigger.name}</name>
    <active>${trigger.active}</active>
    <code><![CDATA[${trigger.content || ''}]]></code>
  </trigger>`).join('\n')}\n</triggers>`;
    
    // Create a prompt template for Apex trigger analysis
    const promptTemplate = `
<apex_bypass_detection>
  <s>
    You are an expert Salesforce developer specializing in nCino implementations with deep knowledge of metadata structures and best practices.
  </s>

  <ncino_metadata_context>
    <description>
      nCino is a financial services platform built on Salesforce. Key concepts:
      - LLC_BI__ prefix indicates nCino managed package components
      - nc_ prefix indicates custom project-specific fields
      - Loan objects (LLC_BI__Loan__c) are central to the data model
      - Triggers should be designed carefully to avoid selective bypassing
    </description>
  </ncino_metadata_context>

  <patterns_to_detect>
    <pattern>
      <method>FeatureManagement.checkPermission</method>
      <permission_name>Exclude_Trigger</permission_name>
      <recommended_implementation>return !FeatureManagement.checkPermission('Exclude_Trigger');</recommended_implementation>
    </pattern>
    <pattern>
      <custom_setting>Trigger_Setting__c</custom_setting>
    </pattern>
    <pattern>
      <hardcoded_ids>User IDs or Profile IDs</hardcoded_ids>
      <severity>High</severity>
    </pattern>
  </patterns_to_detect>
  
  <apex_code>
    ${triggersXml}
  </apex_code>
  
  <analysis_request>
    Please analyze these Apex triggers for bypass patterns and security concerns.
    
    For each trigger, identify:
    1. Bypass mechanisms (profile checks, permission checks, user ID checks)
    2. Hardcoded IDs
    3. Security risks
    4. Recommended improvements
    
    Then provide:
    1. Overall security assessment
    2. Statistics on bypass pattern usage
    3. Prioritized list of triggers that should be refactored
    4. General recommendations for trigger security best practices
  </analysis_request>
</apex_bypass_detection>`;
    
    // Analyze with Claude
    const response = await this.analyzeWithClaude(promptTemplate);
    
    // Save response
    const outputPath = path.join(this.outputDir, 'apex_trigger_analysis.md');
    fs.writeFileSync(outputPath, response, 'utf8');
    
    console.log(`Apex trigger analysis complete. Results saved to ${outputPath}`);
    
    return response;
  }

  /**
   * Generate a comprehensive report combining all analyses
   * @param {object} analyses - Object containing all analysis results
   * @returns {string} Comprehensive report in Markdown format
   */
  generateComprehensiveReport(analyses) {
    console.log('Generating comprehensive report...');
    
    const reportTemplate = `# nCino Configuration Analysis Report

## Executive Summary

This report provides a comprehensive analysis of the nCino Loan object configuration, highlighting potential issues with naming conventions, validation rules, and bypass patterns. The analysis was performed using Claude's AI capabilities to identify patterns and provide recommendations.

## Analysis Overview

${analyses.namingConventionSummary || ''}

${analyses.validationRuleSummary || ''}

${analyses.apexTriggerSummary || ''}

## Key Recommendations

1. Standardize naming conventions across all custom fields
2. Review and refactor validation rules with high-risk bypass patterns
3. Implement consistent security controls in Apex triggers
4. Document bypass patterns and implement a governance process

## Detailed Findings

### Naming Convention Analysis

${analyses.namingConventionDetails || ''}

### Validation Rule Analysis

${analyses.validationRuleDetails || ''}

### Apex Trigger Analysis

${analyses.apexTriggerDetails || ''}

## Conclusion

This analysis identified several areas for improvement in the current nCino implementation. By addressing the identified issues, the organization can improve maintainability, security, and compliance of the Salesforce/nCino configuration.
`;
    
    // Save report
    const outputPath = path.join(this.outputDir, 'comprehensive_report.md');
    fs.writeFileSync(outputPath, reportTemplate, 'utf8');
    
    console.log(`Comprehensive report generated. Saved to ${outputPath}`);
    
    return reportTemplate;
  }

  /**
   * Run a complete analysis on nCino metadata
   * @param {object} options - Analysis options
   * @returns {Promise<object>} Analysis results
   */
  async runCompleteAnalysis(options = {}) {
    await this.initialize();
    
    const analyses = {};
    
    // Analyze naming conventions
    if (options.analyzeNamingConventions !== false) {
      const fieldsPath = options.fieldsPath || path.join(this.outputDir, 'loan_fields.json');
      try {
        const namingResults = await this.analyzeNamingConventions(fieldsPath);
        analyses.namingConventionDetails = namingResults;
        analyses.namingConventionSummary = 'Analysis of field naming conventions identified several compliance issues.';
      } catch (error) {
        console.error('Error analyzing naming conventions:', error.message);
      }
    }
    
    // Analyze validation rules
    if (options.analyzeValidationRules !== false) {
      const validationRulesPath = options.validationRulesPath || path.join(this.outputDir, 'validation_rules.json');
      try {
        const validationResults = await this.analyzeValidationRules(validationRulesPath);
        analyses.validationRuleDetails = validationResults;
        analyses.validationRuleSummary = 'Validation rule analysis found several bypass patterns that may pose security risks.';
      } catch (error) {
        console.error('Error analyzing validation rules:', error.message);
      }
    }
    
    // Analyze Apex triggers
    if (options.analyzeApexTriggers !== false) {
      const triggersPath = options.triggersPath || path.join(this.outputDir, 'loan_triggers.json');
      try {
        const triggerResults = await this.analyzeApexTriggers(triggersPath);
        analyses.apexTriggerDetails = triggerResults;
        analyses.apexTriggerSummary = 'Apex trigger analysis identified potential security concerns in bypass mechanisms.';
      } catch (error) {
        console.error('Error analyzing Apex triggers:', error.message);
      }
    }
    
    // Generate comprehensive report
    const report = this.generateComprehensiveReport(analyses);
    analyses.comprehensiveReport = report;
    
    return analyses;
  }
}

module.exports = nCinoAnalyzer;