# Installation and Usage Guide

This guide provides step-by-step instructions for installing and using the nCino Analyzer tool.

## Prerequisites

Before using the nCino Analyzer, ensure you have the following:

1. Node.js v14.0.0 or later
2. Salesforce CLI (SFDX) installed
3. Access to a Salesforce org with nCino installed
4. Claude API key for analysis (Anthropic's Claude model)

## Installation

1. Clone the repository:

```bash
git clone https://github.com/ncinotimo/salesforce-ncino-analyzer.git
cd salesforce-ncino-analyzer
```

2. Install dependencies:

```bash
npm install
```

3. Set up your Claude API key as an environment variable:

```bash
# For Linux/macOS
export CLAUDE_API_KEY=your_claude_api_key_here

# For Windows Command Prompt
set CLAUDE_API_KEY=your_claude_api_key_here

# For Windows PowerShell
$env:CLAUDE_API_KEY="your_claude_api_key_here"
```

## Step 1: Extract nCino Metadata

Use the metadata extraction script to pull configuration data from your Salesforce org:

```bash
# Connect to your Salesforce org first
sfdx force:auth:web:login -a YourOrgAlias

# Run the metadata extraction
node scripts/ncino-metadata-extractor.js --org YourOrgAlias --output ./output
```

This will extract:
- The nCino Loan object and its fields
- Validation rules
- Apex triggers
- Flows

The extracted metadata will be saved to the `./output` directory in both raw form and Claude-friendly formats.

## Step 2: Run the Analysis

Once metadata extraction is complete, run the analyzer:

```bash
node src/cli.js --fields ./output/loan_fields.json --validation-rules ./output/validation_rules.json --triggers ./output/loan_triggers.json
```

### Options:

```
--api-key <key>             Claude API key (if not set as environment variable)
--fields <path>             Path to fields JSON file
--validation-rules <path>   Path to validation rules JSON file
--triggers <path>           Path to triggers JSON file
--output-dir <path>         Directory to store output files (default: ./output)
--prompt-dir <path>         Directory containing prompt templates (default: ./prompts)
--skip-naming               Skip naming convention analysis
--skip-validation           Skip validation rule analysis
--skip-triggers             Skip Apex trigger analysis
```

## Step 3: Review the Analysis Results

After running the analyzer, the following output files will be generated in the output directory:

1. `naming_convention_analysis.md` - Analysis of field naming conventions
2. `validation_rule_analysis.md` - Analysis of validation rule bypass patterns
3. `apex_trigger_analysis.md` - Analysis of Apex trigger bypass patterns
4. `comprehensive_report.md` - Consolidated report with all findings and recommendations

## Understanding the Results

The analysis reports contain:

1. **Executive Summary** - High-level overview of findings
2. **Specific Violations** - Detailed list of items that don't conform to best practices
3. **Recommendations** - Specific suggestions for improvement
4. **Overall Scores** - Assessment of compliance across different dimensions

## Customizing the Analysis

You can customize the analysis criteria by modifying the prompt templates in the `prompts/` directory:

- `naming_convention_analysis.xml` - Rules for field naming conventions
- `validation_rule_analysis.xml` - Patterns to detect in validation rules
- `flow_bypass_detection.xml` - Patterns to detect in flows

## Troubleshooting

1. **API Key Issues**: Ensure your Claude API key is correctly set and has sufficient permissions.
2. **Metadata Extraction Failures**: Check that you have the correct permissions in Salesforce and that the nCino package is installed.
3. **Analysis Timeouts**: For large organizations, try analyzing one component at a time using the `--skip-*` options.

## License

This project is licensed under the MIT License - see the LICENSE file for details.