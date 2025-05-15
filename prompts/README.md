# Claude Prompts for nCino Analyzer

This directory contains prompt templates for different types of nCino/Salesforce metadata analysis.

## Basic Template Structure

Each prompt follows the XML format that Claude works well with:

```
<system>
You are an expert Salesforce developer specializing in nCino implementations with deep knowledge of metadata structures and best practices.
</system>

<ncino_metadata_context>
  <description>
    nCino is a financial services platform built on Salesforce. Key concepts:
    - LLC_BI__ prefix indicates nCino managed package components
    - nc_ prefix indicates custom project-specific fields
    - Loan objects (LLC_BI__Loan__c) are central to the data model
  </description>
</ncino_metadata_context>

<metadata_for_analysis>
<!-- Insert specific nCino metadata here -->
</metadata_for_analysis>

<analysis_request>
  Please analyze this nCino configuration metadata for naming convention violations and bypass patterns.
</analysis_request>
```

## Available Prompt Templates

1. [Naming Convention Analysis](./naming_convention_analysis.xml)
2. [Validation Rule Analysis](./validation_rule_analysis.xml)
3. [Flow Bypass Detection](./flow_bypass_detection.xml)
4. [Apex Trigger Analysis](./apex_trigger_analysis.xml)
5. [Multi-Turn Initial Analysis](./multi_turn_initial.xml)
