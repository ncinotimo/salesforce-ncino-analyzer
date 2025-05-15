#!/usr/bin/env node

/**
 * ncino-metadata-extractor.js
 * 
 * This script extracts nCino metadata from a Salesforce org
 * and formats it for Claude analysis.
 * 
 * Usage: 
 *   node ncino-metadata-extractor.js --org your-org-alias --output ./output
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const xml2js = require('xml2js');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

// Parse command line arguments
const args = process.argv.slice(2);
let orgAlias = '';
let outputDir = './output';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--org' && i + 1 < args.length) {
    orgAlias = args[i + 1];
    i++;
  } else if (args[i] === '--output' && i + 1 < args.length) {
    outputDir = args[i + 1];
    i++;
  }
}

if (!orgAlias) {
  console.error('Please provide an org alias using --org');
  process.exit(1);
}

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Create manifest directory if it doesn't exist
const manifestDir = path.join(outputDir, 'manifest');
if (!fs.existsSync(manifestDir)) {
  fs.mkdirSync(manifestDir, { recursive: true });
}

console.log(`Extracting nCino Loan metadata from ${orgAlias}...`);

// Create package.xml for nCino Loan object
const loanPackageXml = `<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
    <types>
        <members>LLC_BI__Loan__c</members>
        <name>CustomObject</name>
    </types>
    <types>
        <members>LLC_BI__Loan__c.*</members>
        <name>CustomField</name>
    </types>
    <version>56.0</version>
</Package>`;

const loanPackagePath = path.join(manifestDir, 'ncino_loan.xml');
fs.writeFileSync(loanPackagePath, loanPackageXml);

try {
  // Extract metadata using SFDX
  console.log('Retrieving Loan object and fields...');
  execSync(`sfdx force:source:retrieve -x ${loanPackagePath} -u ${orgAlias} -w 10`, { stdio: 'inherit' });
  
  // Extract validation rules
  console.log('Retrieving validation rules...');
  execSync(`sfdx force:source:retrieve -m "ValidationRule:LLC_BI__Loan__c.*" -u ${orgAlias} -w 10`, { stdio: 'inherit' });
  
  // Extract Apex triggers
  console.log('Retrieving Apex triggers...');
  execSync(`sfdx force:source:retrieve -m "ApexTrigger:LLC_BI__Loan*" -u ${orgAlias} -w 10`, { stdio: 'inherit' });
  
  // Extract Flows
  console.log('Retrieving Flows...');
  execSync(`sfdx force:source:retrieve -m "Flow:LLC_BI__Loan*" -u ${orgAlias} -w 10`, { stdio: 'inherit' });
  
  // Process extracted metadata
  console.log('Processing metadata...');
  
  // Get path to the extracted metadata files
  const extractedDir = './force-app/main/default';
  const objectsDir = path.join(extractedDir, 'objects');
  const loanObjectDir = path.join(objectsDir, 'LLC_BI__Loan__c');
  const fieldsDir = path.join(loanObjectDir, 'fields');
  
  // Process field metadata
  if (fs.existsSync(fieldsDir)) {
    processFieldMetadata(fieldsDir, outputDir);
  } else {
    console.warn('No field metadata found');
  }
  
  // Process validation rules
  const validationRulesDir = path.join(loanObjectDir, 'validationRules');
  if (fs.existsSync(validationRulesDir)) {
    processValidationRules(validationRulesDir, outputDir);
  } else {
    console.warn('No validation rules found');
  }
  
  // Process triggers
  const triggersDir = path.join(extractedDir, 'triggers');
  if (fs.existsSync(triggersDir)) {
    processTriggers(triggersDir, outputDir);
  } else {
    console.warn('No triggers found');
  }
  
  // Process flows
  const flowsDir = path.join(extractedDir, 'flows');
  if (fs.existsSync(flowsDir)) {
    processFlows(flowsDir, outputDir);
  } else {
    console.warn('No flows found');
  }
  
  console.log(`Metadata extraction complete. Results saved to ${outputDir}`);
  
} catch (error) {
  console.error('Error extracting metadata:', error.message);
  process.exit(1);
}

/**
 * Process field metadata
 */
