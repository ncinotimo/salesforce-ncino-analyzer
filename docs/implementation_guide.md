# Building a Claude-powered Salesforce analyzer

This guide outlines a complete implementation approach for creating a Claude-based prototype to analyze Salesforce/nCino configurations, with a focus on the Loan object. The report covers extraction methods, prompt engineering techniques, analysis patterns, and reporting strategies.

## Bottom line up front

To build an effective Claude-based analyzer for Salesforce/nCino configurations, you'll need to extract metadata using SFDX or VS Code, structure XML-tagged prompts for Claude that chunk complex metadata into manageable pieces, implement specific detection patterns for naming conventions and bypass logic, and generate executive summaries with visualization dashboards tailored to different audiences. The implementation should follow a multi-phase approach starting with metadata extraction, processing the data into Claude-friendly formats, designing specialized prompts for different analysis types, and creating visualization templates for executive reporting.

## Metadata extraction techniques

### SFDX command-line approach

SFDX provides the most efficient way to extract comprehensive metadata for analysis. For the nCino Loan object:

```bash
# Create a package.xml file for targeted extraction
sfdx force:source:manifest:create --fromorg your-org-alias --manifestname=ncino_loan --include "CustomObject:LLC_BI__Loan__c"

# Extract the metadata
sfdx force:source:retrieve -x ./manifest/ncino_loan.xml -u your-org-alias
```

For a more **comprehensive extraction** including related components:

```bash
# Extract Loan object with related metadata
sfdx force:source:retrieve -m "CustomObject:LLC_BI__Loan__c,ApexClass,ApexTrigger,Flow,ValidationRule,CustomField:LLC_BI__Loan__c.*" -u your-org-alias
```

### VS Code extraction workflow

VS Code with Salesforce Extensions provides a GUI-based approach:

1. Install VS Code and Salesforce Extension Pack
2. Connect to your org via the command palette (`Ctrl+Shift+P` > "SFDX: Authorize an Org")
3. Use the Org Browser to navigate to LLC_BI__Loan__c
4. Right-click and select "Retrieve Source"
5. Select related components like fields, validation rules, and triggers

### SOQL queries for specific components

Use SOQL queries to target specific metadata components:

```sql
-- Find all custom fields on the Loan object
SELECT Id, DeveloperName, NamespacePrefix, DataType, Description 
FROM FieldDefinition 
WHERE EntityDefinition.QualifiedApiName = 'LLC_BI__Loan__c'
```

```sql
-- Extract validation rules
SELECT Id, ValidationName, Active, ErrorMessage, Description, ErrorDisplayField
FROM ValidationRule
WHERE EntityDefinitionId IN (
    SELECT Id FROM EntityDefinition WHERE QualifiedApiName = 'LLC_BI__Loan__c'
)
```

### Converting metadata to Claude-friendly formats

Claude performs better with structured, simplified formats rather than raw XML:

1. **Use a Node.js script** to convert XML to JSON:

```javascript
const fs = require('fs');
const xml2js = require('xml2js');

const parser = new xml2js.Parser({ explicitArray: false });

fs.readFile('path/to/metadata.xml', 'utf8', (err, data) => {
  if (err) return console.error(err);

  parser.parseString(data, (err, result) => {
    if (err) return console.error(err);
    
    const json = JSON.stringify(result, null, 2);
    fs.writeFile('metadata.json', json, 'utf8', err => {
      if (err) console.error(err);
    });
  });
});
```

2. **Flatten complex hierarchies** into CSV for simpler analysis:

```javascript
// Convert field metadata to CSV
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const csvWriter = createCsvWriter({
  path: 'loan_fields.csv',
  header: [
    {id: 'fieldName', title: 'API Name'},
    {id: 'label', title: 'Label'},
    {id: 'type', title: 'Data Type'},
    {id: 'namespace', title: 'Namespace'},
    {id: 'description', title: 'Description'}
  ]
});

// Write flattened records
csvWriter.writeRecords(records);
```

## Prompt engineering for Salesforce metadata analysis

### XML structure for hierarchical metadata

Claude performs best with XML-tagged prompts that mirror Salesforce's hierarchical structure:

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

