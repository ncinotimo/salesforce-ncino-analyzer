#!/usr/bin/env node

/**
 * cli.js
 * 
 * Command-line interface for the nCino Analyzer
 * 
 * Usage:
 *   node cli.js --fields ./output/loan_fields.json --validation-rules ./output/validation_rules.json --triggers ./output/loan_triggers.json
 */

const fs = require('fs');
const path = require('path');
const nCinoAnalyzer = require('./nCinoAnalyzer');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  apiKey: process.env.CLAUDE_API_KEY,
  fieldsPath: null,
  validationRulesPath: null,
  triggersPath: null,
  outputDir: path.join(__dirname, '..', 'output'),
  promptDir: path.join(__dirname, '..', 'prompts'),
  analyzeNamingConventions: true,
  analyzeValidationRules: true,
  analyzeApexTriggers: true
};

// Parse command line arguments
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  
  if (arg === '--api-key' && i + 1 < args.length) {
    options.apiKey = args[i + 1];
    i++;
  } else if (arg === '--fields' && i + 1 < args.length) {
    options.fieldsPath = args[i + 1];
    i++;
  } else if (arg === '--validation-rules' && i + 1 < args.length) {
    options.validationRulesPath = args[i + 1];
    i++;
  } else if (arg === '--triggers' && i + 1 < args.length) {
    options.triggersPath = args[i + 1];
    i++;
  } else if (arg === '--output-dir' && i + 1 < args.length) {
    options.outputDir = args[i + 1];
    i++;
  } else if (arg === '--prompt-dir' && i + 1 < args.length) {
    options.promptDir = args[i + 1];
    i++;
  } else if (arg === '--skip-naming') {
    options.analyzeNamingConventions = false;
  } else if (arg === '--skip-validation') {
    options.analyzeValidationRules = false;
  } else if (arg === '--skip-triggers') {
    options.analyzeApexTriggers = false;
  } else if (arg === '--help' || arg === '-h') {
    showHelp();
    process.exit(0);
  }
}

// Check if required files exist
if (options.analyzeNamingConventions && options.fieldsPath && !fs.existsSync(options.fieldsPath)) {
  console.error(`Error: Fields file not found at ${options.fieldsPath}`);
  process.exit(1);
}

if (options.analyzeValidationRules && options.validationRulesPath && !fs.existsSync(options.validationRulesPath)) {
  console.error(`Error: Validation rules file not found at ${options.validationRulesPath}`);
  process.exit(1);
}

if (options.analyzeApexTriggers && options.triggersPath && !fs.existsSync(options.triggersPath)) {
  console.error(`Error: Triggers file not found at ${options.triggersPath}`);
  process.exit(1);
}

// Create analyzer instance
const analyzer = new nCinoAnalyzer({
  apiKey: options.apiKey,
  outputDir: options.outputDir,
  promptDir: options.promptDir
});

// Run analysis
async function runAnalysis() {
  console.log('Starting nCino configuration analysis...');
  
  try {
    const results = await analyzer.runCompleteAnalysis({
      analyzeNamingConventions: options.analyzeNamingConventions,
      analyzeValidationRules: options.analyzeValidationRules,
      analyzeApexTriggers: options.analyzeApexTriggers,
      fieldsPath: options.fieldsPath,
      validationRulesPath: options.validationRulesPath,
      triggersPath: options.triggersPath
    });
    
    console.log('Analysis completed successfully!');
    console.log(`Comprehensive report saved to: ${path.join(options.outputDir, 'comprehensive_report.md')}`);
  } catch (error) {
    console.error('Error running analysis:', error.message);
    process.exit(1);
  }
}

// Show help text
function showHelp() {
  console.log(`
nCino Analyzer CLI

A tool for analyzing Salesforce/nCino configurations using Claude's AI capabilities.

Usage:
  node cli.js [options]

Options:
  --api-key <key>             Claude API key (can also set CLAUDE_API_KEY env variable)
  --fields <path>             Path to fields JSON file
  --validation-rules <path>   Path to validation rules JSON file
  --triggers <path>           Path to triggers JSON file
  --output-dir <path>         Directory to store output files (default: ../output)
  --prompt-dir <path>         Directory containing prompt templates (default: ../prompts)
  --skip-naming               Skip naming convention analysis
  --skip-validation           Skip validation rule analysis
  --skip-triggers             Skip Apex trigger analysis
  --help, -h                  Show this help text

Example:
  node cli.js --fields ./output/loan_fields.json --validation-rules ./output/validation_rules.json --triggers ./output/loan_triggers.json
  `);
}

// Run the analysis
runAnalysis();