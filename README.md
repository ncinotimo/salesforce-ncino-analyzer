# Claude-powered Salesforce/nCino Analyzer (MCP Architecture)

This project implements a Claude-based analyzer for Salesforce/nCino configurations using an MCP (Model-Controller-Presenter) architecture. Users interact directly with Claude, which serves as the presenter layer, while all the complex extraction and analysis happens in the background.

## How It Works

1. **Presenter (Claude)**: Users interact with Claude through the desktop application. Claude collects inputs, triggers the analysis, and formats results into user-friendly reports.

2. **Controller**: Background scripts coordinate the extraction of metadata, invoke the analyzers, and manage the workflow.

3. **Model**: Core analyzers process the metadata, detect patterns, and generate findings.

## Key Features

- Extract metadata using SFDX or VS Code
- Analyze naming conventions and detect violations
- Identify bypass patterns in validation rules, flows, and Apex triggers
- Generate executive summaries with visualization dashboards
- Present all results directly in Claude

## User Workflow

1. User uploads Salesforce/nCino metadata files to Claude or provides org credentials
2. Claude triggers the background analysis process
3. Results are formatted and presented directly in the Claude interface
4. User can ask follow-up questions about the findings

## Project Structure

```
├── docs/                    # Documentation files
├── scripts/                 # Extraction and processing scripts
├── prompts/                 # Claude prompt templates
├── templates/               # Dashboard and report templates
├── src/                     # Core implementation code
│   ├── models/              # Data processing and analysis
│   ├── controllers/         # Workflow management
│   └── integrations/        # Claude API integration
└── examples/                # Example outputs and configurations
```

## License

MIT