### Chunking strategies for large metadata sets

Break down large metadata into manageable chunks:

1. **Component-based chunking**:
   ```
   <analysis_request>
     <metadata_type>CustomObjects</metadata_type>
     <specific_components>
       <component>LLC_BI__Loan__c</component>
     </specific_components>
     <analysis_focus>Field naming conventions</analysis_focus>
   </analysis_request>
   ```

2. **Functional chunking**:
   ```
   <metadata_analysis>
     <chunk_type>Validation Rules</chunk_type>
     <components>
       <!-- Include validation rule metadata -->
     </components>
     <analysis_focus>Bypass pattern detection</analysis_focus>
   </metadata_analysis>
   ```

### Multi-turn conversation design

Structure metadata analysis as a progressive conversation:

**Turn 1: Initial Analysis**
```
<initial_analysis>
  <summary_request>
    Provide a high-level overview of the LLC_BI__Loan__c metadata including field count by type, validation rule count, and potential areas of concern.
  </summary_request>
  
  <metadata>
    <!-- Include high-level metadata -->
  </metadata>
</initial_analysis>
```

**Turn 2: Detailed Investigation**
```
<detailed_analysis>
  <focus_area>Validation Rules</focus_area>
  <specific_metadata>
    <!-- Include validation rule metadata -->
  </specific_metadata>
  <request>
    Analyze these validation rules for bypass patterns and security concerns.
  </request>
</detailed_analysis>
```

## Analyzing naming conventions

### Detection criteria for naming conventions

Create specific detection patterns for Claude to identify:

```
<naming_convention_analysis>
  <convention_rules>
    <rule>
      <pattern>LLC_BI__*</pattern>
      <description>Managed package fields from nCino</description>
      <expected>True</expected>
    </rule>
    <rule>
      <pattern>nc_*</pattern>
      <description>Custom project-specific fields</description>
      <expected>True</expected>
    </rule>
    <rule>
      <pattern>^[a-z].*</pattern>
      <description>Fields should not start with lowercase letters</description>
      <expected>False</expected>
    </rule>
  </convention_rules>
  
  <metadata>
    <!-- Include field metadata -->
  </metadata>
  
  <analysis_request>
    Analyze these fields against our naming conventions and identify violations.
  </analysis_request>
</naming_convention_analysis>
```

### Implementation for the Loan object

For the nCino Loan object, specify naming conventions specific to its implementation:

```
<loan_object_conventions>
  <standard_patterns>
    <pattern>LLC_BI__Loan__c</pattern>
    <pattern>LLC_BI__*__c</pattern>
  </standard_patterns>
  
  <custom_patterns>
    <pattern>nc_Loan_*__c</pattern>
    <pattern>nc_*__c</pattern>
  </custom_patterns>
  
  <invalid_patterns>
    <pattern>Loan_*</pattern>
    <pattern>loan_*</pattern>
    <pattern>*__X</pattern>
  </invalid_patterns>
</loan_object_conventions>
```

## Detecting bypass patterns

### Validation rule bypass detection

Claude can analyze validation rules for bypass patterns using this approach:

```
<bypass_pattern_detection>
  <patterns_to_detect>
    <pattern>
      <name>Profile-based bypass</name>
      <regex>$Profile.Name\s*=[=!]=</regex>
      <severity>Medium</severity>
    </pattern>
    <pattern>
      <name>Custom permission bypass</name>
      <regex>NOT\(\$Permission\.[^)]+\)</regex>
      <severity>Low</severity>
    </pattern>
    <pattern>
      <name>User ID bypass</name>
      <regex>$User.Id\s*=[=!]=</regex>
      <severity>High</severity>
    </pattern>
  </patterns_to_detect>
  
  <validation_rules>
    <!-- Include validation rule formulas -->
  </validation_rules>
  
  <analysis_request>
    Identify all instances of bypass patterns in these validation rules, assess their implementation quality, and recommend improvements.
  </analysis_request>
</bypass_pattern_detection>
```

### Flow bypass detection

For detecting bypass patterns in Flows:

