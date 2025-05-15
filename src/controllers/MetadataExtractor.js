/**
 * MetadataExtractor.js
 * Controller component for extracting Salesforce metadata
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const xml2js = require('xml2js');
const csv = require('csv-parser');

class MetadataExtractor {
  constructor(options = {}) {
    this.options = options;
    this.tempDir = options.tempDir || path.join(__dirname, '../../temp');
    
    // Create temp directory if it doesn't exist
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Extract metadata from a Salesforce org
   * @param {Object} credentials - Salesforce org credentials
   * @returns {Object} Extracted metadata
   */
  async extractMetadata(credentials) {
    try {
      console.log('Extracting metadata from Salesforce org...');
      
      // Create a unique directory for this extraction
      const extractionId = `extraction_${Date.now()}`;
      const extractionDir = path.join(this.tempDir, extractionId);
      fs.mkdirSync(extractionDir, { recursive: true });
      
      // Authenticate with Salesforce
      await this.authenticateWithSalesforce(credentials, extractionDir);
      
      // Extract the metadata
      await this.extractLoanObjectMetadata(extractionDir);
      
      // Process the extracted metadata
      const metadata = await this.processExtractedMetadata(extractionDir);
      
      return metadata;
    } catch (error) {
      console.error('Error extracting metadata:', error);
      throw error;
    }
  }
  
  /**
   * Authenticate with Salesforce using provided credentials
   * @param {Object} credentials - Salesforce org credentials
   * @param {string} workingDir - Working directory for the operation
   */
  async authenticateWithSalesforce(credentials, workingDir) {
    // Create a temporary auth file
    const authFile = path.join(workingDir, 'auth.json');
    fs.writeFileSync(authFile, JSON.stringify(credentials), 'utf8');
    
    try {
      // Authenticate using SFDX
      if (credentials.username && credentials.password) {
        // Username-password flow
        console.log(`Authenticating as ${credentials.username}...`);
        execSync(
          `sfdx force:auth:sfdxurl:store -f ${authFile} -a temp_auth`, 
          { cwd: workingDir, stdio: 'pipe' }
        );
      } else if (credentials.instanceUrl && credentials.accessToken) {
        // Session ID flow
        console.log(`Authenticating to ${credentials.instanceUrl}...`);
        const authUrl = `force://${credentials.instanceUrl}?sessionId=${credentials.accessToken}`;
        fs.writeFileSync(authFile, authUrl, 'utf8');
        execSync(
          `sfdx force:auth:sfdxurl:store -f ${authFile} -a temp_auth`, 
          { cwd: workingDir, stdio: 'pipe' }
        );
      } else {
        throw new Error('Insufficient credentials provided. Need username+password or instanceUrl+accessToken.');
      }
      
      console.log('Authentication successful');
    } catch (error) {
      console.error('Authentication failed:', error.message);
      throw new Error(`Salesforce authentication failed: ${error.message}`);
    } finally {
      // Remove the auth file
      if (fs.existsSync(authFile)) {
        fs.unlinkSync(authFile);
      }
    }
  }
  
  /**
   * Extract nCino Loan object metadata
   * @param {string} workingDir - Working directory for the operation
   */
  async extractLoanObjectMetadata(workingDir) {
    // Create manifest directory
    const manifestDir = path.join(workingDir, 'manifest');
    fs.mkdirSync(manifestDir, { recursive: true });
    
    // Create package.xml for nCino Loan object
    const packageXml = `<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
    <types>
        <members>LLC_BI__Loan__c</members>
        <name>CustomObject</name>
    </types>
    <types>
        <members>LLC_BI__Loan__c.*</members>
        <name>CustomField</name>
    </types>
    <types>
        <members>LLC_BI__Loan__c.*</members>
        <name>ValidationRule</name>
    </types>
    <version>56.0</version>
</Package>`;

    const packageXmlPath = path.join(manifestDir, 'package.xml');
    fs.writeFileSync(packageXmlPath, packageXml, 'utf8');
    
    // Create a directory for the retrieved metadata
    const retrieveDir = path.join(workingDir, 'retrieved');
    fs.mkdirSync(retrieveDir, { recursive: true });
    
    try {
      // Extract metadata using SFDX
      console.log('Retrieving nCino Loan object metadata...');
      execSync(
        `sfdx force:source:retrieve -x ${packageXmlPath} -r ${retrieveDir}`, 
        { cwd: workingDir, stdio: 'pipe' }
      );
      
      // Extract triggers separately
      console.log('Retrieving Apex triggers...');
      execSync(
        `sfdx force:source:retrieve -m "ApexTrigger:LLC_BI__Loan*" -r ${retrieveDir}`, 
        { cwd: workingDir, stdio: 'pipe' }
      );
      
      console.log('Metadata extraction completed');
    } catch (error) {
      console.error('Metadata extraction failed:', error.message);
      throw new Error(`Metadata extraction failed: ${error.message}`);
    }
  }
  
  /**
   * Process the extracted metadata files
   * @param {string} workingDir - Working directory with extracted metadata
   * @returns {Object} Processed metadata
   */
  async processExtractedMetadata(workingDir) {
    const metadata = {
      fields: [],
      validationRules: [],
      triggers: []
    };
    
    const retrieveDir = path.join(workingDir, 'retrieved');
    const objectsDir = path.join(retrieveDir, 'objects');
    const loanObjectDir = path.join(objectsDir, 'LLC_BI__Loan__c');
    
    // Process fields
    const fieldsDir = path.join(loanObjectDir, 'fields');
    if (fs.existsSync(fieldsDir)) {
      const fieldFiles = fs.readdirSync(fieldsDir).filter(file => file.endsWith('.field-meta.xml'));
      
      for (const fieldFile of fieldFiles) {
        const fieldPath = path.join(fieldsDir, fieldFile);
        const fieldXml = fs.readFileSync(fieldPath, 'utf8');
        const fieldObj = await this.parseXml(fieldXml);
        
        if (fieldObj && fieldObj.CustomField) {
          metadata.fields.push({
            apiName: fieldFile.replace('.field-meta.xml', ''),
            label: fieldObj.CustomField.label || '',
            type: fieldObj.CustomField.type || '',
            description: fieldObj.CustomField.description || '',
            required: fieldObj.CustomField.required === 'true',
            formula: fieldObj.CustomField.formula || '',
            referenceTo: fieldObj.CustomField.referenceTo || '',
            length: fieldObj.CustomField.length || '',
            unique: fieldObj.CustomField.unique === 'true'
          });
        }
      }
    }
    
    // Process validation rules
    const validationRulesDir = path.join(loanObjectDir, 'validationRules');
    if (fs.existsSync(validationRulesDir)) {
      const validationFiles = fs.readdirSync(validationRulesDir).filter(file => file.endsWith('.validationRule-meta.xml'));
      
      for (const validationFile of validationFiles) {
        const validationPath = path.join(validationRulesDir, validationFile);
        const validationXml = fs.readFileSync(validationPath, 'utf8');
        const validationObj = await this.parseXml(validationXml);
        
        if (validationObj && validationObj.ValidationRule) {
          metadata.validationRules.push({
            apiName: validationFile.replace('.validationRule-meta.xml', ''),
            active: validationObj.ValidationRule.active === 'true',
            description: validationObj.ValidationRule.description || '',
            errorConditionFormula: validationObj.ValidationRule.errorConditionFormula || '',
            errorMessage: validationObj.ValidationRule.errorMessage || '',
            errorDisplayField: validationObj.ValidationRule.errorDisplayField || ''
          });
        }
      }
    }
    
    // Process triggers
    const triggersDir = path.join(retrieveDir, 'triggers');
    if (fs.existsSync(triggersDir)) {
      const triggerFiles = fs.readdirSync(triggersDir).filter(file => 
        file.startsWith('LLC_BI__Loan') && file.endsWith('.trigger'));
      
      for (const triggerFile of triggerFiles) {
        const triggerPath = path.join(triggersDir, triggerFile);
        const triggerContent = fs.readFileSync(triggerPath, 'utf8');
        
        // Get the metadata file
        const metaFile = triggerFile + '-meta.xml';
        const metaPath = path.join(triggersDir, metaFile);
        let isActive = true;
        
        if (fs.existsSync(metaPath)) {
          const metaContent = fs.readFileSync(metaPath, 'utf8');
          const metaObj = await this.parseXml(metaContent);
          
          if (metaObj && metaObj.ApexTrigger) {
            isActive = metaObj.ApexTrigger.status !== 'Inactive';
          }
        }
        
        metadata.triggers.push({
          name: triggerFile.replace('.trigger', ''),
          content: triggerContent,
          active: isActive
        });
      }
    }
    
    return metadata;
  }
  
  /**
   * Parse XML string to JavaScript object
   * @param {string} xml - XML content
   * @returns {Object} Parsed object
   */
  async parseXml(xml) {
    return new Promise((resolve, reject) => {
      const parser = new xml2js.Parser({ explicitArray: false });
      parser.parseString(xml, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }
  
  /**
   * Convert XML to JSON
   * @param {string} xml - XML content
   * @returns {Object} Converted JSON
   */
  async convertXmlToJson(xml) {
    try {
      const result = await this.parseXml(xml);
      return result;
    } catch (error) {
      console.error('Error converting XML to JSON:', error);
      throw error;
    }
  }
  
  /**
   * Parse a CSV file
   * @param {string} filePath - Path to the CSV file
   * @returns {Array} Parsed CSV data
   */
  async parseCsvFile(filePath) {
    return new Promise((resolve, reject) => {
      const results = [];
      
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => {
          resolve(results);
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }
}

module.exports = MetadataExtractor;