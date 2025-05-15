# Salesforce/nCino Analyzer MCP Server

This project implements an MCP (Model Context Protocol) server for analyzing Salesforce/nCino configurations. This server can be connected to Claude or other MCP-compatible LLMs to provide specialized analysis of Salesforce metadata.

## What is MCP?

Model Context Protocol (MCP) is an open-source standard for connecting AI models to systems, data, knowledge, and tools. This project leverages MCP to allow Claude to directly analyze Salesforce/nCino configurations without having to write custom code in the prompt.

## Features

- **Expose Salesforce Metadata Resources**: Provides access to field definitions, validation rules, and Apex triggers
- **Specialized Analysis Tools**: Detect naming convention violations and security bypass patterns
- **Scoring and Recommendations**: Generate health scores and actionable recommendations
- **Interactive Visualizations**: Create charts and diagrams for analysis results

## Architecture

This MCP server follows the MCP specification, providing:

1. **Resources**: Salesforce metadata objects (fields, validation rules, triggers)
2. **Tools**: Specialized analysis functions
3. **Prompts**: Pre-defined templates for common analysis scenarios

## Getting Started

See the [documentation](./docs/) for detailed setup and usage instructions.

## Integration with Claude

This server is designed to be used with Claude through the MCP client. Once connected, Claude can access the specialized analysis capabilities and provide insights in natural language.

## License

MIT
