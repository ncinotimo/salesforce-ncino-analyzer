# Claude-powered Salesforce/nCino Analyzer

This project implements a Claude-based prototype to analyze Salesforce/nCino configurations, with a focus on the Loan object. The analyzer extracts metadata, applies Claude's LLM capabilities for analysis, and generates comprehensive reports on configuration health.

## Features

- Extract metadata using SFDX or VS Code
- Analyze naming conventions and detect violations
- Identify bypass patterns in validation rules, flows, and Apex triggers
- Generate executive summaries with visualization dashboards

## Getting Started

See the [documentation](./docs/) for detailed implementation instructions.

## Project Structure

```
├── docs/                    # Documentation files
├── scripts/                 # Extraction and processing scripts
├── prompts/                 # Claude prompt templates
├── templates/               # Dashboard and report templates
├── src/                     # Core implementation code
└── examples/                # Example outputs and configurations
```

## License

MIT