function processFieldMetadata(fieldsDir, outputDir) {
  console.log('Processing field metadata...');
  const fieldFiles = fs.readdirSync(fieldsDir).filter(file => file.endsWith('.field-meta.xml'));
  const fieldData = [];
  
  fieldFiles.forEach(fieldFile => {
    const fieldPath = path.join(fieldsDir, fieldFile);
    const fieldXml = fs.readFileSync(fieldPath, 'utf8');
    
    try {
      const parser = new xml2js.Parser({ explicitArray: false });
      parser.parseString(fieldXml, (err, result) => {
        if (err) {
          console.error(`Error parsing ${fieldFile}:`, err);
          return;
        }
        
        const fieldObj = result.CustomField;
        fieldData.push({
          apiName: fieldFile.replace('.field-meta.xml', ''),
          label: fieldObj.label || '',
          type: fieldObj.type || '',
          description: fieldObj.description || '',
          required: fieldObj.required === 'true',
          formula: fieldObj.formula || '',
          referenceTo: fieldObj.referenceTo || '',
          length: fieldObj.length || '',
          unique: fieldObj.unique === 'true'
        });
      });
    } catch (e) {
      console.error(`Error processing ${fieldFile}:`, e.message);
    }
  });
  
  // Export as CSV
  const csvPath = path.join(outputDir, 'loan_fields.csv');
  const csvWriter = createCsvWriter({
    path: csvPath,
    header: [
      { id: 'apiName', title: 'API Name' },
      { id: 'label', title: 'Label' },
      { id: 'type', title: 'Data Type' },
      { id: 'description', title: 'Description' },
      { id: 'required', title: 'Required' },
      { id: 'formula', title: 'Formula' },
      { id: 'referenceTo', title: 'Reference To' },
      { id: 'length', title: 'Length' },
      { id: 'unique', title: 'Unique' }
    ]
  });
  
  csvWriter.writeRecords(fieldData)
    .then(() => console.log(`Field metadata saved to ${csvPath}`));
  
  // Export as JSON
  const jsonPath = path.join(outputDir, 'loan_fields.json');
  fs.writeFileSync(jsonPath, JSON.stringify(fieldData, null, 2));
  console.log(`Field metadata saved to ${jsonPath}`);
}

/**
 * Process validation rules
 */
function processValidationRules(validationRulesDir, outputDir) {
  console.log('Processing validation rules...');
  const validationFiles = fs.readdirSync(validationRulesDir).filter(file => file.endsWith('.validationRule-meta.xml'));
  const validationData = [];
  
  validationFiles.forEach(validationFile => {
    const validationPath = path.join(validationRulesDir, validationFile);
    const validationXml = fs.readFileSync(validationPath, 'utf8');
    
    try {
      const parser = new xml2js.Parser({ explicitArray: false });
      parser.parseString(validationXml, (err, result) => {
        if (err) {
          console.error(`Error parsing ${validationFile}:`, err);
          return;
        }
        
        const validationObj = result.ValidationRule;
        validationData.push({
          apiName: validationFile.replace('.validationRule-meta.xml', ''),
          active: validationObj.active === 'true',
          description: validationObj.description || '',
          errorConditionFormula: validationObj.errorConditionFormula || '',
          errorMessage: validationObj.errorMessage || '',
          errorDisplayField: validationObj.errorDisplayField || ''
        });
      });
    } catch (e) {
      console.error(`Error processing ${validationFile}:`, e.message);
    }
  });
  
  // Export as JSON
  const jsonPath = path.join(outputDir, 'validation_rules.json');
  fs.writeFileSync(jsonPath, JSON.stringify(validationData, null, 2));
  console.log(`Validation rules saved to ${jsonPath}`);
}

