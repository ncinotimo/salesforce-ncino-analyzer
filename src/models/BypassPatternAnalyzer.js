/**
 * BypassPatternAnalyzer.js
 * Model component for detecting bypass patterns in Salesforce configurations
 */

class BypassPatternAnalyzer {
  constructor() {
    this.validationRulePatterns = [
      {
        name: "Profile-based bypass",
        regex: /\$Profile\.Name\s*=[=!]=|CONTAINS\(\$Profile\.Name/,
        severity: "Medium",
        description: "Using Profile.Name to bypass validation rules creates maintenance challenges when profiles change and makes rules difficult to manage at scale.",
        recommendedApproach: "Use custom permissions instead, which are more maintainable and explicit."
      },
      {
        name: "Custom permission bypass",
        regex: /NOT\(\$Permission\.[^)]+\)/,
        severity: "Low",
        description: "Using NOT with permissions is generally acceptable but should be documented and consistently implemented.",
        recommendedApproach: "Ensure permission names are consistently structured with prefixes like 'Bypass_' for clarity."
      },
      {
        name: "User ID bypass",
        regex: /\$User\.Id\s*=[=!]=|CONTAINS\(\$User\.Id/,
        severity: "High",
        description: "Hardcoding specific User IDs creates significant maintenance issues and security risks.",
        recommendedApproach: "Use permission sets, custom permissions, or roles instead of specific User IDs."
      },
      {
        name: "Record Type bypass",
        regex: /RecordType\.Name\s*!=|RecordType\.Name\s*<>/,
        severity: "Medium",
        description: "Explicitly excluding certain record types can create maintenance challenges.",
        recommendedApproach: "Use explicit inclusion rather than exclusion when possible."
      },
      {
        name: "Owner ID bypass",
        regex: /OwnerId\s*=[=!]=\s*\$User\.Id/,
        severity: "Medium",
        description: "Bypassing validation for record owners may create inconsistent data validation.",
        recommendedApproach: "Consider permission-based approaches that don't depend on record ownership."
      }
    ];

    this.apexTriggerPatterns = [
      {
        name: "Feature management permission check",
        regex: /FeatureManagement\.checkPermission\s*\(\s*['"]([^'"]+)['"]\s*\)/,
        severity: "Low",
        description: "Using FeatureManagement to check permissions is recommended, but should be implemented consistently.",
        recommendedApproach: "Use a consistent pattern like return !FeatureManagement.checkPermission('Bypass_Trigger');"
      },
      {
        name: "Custom setting bypass",
        regex: /([A-Za-z0-9_]+__c)\.([A-Za-z0-9_]+__c)/,
        severity: "Medium",
        description: "Using custom settings to control trigger execution can create maintenance challenges.",
        recommendedApproach: "Document the custom setting usage and ensure consistent implementation."
      },
      {
        name: "Hardcoded User ID check",
        regex: /Id\s*==\s*['"]005[A-Za-z0-9]{12,15}['"]/,
        severity: "High",
        description: "Hardcoding User IDs creates significant maintenance issues and security risks.",
        recommendedApproach: "Use permission sets, custom permissions, or roles instead of specific User IDs."
      },
      {
        name: "Profile name check",
        regex: /profile\.name\s*==\s*['"]|userinfo\.getprofileid\(\)\s*==\s*['"]/i,
        severity: "Medium",
        description: "Using profile names or IDs to bypass logic creates maintenance challenges.",
        recommendedApproach: "Use custom permissions instead of relying on profiles."
      }
    ];

    this.flowPatterns = [
      {
        name: "Permission-based bypass",
        locationPattern: /Start|Decision/,
        conditionPattern: /\$Permission\./,
        severity: "Low",
        description: "Using permissions to control flow execution is a recommended pattern when implemented consistently.",
        recommendedApproach: "Use a consistent naming convention for bypass permissions."
      },
      {
        name: "Profile-based bypass",
        locationPattern: /Start|Decision/,
        conditionPattern: /\$Profile\./,
        severity: "Medium",
        description: "Using profiles to control flow execution creates maintenance challenges.",
        recommendedApproach: "Use custom permissions instead of relying on profiles."
      },
      {
        name: "User ID bypass",
        locationPattern: /Start|Decision/,
        conditionPattern: /\$User\.Id/,
        severity: "High",
        description: "Hardcoding User IDs creates significant maintenance issues and security risks.",
        recommendedApproach: "Use permission sets, custom permissions, or roles instead of specific User IDs."
      }
    ];
  }

  /**
   * Analyze validation rules for bypass patterns
   * @param {Array} validationRules - Array of validation rule metadata objects
   * @returns {Object} Analysis results
   */
  analyzeValidationRules(validationRules) {
    if (!validationRules || !Array.isArray(validationRules)) {
      throw new Error('Validation rule data must be provided as an array');
    }

    const results = {
      bypassPatterns: [],
      rulesByPattern: {},
      rulesBySeverity: {
        High: [],
        Medium: [],
        Low: []
      },
      totalRules: validationRules.length,
      rulesWithBypass: 0
    };

    // Initialize pattern tracking
    this.validationRulePatterns.forEach(pattern => {
      results.rulesByPattern[pattern.name] = [];
    });

    // Analyze each validation rule
    validationRules.forEach(rule => {
      const apiName = rule.apiName || rule.fullName || '';
      const formula = rule.errorConditionFormula || rule.formula || '';
      const foundPatterns = [];

      // Check for each bypass pattern
      this.validationRulePatterns.forEach(pattern => {
        if (pattern.regex.test(formula)) {
          foundPatterns.push({
            name: pattern.name,
            severity: pattern.severity,
            description: pattern.description,
            recommendedApproach: pattern.recommendedApproach
          });
          results.rulesByPattern[pattern.name].push(apiName);
        }
      });

      // If patterns were found, add to results
      if (foundPatterns.length > 0) {
        const highestSeverity = this.determineHighestSeverity(foundPatterns);
        const ruleWithPatterns = {
          apiName,
          active: rule.active || false,
          description: rule.description || '',
          patterns: foundPatterns,
          highestSeverity
        };

        results.bypassPatterns.push(ruleWithPatterns);
        results.rulesBySeverity[highestSeverity].push(apiName);
        results.rulesWithBypass++;
      }
    });

    // Calculate percentage of rules with bypass patterns
    results.bypassPercentage = Math.round((results.rulesWithBypass / results.totalRules) * 100);
    
    // Calculate security score (0-100)
    results.securityScore = this.calculateSecurityScore(results);

    return results;
  }

  /**
   * Analyze Apex triggers for bypass patterns
   * @param {Array} triggers - Array of Apex trigger metadata objects
   * @returns {Object} Analysis results
   */
  analyzeApexTriggers(triggers) {
    if (!triggers || !Array.isArray(triggers)) {
      throw new Error('Trigger data must be provided as an array');
    }

    const results = {
      bypassPatterns: [],
      triggersByPattern: {},
      triggersBySeverity: {
        High: [],
        Medium: [],
        Low: []
      },
      totalTriggers: triggers.length,
      triggersWithBypass: 0
    };

    // Initialize pattern tracking
    this.apexTriggerPatterns.forEach(pattern => {
      results.triggersByPattern[pattern.name] = [];
    });

    // Analyze each trigger
    triggers.forEach(trigger => {
      const name = trigger.name || '';
      const code = trigger.content || trigger.code || '';
      const foundPatterns = [];

      // Check for each bypass pattern
      this.apexTriggerPatterns.forEach(pattern => {
        if (pattern.regex.test(code)) {
          foundPatterns.push({
            name: pattern.name,
            severity: pattern.severity,
            description: pattern.description,
            recommendedApproach: pattern.recommendedApproach
          });
          results.triggersByPattern[pattern.name].push(name);
        }
      });

      // If patterns were found, add to results
      if (foundPatterns.length > 0) {
        const highestSeverity = this.determineHighestSeverity(foundPatterns);
        const triggerWithPatterns = {
          name,
          active: trigger.active || false,
          patterns: foundPatterns,
          highestSeverity
        };

        results.bypassPatterns.push(triggerWithPatterns);
        results.triggersBySeverity[highestSeverity].push(name);
        results.triggersWithBypass++;
      }
    });

    // Calculate percentage of triggers with bypass patterns
    results.bypassPercentage = Math.round((results.triggersWithBypass / results.totalTriggers) * 100);
    
    // Calculate security score (0-100)
    results.securityScore = this.calculateSecurityScore(results, 'trigger');

    return results;
  }

  /**
   * Determine the highest severity from a list of patterns
   * @param {Array} patterns - Found patterns with severity levels
   * @returns {string} Highest severity: 'High', 'Medium', or 'Low'
   */
  determineHighestSeverity(patterns) {
    if (patterns.some(p => p.severity === 'High')) {
      return 'High';
    }
    if (patterns.some(p => p.severity === 'Medium')) {
      return 'Medium';
    }
    return 'Low';
  }

  /**
   * Calculate a security score based on the analysis results
   * @param {Object} results - Analysis results
   * @param {string} type - Type of component ('validation' or 'trigger')
   * @returns {number} Security score (0-100)
   */
  calculateSecurityScore(results, type = 'validation') {
    // Start with a perfect score
    let score = 100;
    
    // Determine which results to use based on type
    const componentsWithBypass = type === 'trigger' ? results.triggersWithBypass : results.rulesWithBypass;
    const totalComponents = type === 'trigger' ? results.totalTriggers : results.totalRules;
    const highSeverityComponents = type === 'trigger' ? 
      results.triggersBySeverity.High.length : 
      results.rulesBySeverity.High.length;
    const mediumSeverityComponents = type === 'trigger' ? 
      results.triggersBySeverity.Medium.length : 
      results.rulesBySeverity.Medium.length;
    
    // Deduct for percentage of components with bypass
    const bypassPercentage = (componentsWithBypass / totalComponents) * 100;
    score -= bypassPercentage * 0.3; // Deduct up to 30 points for 100% bypass
    
    // Deduct for high severity issues
    score -= highSeverityComponents * 5; // Deduct 5 points per high severity issue
    
    // Deduct for medium severity issues
    score -= mediumSeverityComponents * 2; // Deduct 2 points per medium severity issue
    
    // Ensure score stays within 0-100 range
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Generate a prioritized list of components to refactor
   * @param {Object} results - Analysis results
   * @param {string} type - Type of component ('validation' or 'trigger')
   * @returns {Array} Prioritized list of components to refactor
   */
  generateRefactoringPriorities(results, type = 'validation') {
    const components = type === 'trigger' ? results.bypassPatterns : results.bypassPatterns;
    
    // Sort by severity (High, Medium, Low) and then by name
    return components.sort((a, b) => {
      const severityOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };
      if (severityOrder[a.highestSeverity] !== severityOrder[b.highestSeverity]) {
        return severityOrder[a.highestSeverity] - severityOrder[b.highestSeverity];
      }
      return (a.apiName || a.name).localeCompare(b.apiName || b.name);
    });
  }

  /**
   * Generate general recommendations based on analysis results
   * @param {Object} results - Analysis results
   * @param {string} type - Type of component ('validation' or 'trigger')
   * @returns {Array} General recommendations
   */
  generateGeneralRecommendations(results, type = 'validation') {
    const recommendations = [];
    
    // Common recommendations
    recommendations.push(
      "Implement a consistent approach to bypass logic across all components"
    );
    
    recommendations.push(
      "Use custom permissions instead of profiles or user IDs for bypass logic"
    );
    
    recommendations.push(
      "Document all bypass mechanisms in a central location for security review"
    );
    
    // Type-specific recommendations
    if (type === 'validation') {
      if (results.rulesBySeverity.High.length > 0) {
        recommendations.push(
          "Immediately refactor validation rules with hardcoded User IDs"
        );
      }
      
      if (results.bypassPercentage > 50) {
        recommendations.push(
          "Review overall validation strategy to reduce reliance on bypass patterns"
        );
      }
    } else if (type === 'trigger') {
      if (results.triggersBySeverity.High.length > 0) {
        recommendations.push(
          "Immediately refactor triggers with hardcoded User IDs or Profile checks"
        );
      }
      
      recommendations.push(
        "Implement a centralized trigger handler framework with consistent bypass logic"
      );
    }
    
    return recommendations;
  }
}

module.exports = BypassPatternAnalyzer;