```
<flow_bypass_detection>
  <flow_metadata>
    <!-- Include flow metadata -->
  </flow_metadata>
  
  <patterns_to_detect>
    <pattern>
      <location>Start Element</location>
      <condition>$Permission.Exclude_Flow</condition>
      <recommended_check>NOT($Permission.Exclude_Flow)</recommended_check>
    </pattern>
    <pattern>
      <location>Decision Element</location>
      <condition>$Permission.Exclude_Flow</condition>
    </pattern>
  </patterns_to_detect>
</flow_bypass_detection>
```

### Apex trigger bypass detection

For Apex triggers, Claude can look for these patterns:

```
<apex_bypass_detection>
  <apex_code>
    <!-- Include Apex trigger code -->
  </apex_code>
  
  <patterns_to_detect>
    <pattern>
      <method>FeatureManagement.checkPermission</method>
      <permission_name>Exclude_Trigger</permission_name>
      <recommended_implementation>return !FeatureManagement.checkPermission('Exclude_Trigger');</recommended_implementation>
    </pattern>
    <pattern>
      <custom_setting>Trigger_Setting__c</custom_setting>
    </pattern>
    <pattern>
      <hardcoded_ids>User IDs or Profile IDs</hardcoded_ids>
      <severity>High</severity>
    </pattern>
  </patterns_to_detect>
</apex_bypass_detection>
```

## Executive summary and visualization design

### Dashboard structure for different audiences

Design three distinct dashboard levels:

1. **Executive dashboard**:
   - Overall health score (0-100)
   - Trend indicators showing change over time
   - Top 5 critical findings with business impact
   - Risk breakdown by category
   - Summary recommendations

2. **Manager dashboard**:
   - Department-specific metrics
   - Compliance percentages by area
   - Issue count by priority
   - Projected remediation effort
   - Component-specific health scores

3. **Technical dashboard**:
   - Detailed component-level metrics
   - Specific violation details
   - Code-level recommendations
   - Implementation guidelines
   - Technical debt mapping

### Key metrics and KPIs

The most effective metrics for configuration health include:

1. **Naming convention metrics**:
   - Percentage of compliant components
   - Non-compliant component count by type
   - Severity breakdown of naming issues

2. **Security metrics**:
   - Bypass pattern count by type
   - Security permission misuse
   - Profile-based bypass count
   - User-specific bypass count

3. **Technical debt metrics**:
   - Custom code complexity score
   - Unused component percentage
   - Modification risk assessment
   - Technical debt hours estimate

4. **Performance metrics**:
   - Query optimization score
   - Trigger complexity rating
   - Field indexing effectiveness
   - Automation efficiency score

### Visualization recommendations

Effective visualization types include:

1. **Heat maps** for naming convention compliance by object
2. **Radar charts** for overall system health across dimensions
3. **Trend lines** showing health scores over time
4. **Bubble charts** plotting complexity against usage frequency
5. **Dependency diagrams** showing relationship between components

## Implementation roadmap

### Phase 1: Metadata extraction and processing

1. Set up SFDX project structure
2. Create package.xml templates for different metadata types
3. Develop scripts to extract and convert metadata to Claude-friendly formats
4. Implement chunking logic for large metadata sets

### Phase 2: Claude prompt development

1. Design base prompt templates for different analysis types
2. Create specialized prompts for naming convention analysis
3. Develop bypass pattern detection prompts
4. Implement multi-turn conversation flows

### Phase 3: Analysis engine development

1. Build the orchestration layer to manage metadata flow
2. Implement Claude API integration
3. Develop parsing logic for Claude's responses
4. Create result aggregation and scoring system

### Phase 4: Visualization and reporting

1. Design executive summary templates
2. Develop data visualization components
3. Implement dashboard generation logic
4. Create export functionality for reports

## Conclusion

A Claude-based analyzer for Salesforce/nCino configurations provides powerful insights into org health, compliance with best practices, and potential security risks. By following the structured approach outlined in this report—extracting metadata with SFDX, designing specialized Claude prompts, implementing detection patterns for naming conventions and bypass logic, and creating tailored visualizations—organizations can effectively analyze complex Salesforce/nCino implementations and maintain high-quality configurations. The key to success is the systematic combination of metadata extraction, prompt engineering, and visualization design into a coherent analysis workflow.