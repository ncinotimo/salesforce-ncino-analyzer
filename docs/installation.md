# Using the Claude-powered Salesforce/nCino Analyzer

This guide explains how to use the Salesforce/nCino Analyzer directly within Claude.

## Overview

The Salesforce/nCino Analyzer uses an MCP (Model-Controller-Presenter) architecture where:

1. **Presenter (Claude)**: You interact directly with Claude, which collects inputs, triggers the analysis, and formats results into user-friendly reports.

2. **Controller**: Behind the scenes, the analyzer coordinates the extraction of metadata, invokes the analyzers, and manages the workflow.

3. **Model**: Core analyzers process the metadata, detect patterns, and generate findings.

## How to Use the Analyzer

### Option 1: Upload Metadata Files

You can upload Salesforce/nCino metadata files directly to Claude for analysis:

1. Export your metadata files from Salesforce using SFDX, Workbench, or VS Code
2. Upload the files to Claude (supported formats: JSON, XML, CSV)
3. Ask Claude to analyze your Salesforce/nCino configuration

Example prompts:

```
Can you analyze these Salesforce field metadata files for naming convention violations?
```

```
Please check these validation rules for bypass patterns.
```

### Option 2: Provide Salesforce Org Credentials

You can provide your Salesforce org credentials for direct extraction:

```
Can you analyze my nCino Loan object configuration? Here are my Salesforce credentials:
Username: your-username@example.com
Password: your-password
```

Or using a session ID:

```
Please analyze my Salesforce configuration using this session info:
Instance URL: https://yourinstance.my.salesforce.com
Access Token: 00D...
```

### Option 3: Provide Raw JSON Data

You can directly paste JSON metadata into your conversation with Claude:

```
Can you analyze these nCino field definitions?

[
  {
    "apiName": "LLC_BI__Amount__c",
    "label": "Loan Amount",
    "type": "Currency",
    "description": "The total amount of the loan."
  },
  {
    "apiName": "customField__c",
    "label": "Custom Field",
    "type": "Text",
    "description": "A custom field with non-compliant naming."
  }
]
```

## Analysis Types

You can specify which types of analysis you want to perform:

1. **Naming Convention Analysis**: Checks field naming against nCino standards
2. **Validation Rule Analysis**: Detects bypass patterns in validation rules
3. **Apex Trigger Analysis**: Identifies security issues in triggers

Example:

```
Please analyze my Salesforce metadata, focusing only on naming conventions and validation rules (skip the trigger analysis).
```

## Understanding the Results

The analyzer provides results in multiple sections:

1. **Executive Summary**: High-level overview with key findings and risk assessment
2. **Overall Score**: Numeric score (0-100) rating your configuration health
3. **Detailed Findings**: Specific issues found in your configuration
4. **Recommendations**: Prioritized list of actions to improve your configuration
5. **Visualizations**: Charts and graphs illustrating the findings

## Tips for Best Results

- Upload specific metadata files rather than entire package.xml extracts
- If analyzing a large org, focus on one object or component type at a time
- For naming convention analysis, include field metadata with API names and types
- For validation rule analysis, ensure formulas are included in the metadata
- For trigger analysis, include the full trigger code, not just metadata

## Example Workflow

1. Extract your Salesforce metadata:
   ```bash
   sfdx force:source:retrieve -m "CustomObject:LLC_BI__Loan__c,CustomField:LLC_BI__Loan__c.*,ValidationRule:LLC_BI__Loan__c.*" -u your-org-alias
   ```

2. Upload the extracted metadata files to Claude

3. Ask Claude to analyze your configuration:
   ```
   Can you analyze these Salesforce/nCino configuration files and identify any issues with naming conventions or security patterns?
   ```

4. Review the analysis results

5. Ask follow-up questions about specific findings or recommendations:
   ```
   Can you explain more about the bypass pattern you found in the LLC_BI__Loan_Status_Validation rule?
   ```