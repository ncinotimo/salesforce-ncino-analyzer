# Developer Guide: Extending the Claude-powered Salesforce/nCino Analyzer

This guide provides technical information for developers who want to extend or customize the Salesforce/nCino Analyzer.

## Architecture Overview

The analyzer follows an MCP (Model-Controller-Presenter) architecture:

```
┌─────────────┐      ┌─────────────────┐      ┌─────────────┐
│  Presenter  │◄────►│    Controller   │◄────►│    Model    │
│  (Claude)   │      │  (Coordination) │      │ (Analysis)  │
└─────────────┘      └─────────────────┘      └─────────────┘
```

### Presenter Layer (Claude Integration)

The `ClaudeIntegration` class in `src/integrations/ClaudeIntegration.js` serves as the presenter layer. It:

- Receives user input from Claude
- Formats the input for the controller
- Receives analysis results from the controller
- Formats the results into a user-friendly presentation for Claude to display

### Controller Layer

The controller layer consists of two main components:

1. `AnalysisController` (`src/controllers/AnalysisController.js`): Coordinates the entire analysis process
2. `MetadataExtractor` (`src/controllers/MetadataExtractor.js`): Handles extraction of metadata from Salesforce

The controller is responsible for:
- Parsing user input
- Extracting or processing metadata
- Invoking the appropriate analyzers
- Consolidating results
- Generating comprehensive reports

### Model Layer

The model layer contains the core analysis logic:

1. `NamingConventionAnalyzer` (`src/models/NamingConventionAnalyzer.js`): Analyzes field naming conventions
2. `BypassPatternAnalyzer` (`src/models/BypassPatternAnalyzer.js`): Detects bypass patterns in validation rules and triggers

Each analyzer implements its own detection patterns and scoring algorithms.

## Entry Point

The main entry point for Claude is `claudeAnalyzer.js`. This file exports a single function that Claude calls when a user requests an analysis.

## Adding New Analyzer Types

To add a new type of analysis (e.g., SOQL query analysis):

1. Create a new analyzer class in `src/models/`:

```javascript
class SoqlAnalyzer {
  constructor() {
    this.queryPatterns = [
      // Define patterns to detect
    ];
  }

  analyzeSoqlQueries(queries) {
    // Implement analysis logic
    return {
      // Return results
    };
  }
}
```

2. Update the `AnalysisController` to include your new analyzer:

```javascript
// Import your new analyzer
const SoqlAnalyzer = require('../models/SoqlAnalyzer');

class AnalysisController {
  constructor(options = {}) {
    // Add your analyzer to the controller
    this.soqlAnalyzer = new SoqlAnalyzer();
    // ...
  }

  async performAnalyses(inputData) {
    // Add your analysis type
    if (inputData.soqlQueries) {
      try {
        results.soqlQueries = this.soqlAnalyzer.analyzeSoqlQueries(inputData.soqlQueries);
        // Add any additional processing
      } catch (error) {
        console.error('Error analyzing SOQL queries:', error);
        results.soqlQueriesError = error.message;
      }
    }
    // ...
  }
}
```

3. Update `ClaudeIntegration` to format the new results type:

```javascript
formatDetailedFindings(findings) {
  // Add section for your new analysis type
  if (findings.soqlQueries) {
    formattedFindings += `\n### SOQL Query Analysis\n\n`;
    // Format the findings for display
  }
}
```

## Modifying Detection Patterns

To modify existing detection patterns:

### Naming Conventions

Edit the `conventionRules` and `loanObjectConventions` properties in `NamingConventionAnalyzer.js`:

```javascript
constructor() {
  this.conventionRules = [
    {
      pattern: /^YOUR_NEW_PATTERN__/,
      description: "Your custom pattern description",
      expected: true
    },
    // ...
  ];
}
```

### Bypass Patterns

Edit the pattern arrays in `BypassPatternAnalyzer.js`:

```javascript
constructor() {
  this.validationRulePatterns = [
    {
      name: "Your new pattern",
      regex: /YOUR_REGEX_PATTERN/,
      severity: "Medium",
      description: "Description of the pattern",
      recommendedApproach: "Recommended fix"
    },
    // ...
  ];
}
```

## Customizing Result Formatting

To customize how results are presented to users:

1. Edit the formatting methods in `ClaudeIntegration.js`:
   - `formatExecutiveSummary()`
   - `formatOverallScore()`
   - `formatDetailedFindings()`

2. Modify the visualization data preparation methods:
   - `prepareVisualizationData()`
   - `prepareScoreChartData()`
   - `prepareIssueBreakdownData()`

## Testing Your Changes

1. Create test metadata files in the `examples/` directory
2. Update `example.js` to use your test data
3. Run the example:

```bash
node example.js
```

## Adding Support for New Metadata Types

To add support for new metadata types (e.g., Custom Labels):

1. Update `MetadataExtractor.js` to extract and process the new metadata type
2. Add a new field to the `metadata` object in `processExtractedMetadata()`
3. Create a new analyzer or extend an existing one to handle the new metadata type
4. Update `AnalysisController.js` to invoke the analyzer with the new metadata

## Packaging Your Changes

When you're ready to share your changes:

1. Update the version number in `package.json`
2. Update the documentation in `docs/`
3. Create a pull request to the main repository

## Best Practices

1. Maintain clear separation between the layers (Model, Controller, Presenter)
2. Add thorough commenting to explain detection patterns and logic
3. Include fail-safes for handling invalid or unexpected input
4. Add error handling at each level of the application
5. Respect user privacy by handling credentials securely
6. Avoid hard-coding values that might change between organizations

## Contributing

Contributions are welcome! Before submitting a pull request:

1. Ensure your code maintains the existing architecture
2. Add appropriate documentation
3. Test your changes with various metadata inputs
4. Follow the existing code style