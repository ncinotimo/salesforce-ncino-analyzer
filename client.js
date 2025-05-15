/**
 * client.js
 * 
 * Example client that demonstrates how to connect the MCP server to Claude
 */

const { createMcpClient } = require('@modelcontextprotocol/typescript-sdk');
const fs = require('fs');
const path = require('path');

// Configure the MCP client
const client = createMcpClient({
  apiKey: process.env.MCP_API_KEY,
  model: "claude-3-opus-20240229",  // Update with the current Claude model
  serverUrl: process.env.MCP_SERVER_URL || "http://localhost:3000"
});

// Example usage
async function main() {
  try {
    // Connect to the MCP server
    await client.connect();
    
    console.log("Connected to MCP server successfully!");
    
    // Get available resources and tools
    const resources = await client.listResources();
    const tools = await client.listTools();
    const prompts = await client.listPromptTemplates();
    
    console.log(`Available resources: ${resources.map(r => r.id).join(', ')}`);
    console.log(`Available tools: ${tools.map(t => t.id).join(', ')}`);
    console.log(`Available prompts: ${prompts.map(p => p.id).join(', ')}`);
    
    // Example: Load sample field metadata
    const sampleData = loadSampleData();
    
    // Example: Analyze naming conventions
    console.log("\n--- Analyzing naming conventions ---");
    const namingResults = await client.callTool("salesforce.analyzeNamingConventions", {
      fields: sampleData.fields
    });
    
    console.log(`Analysis complete. Compliance: ${namingResults.results.compliancePercentage}%`);
    console.log(`Found ${namingResults.results.violations.length} naming convention violations`);
    
    // Example: Analyze validation rules
    console.log("\n--- Analyzing validation rules ---");
    const validationResults = await client.callTool("salesforce.analyzeValidationRules", {
      validationRules: sampleData.validationRules
    });
    
    console.log(`Analysis complete. Security score: ${validationResults.results.securityScore}/100`);
    console.log(`Found ${validationResults.results.bypassPatterns.length} validation rules with bypass patterns`);
    
    // Example: Generate comprehensive report
    console.log("\n--- Generating comprehensive report ---");
    const reportResults = await client.callTool("salesforce.generateReport", {
      namingResults,
      validationResults
    });
    
    console.log("Report generated successfully!");
    console.log(`Overall score: ${reportResults.report.overallScore.score}/100 (${reportResults.report.overallScore.rating})`);
    
    // Example: Use a prompt template
    console.log("\n--- Using prompt template ---");
    const promptParams = {
      resourceIds: [
        "salesforce.fields",
        "salesforce.validationRules"
      ],
      focus: "Naming convention compliance and security bypass patterns"
    };
    
    const filledPrompt = await client.fillPromptTemplate("salesforce.basicAnalysis", promptParams);
    
    console.log("Prompt template filled successfully!");
    console.log("System prompt:", filledPrompt.systemPrompt.substring(0, 100) + "...");
    console.log("User prompt:", filledPrompt.userPrompt.substring(0, 100) + "...");
    
    // Example: Generate a response from Claude using the MCP server
    console.log("\n--- Generating Claude response ---");
    
    // Create a chat completion
    const completion = await client.createChatCompletion({
      messages: [
        {
          role: "system",
          content: filledPrompt.systemPrompt
        },
        {
          role: "user",
          content: filledPrompt.userPrompt
        }
      ]
    });
    
    console.log("Claude response:", completion.choices[0].message.content.substring(0, 500) + "...");
    
    console.log("\nMCP client example completed successfully!");
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    // Disconnect from the MCP server
    await client.disconnect();
  }
}

// Helper function to load sample data
function loadSampleData() {
  return {
    fields: [
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
    ],
    validationRules: [
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
    ],
    triggers: [
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
      }
    ]
  };
}

// Run the main function
if (require.main === module) {
  main();
}

module.exports = {
  client,
  main
};