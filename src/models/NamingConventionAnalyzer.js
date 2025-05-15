/**
 * NamingConventionAnalyzer.js
 * Model component for analyzing Salesforce field naming conventions
 */

class NamingConventionAnalyzer {
  constructor() {
    this.conventionRules = [
      {
        pattern: /^LLC_BI__/,
        description: "Managed package fields from nCino",
        expected: true
      },
      {
        pattern: /^nc_/,
        description: "Custom project-specific fields",
        expected: true
      },
      {
        pattern: /^[a-z]/,
        description: "Fields should not start with lowercase letters",
        expected: false
      }
    ];

    this.loanObjectConventions = {
      standardPatterns: [
        /^LLC_BI__Loan__c$/,
        /^LLC_BI__.*__c$/
      ],
      customPatterns: [
        /^nc_Loan_.*__c$/,
        /^nc_.*__c$/
      ],
      invalidPatterns: [
        /^Loan_/,
        /^loan_/,
        /__X$/
      ]
    };
  }

  /**
   * Analyze field metadata for naming convention compliance
   * @param {Array} fields - Array of field metadata objects
   * @returns {Object} Analysis results
   */
  analyzeFields(fields) {
    if (!fields || !Array.isArray(fields)) {
      throw new Error('Field data must be provided as an array');
    }

    const results = {
      violations: [],
      compliantFieldCount: 0,
      totalFieldCount: fields.length,
      bySeverity: {
        critical: [],
        medium: [],
        low: []
      }
    };

    // Analyze each field
    fields.forEach(field => {
      const apiName = field.apiName || field.fullName || '';
      const violations = [];

      // Check against convention rules
      this.conventionRules.forEach(rule => {
        const matches = rule.pattern.test(apiName);
        if ((rule.expected && !matches) || (!rule.expected && matches)) {
          violations.push({
            rule: rule.description,
            pattern: rule.pattern.toString(),
            expected: rule.expected
          });
        }
      });

      // Check against Loan object specific patterns
      if (apiName.includes('Loan') || apiName.includes('loan')) {
        // Check if it's not following standard patterns
        const isStandard = this.loanObjectConventions.standardPatterns.some(pattern => pattern.test(apiName));
        const isCustom = this.loanObjectConventions.customPatterns.some(pattern => pattern.test(apiName));
        const hasInvalidPattern = this.loanObjectConventions.invalidPatterns.some(pattern => pattern.test(apiName));

        if (!isStandard && !isCustom && apiName.includes('Loan')) {
          violations.push({
            rule: "Loan-related fields must follow standard or custom patterns",
            severity: "critical"
          });
        }

        if (hasInvalidPattern) {
          violations.push({
            rule: "Field uses an invalid naming pattern",
            severity: "critical"
          });
        }
      }

      // If violations were found, add to results
      if (violations.length > 0) {
        const fieldViolation = {
          apiName,
          label: field.label || '',
          type: field.type || '',
          violations,
          recommendedFix: this.generateRecommendation(apiName, violations)
        };

        // Assign severity
        const severity = this.determineSeverity(violations);
        results.bySeverity[severity].push(fieldViolation);
        results.violations.push(fieldViolation);
      } else {
        results.compliantFieldCount++;
      }
    });

    // Calculate compliance percentage
    results.compliancePercentage = Math.round((results.compliantFieldCount / results.totalFieldCount) * 100);

    return results;
  }

  /**
   * Determine the overall severity of violations
   * @param {Array} violations - Violations found for a field
   * @returns {string} Severity level: 'critical', 'medium', or 'low'
   */
  determineSeverity(violations) {
    if (violations.some(v => v.severity === 'critical')) {
      return 'critical';
    }
    if (violations.some(v => v.rule.includes('Loan') || v.rule.includes('standard patterns'))) {
      return 'critical';
    }
    if (violations.some(v => v.rule.includes('custom project-specific'))) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Generate a recommended fix for naming convention violations
   * @param {string} apiName - Current API name
   * @param {Array} violations - Violations found
   * @returns {string} Recommended fix
   */
  generateRecommendation(apiName, violations) {
    let recommendation = '';
    
    // Check for lowercase starting violations
    if (violations.some(v => v.rule.includes('lowercase'))) {
      const firstChar = apiName.charAt(0);
      recommendation = `Change first character '${firstChar}' to uppercase: '${firstChar.toUpperCase() + apiName.slice(1)}'`;
    }
    // Check for missing prefixes
    else if (violations.some(v => v.rule.includes('Managed package') || v.rule.includes('Custom project-specific'))) {
      if (apiName.includes('Loan') && !apiName.startsWith('LLC_BI__') && !apiName.startsWith('nc_')) {
        recommendation = `Add 'nc_' prefix: 'nc_${apiName}'`;
      } else {
        recommendation = `Add appropriate prefix ('LLC_BI__' for managed package fields or 'nc_' for custom fields)`;
      }
    }
    // Check for invalid patterns
    else if (violations.some(v => v.rule.includes('invalid'))) {
      if (apiName.endsWith('__X')) {
        recommendation = `Remove '__X' suffix: '${apiName.replace('__X', '__c')}'`;
      } else if (apiName.startsWith('loan_')) {
        recommendation = `Change to 'nc_Loan_${apiName.slice(5)}'`;
      } else {
        recommendation = `Rename to follow standard pattern (LLC_BI__*__c) or custom pattern (nc_*__c)`;
      }
    }
    
    return recommendation || 'Review field naming and apply appropriate convention';
  }

  /**
   * Generate a summary report of naming convention compliance
   * @param {Object} results - Analysis results
   * @returns {Object} Summary report
   */
  generateSummaryReport(results) {
    return {
      totalFields: results.totalFieldCount,
      compliantFields: results.compliantFieldCount,
      compliancePercentage: results.compliancePercentage,
      violationCount: results.violations.length,
      criticalViolations: results.bySeverity.critical.length,
      mediumViolations: results.bySeverity.medium.length,
      lowViolations: results.bySeverity.low.length,
      topIssues: this.identifyTopIssues(results.violations),
      recommendations: this.generateGeneralRecommendations(results)
    };
  }

  /**
   * Identify the most common violation types
   * @param {Array} violations - All violations found
   * @returns {Array} Top issues
   */
  identifyTopIssues(violations) {
    const issueTypes = {};
    
    violations.forEach(v => {
      v.violations.forEach(issue => {
        const ruleDesc = issue.rule;
        if (!issueTypes[ruleDesc]) {
          issueTypes[ruleDesc] = 0;
        }
        issueTypes[ruleDesc]++;
      });
    });
    
    return Object.entries(issueTypes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([rule, count]) => ({ rule, count }));
  }

  /**
   * Generate general recommendations based on analysis results
   * @param {Object} results - Analysis results
   * @returns {Array} General recommendations
   */
  generateGeneralRecommendations(results) {
    const recommendations = [];
    
    if (results.bySeverity.critical.length > 0) {
      recommendations.push(
        "Immediately address critical naming violations to prevent potential conflicts and maintenance issues"
      );
    }
    
    if (results.compliancePercentage < 70) {
      recommendations.push(
        "Create and document clear naming conventions and socialize with team"
      );
      recommendations.push(
        "Consider implementing automated validation for field naming during development"
      );
    }
    
    if (results.bySeverity.critical.length === 0 && results.bySeverity.medium.length > 0) {
      recommendations.push(
        "Address medium-severity naming issues in next planned refactoring cycle"
      );
    }
    
    recommendations.push(
      "Regularly review and audit field naming as part of maintenance practices"
    );
    
    return recommendations;
  }
}

module.exports = NamingConventionAnalyzer;