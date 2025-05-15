/**
 * claudeAnalyzer.js
 * 
 * Entry point for Claude to analyze Salesforce/nCino configurations.
 * This file is designed to be used directly within Claude.
 */

const ClaudeIntegration = require('./src/integrations/ClaudeIntegration');

/**
 * Main function to analyze Salesforce/nCino configurations
 * This function is called by Claude when a user requests an analysis
 * 
 * @param {Object} input - User input parameters
 * @returns {Object} Analysis results formatted for Claude
 */
async function analyzeSalesforceConfig(input = {}) {
  try {
    // Initialize the Claude integration
    const claude = new ClaudeIntegration();
    
    // Process the request and get results
    const results = await claude.processRequest(input);
    
    return results;
  } catch (error) {
    console.error('Error in analyzeSalesforceConfig:', error);
    return {
      error: true,
      message: `There was an error analyzing your Salesforce configuration: ${error.message}`,
      suggestions: [
        "Try uploading your metadata files again",
        "Check that your files contain valid Salesforce/nCino metadata",
        "Try analyzing one component at a time"
      ]
    };
  }
}

/**
 * Example usage for documentation purposes
 */
function exampleUsage() {
  // Upload field metadata
  const fieldsExample = {
    files: [
      {
        name: 'loan_fields.json',
        content: JSON.stringify([
          {
            "apiName": "LLC_BI__Amount__c",
            "label": "Loan Amount",
            "type": "Currency"
          },
          {
            "apiName": "customField__c",
            "label": "Custom Field",
            "type": "Text"
          }
        ])
      }
    ]
  };
  
  // Or provide Salesforce org credentials
  const credentialsExample = {
    orgCredentials: {
      username: 'your-username@example.com',
      password: 'your-password'
    }
  };
  
  // Or provide raw JSON data
  const jsonDataExample = {
    jsonData: {
      fields: [
        {
          "apiName": "LLC_BI__Amount__c",
          "label": "Loan Amount",
          "type": "Currency"
        }
      ]
    }
  };
  
  console.log('Example inputs shown for documentation purposes only');
}

// Export the main function for Claude to use
module.exports = analyzeSalesforceConfig;