/**
 * Process Apex triggers
 */
function processTriggers(triggersDir, outputDir) {
  console.log('Processing Apex triggers...');
  const triggerFiles = fs.readdirSync(triggersDir).filter(file => 
    file.startsWith('LLC_BI__Loan') && file.endsWith('.trigger'));
  
  const triggerData = [];
  
  triggerFiles.forEach(triggerFile => {
    const triggerPath = path.join(triggersDir, triggerFile);
    const triggerContent = fs.readFileSync(triggerPath, 'utf8');
    
    // Get the metadata file
    const metaFile = triggerFile + '-meta.xml';
    const metaPath = path.join(triggersDir, metaFile);
    let isActive = true;
    
    if (fs.existsSync(metaPath)) {
      const metaContent = fs.readFileSync(metaPath, 'utf8');
      try {
        const parser = new xml2js.Parser({ explicitArray: false });
        parser.parseString(metaContent, (err, result) => {
          if (err) {
            console.error(`Error parsing ${metaFile}:`, err);
            return;
          }
          
          isActive = result.ApexTrigger.status !== 'Inactive';
        });
      } catch (e) {
        console.error(`Error processing ${metaFile}:`, e.message);
      }
    }
    
    triggerData.push({
      name: triggerFile.replace('.trigger', ''),
      content: triggerContent,
      active: isActive
    });
  });
  
  // Export as JSON
  const jsonPath = path.join(outputDir, 'loan_triggers.json');
  fs.writeFileSync(jsonPath, JSON.stringify(triggerData, null, 2));
  console.log(`Triggers saved to ${jsonPath}`);
}

/**
 * Process flows
 */
function processFlows(flowsDir, outputDir) {
  console.log('Processing flows...');
  const flowFiles = fs.readdirSync(flowsDir).filter(file => 
    file.startsWith('LLC_BI__Loan') && file.endsWith('.flow-meta.xml'));
  
  const flowData = [];
  
  flowFiles.forEach(flowFile => {
    const flowPath = path.join(flowsDir, flowFile);
    const flowXml = fs.readFileSync(flowPath, 'utf8');
    
    try {
      const parser = new xml2js.Parser();
      parser.parseString(flowXml, (err, result) => {
        if (err) {
          console.error(`Error parsing ${flowFile}:`, err);
          return;
        }
        
        const flowObj = result.Flow;
        const flowInfo = {
          apiName: flowFile.replace('.flow-meta.xml', ''),
          status: flowObj.status ? flowObj.status[0] : 'Unknown',
          processType: flowObj.processType ? flowObj.processType[0] : 'Unknown',
          startElementReference: flowObj.startElementReference ? flowObj.startElementReference[0] : '',
          elements: []
        };
        
        // Extract decision elements to check for bypass patterns
        if (flowObj.decisions && flowObj.decisions.length > 0) {
          flowObj.decisions.forEach(decision => {
            flowInfo.elements.push({
              type: 'Decision',
              name: decision.name ? decision.name[0] : 'Unknown',
              rules: decision.rules ? decision.rules.map(rule => ({
                name: rule.name ? rule.name[0] : 'Unknown',
                conditions: rule.conditions ? rule.conditions.map(condition => ({
                  leftValueReference: condition.leftValueReference ? condition.leftValueReference[0] : '',
                  operator: condition.operator ? condition.operator[0] : '',
                  rightValue: condition.rightValue ? condition.rightValue[0] : ''
                })) : []
              })) : []
            });
          });
        }
        
        flowData.push(flowInfo);
      });
    } catch (e) {
      console.error(`Error processing ${flowFile}:`, e.message);
    }
  });
  
  // Export as JSON
  const jsonPath = path.join(outputDir, 'loan_flows.json');
  fs.writeFileSync(jsonPath, JSON.stringify(flowData, null, 2));
  console.log(`Flows saved to ${jsonPath}`);
}
