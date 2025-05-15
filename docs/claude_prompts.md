# Claude Prompt Examples

This document provides example prompts that users can use to interact with the Salesforce/nCino Analyzer through Claude.

## Basic Analysis Request

```
I'd like you to analyze my Salesforce/nCino configuration files. I'll upload my metadata files now.

[User uploads files]

Can you check for naming convention violations and bypass patterns in the validation rules? Please provide a detailed analysis with recommendations for improvement.
```

## Analysis with Specific Focus

```
I've uploaded metadata files from our nCino implementation. Please focus specifically on detecting bypass patterns in the validation rules and triggers. I'm particularly concerned about hardcoded User IDs and Profile-based bypasses. Can you provide a list of all bypass patterns found and rank them by severity?
```

## Providing Salesforce Credentials

```
Can you analyze my Salesforce org for nCino configuration issues? Here are my credentials:

Instance URL: https://mycompany.my.salesforce.com
Access Token: 00D...

Please look specifically at the LLC_BI__Loan__c object fields and validation rules. I want to know if our field naming follows best practices and if our validation rules have any security concerns.
```

## Analyzing Raw JSON Data

```
Can you analyze these nCino fields for naming convention compliance? I'm concerned that our developers aren't following standards.

[
  {
    "apiName": "LLC_BI__Amount__c",
    "label": "Loan Amount",
    "type": "Currency"
  },
  {
    "apiName": "customField__c",
    "label": "Custom Field",
    "type": "Text"
  },
  {
    "apiName": "nc_Loan_Score__c",
    "label": "Loan Score",
    "type": "Number"
  },
  {
    "apiName": "loan_status",
    "label": "Loan Status",
    "type": "Picklist"
  }
]

What naming convention violations do you see, and what would you recommend to fix them?
```

## Follow-up Questions

```
Based on your analysis, which validation rules should we prioritize refactoring? Can you explain why the profile-based bypass in the LLC_BI__Approval_Validation rule is problematic?
```

```
You mentioned we have an overall score of 72/100. What specific improvements would have the biggest impact on raising that score?
```

## Request for Executive Summary

```
I'd like to present your findings to our executive team. Can you provide a concise executive summary of the analysis that highlights the most critical issues and their business impact? Please include 2-3 key recommendations that would provide the greatest security improvements.
```

## Requesting Visualization

```
Can you display the distribution of bypass patterns across our validation rules as a chart or visualization? I'd like to see which patterns are most prevalent.
```

## Combined Analysis with Improvement Plan

```
I've uploaded our nCino metadata files. Could you please:

1. Analyze the naming conventions, validation rules, and triggers
2. Provide an overall health score for our configuration
3. Identify the top 5 most critical issues
4. Create a phased improvement plan with priorities and estimated effort

This will help us plan our technical debt reduction initiatives for next quarter.
```

## Custom Detection Pattern Request

```
Our organization has some specific naming conventions beyond the standard nCino patterns. Can you also check if our fields follow these additional rules?

1. All percentage fields should end with "_Pct__c"
2. All date fields should start with "Date_"
3. All user reference fields should end with "_User__c"

Also, can you check if any of our validation rules contain references to a specific record type "Business_Loan"?
```

## Integration with Development Process

```
We're implementing a new CI/CD process for our Salesforce development. How would you recommend integrating this analyzer into our development workflow? When should these checks run, and how should we handle violations?
```