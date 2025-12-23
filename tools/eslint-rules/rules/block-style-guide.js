/**
 * ESLint rule to enforce OpenOps block style guide for displayName and description fields
 * 
 * Rules enforced:
 * 1. displayName must be Title Case (first letter of each word capitalized)
 * 2. description must use Sentence case (starts with capital letter, no period unless multiple sentences)
 * 3. displayName and description must NOT be the same or too similar
 * 4. Every description must be filled in (non-empty)
 * 5. Action displayNames should use verb forms (e.g., "Get", "Create", "Send")
 */

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce OpenOps block style guide for displayName and description fields',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: 'code',
    schema: [],
    messages: {
      displayNameNotTitleCase: 'displayName "{{value}}" should be in Title Case',
      descriptionNotSentenceCase: 'description "{{value}}" should start with a capital letter (Sentence case)',
      descriptionTrailingPeriod: 'description "{{value}}" should not end with a period (unless multiple sentences)',
      descriptionEmpty: 'description must not be empty',
      displayNameDescriptionSimilar: 'displayName and description are too similar - they should be distinct',
      actionDisplayNameNotVerb: 'Action displayName "{{value}}" should start with a verb (e.g., "Get", "Create", "Send")',
    },
  },

  create(context) {
    const sourceCode = context.getSourceCode();

    /**
     * Check if a string is in Title Case
     */
    function isTitleCase(str) {
      if (!str) return false;
      
      // List of words that should remain lowercase in Title Case (unless first word)
      const lowercaseWords = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'via', 'with']);
      
      const words = str.split(/\s+/);
      
      return words.every((word, index) => {
        if (!word) return true;
        
        // Handle words in parentheses or with special characters
        if (word.includes('(') || word.includes('/')) {
          return true; // Skip validation for complex words
        }
        
        // Check if word is all caps (acronym) - that's allowed
        if (word === word.toUpperCase() && word.length > 1) {
          return true;
        }
        
        // First word should always be capitalized
        if (index === 0) {
          return word[0] === word[0].toUpperCase();
        }
        
        // Check if it's a lowercase exception word
        const cleanWord = word.replace(/[^a-zA-Z]/g, '').toLowerCase();
        if (lowercaseWords.has(cleanWord)) {
          return word[0] === word[0].toLowerCase() || word[0] === word[0].toUpperCase();
        }
        
        // Otherwise, should start with capital
        return word[0] === word[0].toUpperCase();
      });
    }

    /**
     * Check if a string is in Sentence case
     */
    function isSentenceCase(str) {
      if (!str) return false;
      return str[0] === str[0].toUpperCase();
    }

    /**
     * Check if description has trailing period (only for single sentences)
     */
    function hasInvalidTrailingPeriod(str) {
      if (!str || !str.endsWith('.')) return false;
      
      // Count periods to detect multiple sentences
      const periodCount = (str.match(/\.\s+[A-Z]/g) || []).length;
      
      // If only one period at the end and no other sentence markers, it's invalid
      return periodCount === 0;
    }

    /**
     * Calculate similarity between two strings (Levenshtein distance ratio)
     */
    function calculateSimilarity(str1, str2) {
      if (!str1 || !str2) return 0;
      
      const s1 = str1.toLowerCase().replace(/[^a-z0-9\s]/g, '');
      const s2 = str2.toLowerCase().replace(/[^a-z0-9\s]/g, '');
      
      if (s1 === s2) return 1;
      
      const maxLen = Math.max(s1.length, s2.length);
      const distance = levenshteinDistance(s1, s2);
      
      return 1 - (distance / maxLen);
    }

    /**
     * Levenshtein distance calculation
     */
    function levenshteinDistance(str1, str2) {
      const matrix = [];
      
      for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
      }
      
      for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
      }
      
      for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
          if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
            matrix[i][j] = matrix[i - 1][j - 1];
          } else {
            matrix[i][j] = Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1
            );
          }
        }
      }
      
      return matrix[str2.length][str1.length];
    }

    /**
     * Check if displayName starts with an action verb
     */
    function startsWithActionVerb(str) {
      if (!str) return false;
      
      const actionVerbs = [
        'Get', 'Create', 'Update', 'Delete', 'Send', 'Fetch', 'Execute', 'Run',
        'Add', 'Remove', 'List', 'Search', 'Find', 'Move', 'Copy', 'Upload',
        'Download', 'Generate', 'Parse', 'Format', 'Convert', 'Transform',
        'Validate', 'Verify', 'Check', 'Test', 'Deploy', 'Build', 'Install',
        'Trigger', 'Wait', 'Delay', 'Forward', 'Apply', 'Modify', 'Enable',
        'Disable', 'Start', 'Stop', 'Restart', 'Pause', 'Resume', 'Cancel'
      ];
      
      return actionVerbs.some(verb => str.startsWith(verb + ' ') || str === verb);
    }

    /**
     * Check if this is likely an action definition
     */
    function isActionContext(node) {
      // Check if we're in a createAction or Action.create call
      let parent = node.parent;
      while (parent) {
        if (parent.type === 'CallExpression' && parent.callee) {
          const callee = sourceCode.getText(parent.callee);
          if (callee.includes('createAction') || callee.includes('Action.create')) {
            return true;
          }
        }
        parent = parent.parent;
      }
      return false;
    }

    /**
     * Main validation function for object properties
     */
    function validateBlockFields(node) {
      if (node.type !== 'ObjectExpression') return;
      
      let displayNameProp = null;
      let descriptionProp = null;
      
      // Find displayName and description properties
      for (const prop of node.properties) {
        if (prop.type === 'Property' && prop.key.type === 'Identifier') {
          if (prop.key.name === 'displayName') {
            displayNameProp = prop;
          } else if (prop.key.name === 'description') {
            descriptionProp = prop;
          }
        }
      }
      
      // Validate displayName
      if (displayNameProp && displayNameProp.value.type === 'Literal') {
        const displayName = displayNameProp.value.value;
        
        if (displayName && typeof displayName === 'string') {
          // Check Title Case
          if (!isTitleCase(displayName)) {
            context.report({
              node: displayNameProp.value,
              messageId: 'displayNameNotTitleCase',
              data: { value: displayName },
            });
          }
          
          // Check if action context and starts with verb
          if (isActionContext(node) && !startsWithActionVerb(displayName)) {
            context.report({
              node: displayNameProp.value,
              messageId: 'actionDisplayNameNotVerb',
              data: { value: displayName },
            });
          }
        }
      }
      
      // Validate description
      if (descriptionProp && descriptionProp.value.type === 'Literal') {
        const description = descriptionProp.value.value;
        
        if (typeof description === 'string') {
          // Check not empty
          if (!description || description.trim() === '') {
            context.report({
              node: descriptionProp.value,
              messageId: 'descriptionEmpty',
            });
          } else {
            // Check Sentence case
            if (!isSentenceCase(description)) {
              context.report({
                node: descriptionProp.value,
                messageId: 'descriptionNotSentenceCase',
                data: { value: description },
              });
            }
            
            // Check trailing period
            if (hasInvalidTrailingPeriod(description)) {
              context.report({
                node: descriptionProp.value,
                messageId: 'descriptionTrailingPeriod',
                data: { value: description },
              });
            }
          }
        }
      }
      
      // Check similarity between displayName and description
      if (displayNameProp && descriptionProp && 
          displayNameProp.value.type === 'Literal' && 
          descriptionProp.value.type === 'Literal') {
        
        const displayName = displayNameProp.value.value;
        const description = descriptionProp.value.value;
        
        if (displayName && description && 
            typeof displayName === 'string' && 
            typeof description === 'string') {
          
          const similarity = calculateSimilarity(displayName, description);
          
          // If similarity is above 80%, they're too similar
          if (similarity > 0.8) {
            context.report({
              node: descriptionProp.value,
              messageId: 'displayNameDescriptionSimilar',
            });
          }
        }
      }
    }

    return {
      ObjectExpression: validateBlockFields,
    };
  },
};
