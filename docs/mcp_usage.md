# Using the Salesforce/nCino Analyzer with MCP

This guide explains how to use the Salesforce/nCino Analyzer with the Model Context Protocol (MCP) to connect it to Claude or other LLMs.

## What is MCP?

Model Context Protocol (MCP) is an open-source standard that allows AI models (like Claude) to connect to external systems, data, and tools. By implementing MCP, the Salesforce/nCino Analyzer can be used directly by Claude to analyze Salesforce metadata without needing to build custom integrations.

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Environment Variables

```bash
# Server API key (for security)
export MCP_API_KEY=your-api-key

# Port for the MCP server (default: 3000)
export PORT=3000
```

### 3. Start the MCP Server

```bash
npm start
```

## Connecting to Claude

There are two ways to connect the Salesforce/nCino Analyzer to Claude:

### Option 1: Using the MCP Inspector

1. Start the MCP Inspector: https://inspector.modelcontextprotocol.io/
2. Enter your MCP server URL (e.g., `http://localhost:3000`)
3. Enter your Claude API key
4. Test the connection and explore available resources and tools

### Option 2: Using the Claude.app Integration

1. Navigate to Claude.app
2. Select "Connections" from the settings menu
3. Add a new MCP connection
4. Enter your MCP server URL and API key
5. Start a new conversation and Claude will have access to the Salesforce/nCino Analyzer

## Available Resources

The MCP server exposes the following resources:

1. **salesforce.fields**: Field definitions from Salesforce/nCino objects
2. **salesforce.validationRules**: Validation rule definitions
3. **salesforce.triggers**: Apex trigger definitions

## Available Tools

The MCP server provides the following analysis tools:

1. **salesforce.extractMetadata**: Extract metadata from a Salesforce org
2. **salesforce.analyzeNamingConventions**: Analyze field naming conventions
3. **salesforce.analyzeValidationRules**: Analyze validation rule bypass patterns
4. **salesforce.analyzeApexTriggers**: Analyze Apex trigger bypass patterns 
5. **salesforce.generateReport**: Generate a comprehensive report

## Available Prompts

The MCP server includes these prompt templates:

1. **salesforce.basicAnalysis**: Basic analysis of Salesforce/nCino configuration
2. **salesforce.securityAnalysis**: Security-focused analysis

## Example Usage

Here's how to interact with the Salesforce/nCino Analyzer through Claude:

### Example 1: Basic Analysis

```
Can you analyze my Salesforce/nCino fields for naming convention violations?

I've uploaded my field metadata to the MCP server. Please use the salesforce.analyzeNamingConventions tool to check for issues.
```

### Example 2: Comprehensive Analysis

```
I'd like a comprehensive analysis of my Salesforce/nCino configuration.

Please:
1. Use the salesforce.fields resource to access my field metadata
2. Use the salesforce.validationRules resource to access my validation rules
3. Analyze naming conventions and bypass patterns
4. Generate a comprehensive report
5. Provide recommendations for improvement
```

### Example 3: Direct Salesforce Extraction

```
I'd like you to extract metadata directly from my Salesforce org and analyze it.

Here's my access information:
Instance URL: https://mycompany.my.salesforce.com
Access Token: 00D...

Please use the salesforce.extractMetadata tool to get the metadata, then analyze it for issues.
```

## Using the Client Example

This repository includes a client example that demonstrates how to use the MCP server with Claude:

```bash
npm run client
```

This will:
1. Connect to the MCP server
2. Call various analysis tools
3. Use a prompt template
4. Generate a response from Claude

## MCP Server Configuration

The MCP server configuration can be modified in `server.js`. You can:
- Add additional resources
- Customize analysis tools
- Create new prompt templates

## Security Considerations

1. **API Keys**: Always use MCP API keys to secure your server
2. **Data Protection**: Be cautious when handling Salesforce credentials and metadata
3. **Access Control**: Limit who can connect to your MCP server

## Troubleshooting

### Server Won't Start

- Check if the port is already in use
- Verify environment variables are set correctly

### Connection Issues

- Ensure the server URL is accessible from the client
- Check API keys match between server and client

### Analysis Errors

- Verify the metadata format is correct
- Check log output for specific error messages

## Resources

- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP Inspector](https://inspector.modelcontextprotocol.io/)