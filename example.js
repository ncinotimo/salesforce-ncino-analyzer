/**
 * example.js
 * 
 * Example script demonstrating how to use the nCino Analyzer programmatically
 */

const path = require('path');
const nCinoAnalyzer = require('./src/nCinoAnalyzer');

// Define sample paths to extracted metadata files
const fieldsPath = path.join(__dirname, 'examples', 'sample_loan_fields.json');
const validationRulesPath = path.join(__dirname, 'examples', 'sample_validation_rules.json');
const triggersPath = path.join(__dirname, 'examples', 'sample_loan_triggers.json');

// Create sample data directory if it doesn't exist
const fs = require('fs');
const examplesDir = path.join(__dirname, 'examples');
if (!fs.existsSync(examplesDir)) {
  fs.mkdirSync(examplesDir, { recursive: true });
}

// Create sample metadata files if they don't exist
if (!fs.existsSync(fieldsPath)) {
  // Sample field data
  const sampleFields = [
    {
      "apiName": "LLC_BI__Amount__c",
      "label": "Loan Amount",
      "type": "Currency",
      "description": "The total amount of the loan."
    },
    {
      "apiName": "LLC_BI__Status__c",
      "label": "Status",
      "type": "Picklist",
      "description": "The current status of the loan."
    },
    {
      "apiName": "nc_Loan_Score__c",
      "label": "Loan Score",
      "type": "Number",
      "description": "Custom scoring field for loan risk assessment."
    },
    {
      "apiName": "customField__c",
      "label": "Custom Field",
      "type": "Text",
      "description": "A custom field with non-compliant naming."
    }
  ];
  
  fs.writeFileSync(fieldsPath, JSON.stringify(sampleFields, null, 2));
}

if (!fs.existsSync(validationRulesPath)) {
  // Sample validation rule data
  const sampleValidationRules = [
    {
      "apiName": "LLC_BI__Loan_Amount_Validation",
      "active": true,
      "description": "Ensures loan amount is positive",
      "errorConditionFormula": "LLC_BI__Amount__c <= 0",
      "errorMessage": "Loan amount must be greater than zero.",
      "errorDisplayField": "LLC_BI__Amount__c"
    },
    {
      "apiName": "LLC_BI__Status_Complete_Check",
      "active": true,
      "description": "Validates required fields when status is Complete",
      "errorConditionFormula": "AND(ISPICKVAL(LLC_BI__Status__c, 'Complete'), ISBLANK(LLC_BI__CloseDate__c))",
      "errorMessage": "Close Date is required when Status is Complete.",
      "errorDisplayField": "LLC_BI__CloseDate__c"
    },
    {
      "apiName": "nc_Loan_Admin_Bypass",
      "active": true,
      "description": "Validation rule with admin bypass",
      "errorConditionFormula": "AND(ISPICKVAL(LLC_BI__Status__c, 'Pending'), $Profile.Name != 'System Administrator')",
      "errorMessage": "Only administrators can save loans in Pending status.",
      "errorDisplayField": "LLC_BI__Status__c"
    }
  ];
  
  fs.writeFileSync(validationRulesPath, JSON.stringify(sampleValidationRules, null, 2));
}

if (!fs.existsSync(triggersPath)) {
  // Sample trigger data
  const sampleTriggers = [
    {
      "name": "LLC_BI__LoanTrigger",
      "active": true,
      "content": `trigger LLC_BI__LoanTrigger on LLC_BI__Loan__c (before insert, before update) {
  // Skip processing if user has bypass permission
  if (FeatureManagement.checkPermission('Bypass_Loan_Trigger')) {
    return;
  }
  
  // Main trigger logic
  if (Trigger.isBefore && Trigger.isInsert) {
    LoanTriggerHandler.handleBeforeInsert(Trigger.new);
  } else if (Trigger.isBefore && Trigger.isUpdate) {
    LoanTriggerHandler.handleBeforeUpdate(Trigger.new, Trigger.oldMap);
  }
}`
    },
    {
      "name": "LLC_BI__LoanStatusTrigger",
      "active": true,
      "content": `trigger LLC_BI__LoanStatusTrigger on LLC_BI__Loan__c (after update) {
  // Skip for specific admin users
  Set<Id> bypAssUsers = new Set<Id>{'005000000000001', '005000000000002'};
  if (bypAssUsers.contains(UserInfo.getUserId())) {
    return;
  }
  
  // Process status changes
  if (Trigger.isAfter && Trigger.isUpdate) {
    for (LLC_BI__Loan__c loan : Trigger.new) {
      LLC_BI__Loan__c oldLoan = Trigger.oldMap.get(loan.Id);
      if (loan.LLC_BI__Status__c != oldLoan.LLC_BI__Status__c) {
        LoanStatusHandler.processStatusChange(loan, oldLoan);
      }
    }
  }
}`
    }
  ];
  
  fs.writeFileSync(triggersPath, JSON.stringify(sampleTriggers, null, 2));
}

// Initialize the analyzer
async function runExample() {
  console.log('Running nCino Analyzer example...');
  
  try {
    // Create analyzer instance
    const analyzer = new nCinoAnalyzer({
      apiKey: process.env.CLAUDE_API_KEY, // Make sure to set this environment variable
      outputDir: path.join(__dirname, 'examples', 'output')
    });
    
    await analyzer.initialize();
    
    // Run analysis on sample data
    const results = await analyzer.runCompleteAnalysis({
      fieldsPath: fieldsPath,
      validationRulesPath: validationRulesPath,
      triggersPath: triggersPath
    });
    
    console.log('Analysis completed successfully!');
    console.log(`Results saved to: ${path.join(__dirname, 'examples', 'output')}`);
    
    // Display a summary of the analysis
    console.log('\nAnalysis Summary:');
    console.log('=================');
    console.log('Field naming convention analysis: Complete');
    console.log('Validation rule bypass pattern analysis: Complete');
    console.log('Apex trigger bypass pattern analysis: Complete');
    console.log('Comprehensive report generated');
    
  } catch (error) {
    console.error('Error running example:', error.message);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  runExample();
}

module.exports = runExample;