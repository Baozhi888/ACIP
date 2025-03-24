/**
 * AdaptiveWindowManager.js
 * 
 * Implements the Adaptive Context Window feature for dynamic context management.
 * Adjusts window size based on task complexity, resource availability, and performance.
 */

/**
 * Window adjustment types
 */
const AdjustmentType = {
  NONE: 'none',           // No adjustment needed
  APPEND: 'append',       // Simple append of new content
  EXPAND: 'expand',       // Window expanded to accommodate more content
  PRUNE: 'prune',         // Some content pruned to make space
  COMPRESS: 'compress',   // Content compressed to reduce size
  PRIORITIZE: 'prioritize' // Content prioritized based on relevance
};

/**
 * Content complexity levels
 */
const ComplexityLevel = {
  LOW: 'low',           // Simple, straightforward content
  MEDIUM: 'medium',     // Moderate complexity
  HIGH: 'high',         // High complexity content
  VERY_HIGH: 'very_high' // Extremely complex content
};

/**
 * Token estimation methods
 */
const TokenEstimation = {
  /**
   * Estimate token count from text (very approximate)
   * @param {string} text - Text to estimate
   * @returns {number} Estimated token count
   */
  estimateTokens: (text) => {
    if (!text) return 0;
    // Very rough estimation (4 chars per token on average)
    return Math.ceil(text.length / 4);
  },
  
  /**
   * Estimate token count for an object
   * @param {Object} obj - Object to estimate
   * @returns {number} Estimated token count
   */
  estimateObjectTokens: (obj) => {
    if (!obj) return 0;
    const json = JSON.stringify(obj);
    return TokenEstimation.estimateTokens(json);
  }
};

/**
 * Adaptive Window Manager class
 * Manages the adaptive context window
 */
class AdaptiveWindowManager {
  /**
   * Constructor
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      initialSize: 4000,  // Initial window size in tokens
      minSize: 1000,      // Minimum window size in tokens
      maxSize: 16000,     // Maximum window size in tokens
      expandFactor: 1.5,  // Factor by which to expand the window
      compressionThreshold: 0.8, // When to start compressing (% of max)
      pruneStrategy: 'oldest-first', // Strategy for pruning: oldest-first, relevance, etc.
      prioritizeStrategy: 'recency', // Strategy for prioritization: recency, relevance, etc.
      adaptToComplexity: true,  // Whether to adapt to content complexity
      ...options
    };
    
    this.logger = options.logger || console;
    
    // Current window state
    this.currentSize = this.options.initialSize;
    this.currentTokenCount = 0;
    this.availableSpace = this.currentSize;
    
    // Statistics for analysis
    this.stats = {
      windowExpansions: 0,
      contentPruned: 0,
      compressionEvents: 0,
      avgWindowSize: this.currentSize,
      windowSizeSamples: 1
    };
  }
  
  /**
   * Get current configuration
   * @returns {Object} Current configuration
   */
  getConfig() {
    return {
      ...this.options,
      currentSize: this.currentSize,
      availableSpace: this.availableSpace,
      currentUtilization: this.currentTokenCount / this.currentSize
    };
  }
  
  /**
   * Add content to the context window
   * @param {ContextModel} context - Context to add content to
   * @param {Object} newContent - New content to add
   * @param {Object} options - Options for adding content
   * @returns {Object} Window status and metrics
   */
  addContent(context, newContent, options = {}) {
    // Get current window content from context
    const window = context.content?.window || [];
    
    // Estimate tokens in new content
    const newContentTokens = TokenEstimation.estimateObjectTokens(newContent);
    
    // Estimate current window token count if not already tracked
    if (this.currentTokenCount === 0 && window.length > 0) {
      this.currentTokenCount = TokenEstimation.estimateObjectTokens(window);
    }
    
    // Detect complexity of the new content
    const complexity = this._detectComplexity(newContent, options.complexity);
    
    // Adjust window size based on complexity if enabled
    if (this.options.adaptToComplexity) {
      this._adjustForComplexity(complexity);
    }
    
    // Check if the new content fits in the available space
    const fitsInWindow = newContentTokens <= this.availableSpace;
    
    // Track what content gets pruned
    let prunedContent = [];
    let adjustmentType = AdjustmentType.APPEND;
    
    // If content fits, simply append it
    if (fitsInWindow) {
      // Append the new content
      window.push({
        ...newContent,
        timestamp: Date.now(),
        tokenCount: newContentTokens
      });
      
      // Update token count
      this.currentTokenCount += newContentTokens;
      this.availableSpace -= newContentTokens;
    } 
    // Otherwise, we need to make space
    else {
      // Check if window expansion is appropriate
      const shouldExpand = this.currentSize < this.options.maxSize && 
        newContentTokens <= (this.options.maxSize - this.currentSize);
      
      // Expand window if appropriate
      if (shouldExpand) {
        this._expandWindow(newContentTokens);
        adjustmentType = AdjustmentType.EXPAND;
        
        // Append the new content
        window.push({
          ...newContent,
          timestamp: Date.now(),
          tokenCount: newContentTokens
        });
        
        // Update token count
        this.currentTokenCount += newContentTokens;
        this.availableSpace -= newContentTokens;
      } 
      // If we can't expand, we need to prune
      else {
        adjustmentType = AdjustmentType.PRUNE;
        prunedContent = this._pruneWindow(window, newContentTokens, options);
        
        // Append the new content
        window.push({
          ...newContent,
          timestamp: Date.now(),
          tokenCount: newContentTokens
        });
        
        // Recalculate current token count
        this.currentTokenCount = TokenEstimation.estimateObjectTokens(window);
        this.availableSpace = this.currentSize - this.currentTokenCount;
      }
    }
    
    // Update stats
    this.stats.avgWindowSize = (
      (this.stats.avgWindowSize * this.stats.windowSizeSamples) + this.currentSize
    ) / (this.stats.windowSizeSamples + 1);
    this.stats.windowSizeSamples++;
    
    if (adjustmentType === AdjustmentType.EXPAND) {
      this.stats.windowExpansions++;
    } else if (adjustmentType === AdjustmentType.PRUNE) {
      this.stats.contentPruned += prunedContent.length;
    }
    
    // Return the updated window and metrics
    return {
      window,
      pruned: prunedContent,
      adjustmentType,
      complexity,
      metrics: {
        currentSize: this.currentSize,
        currentTokenCount: this.currentTokenCount,
        availableSpace: this.availableSpace,
        utilizationPercentage: (this.currentTokenCount / this.currentSize) * 100
      }
    };
  }
  
  /**
   * Expand the window to accommodate more content
   * @param {number} requiredSpace - Required space in tokens
   * @private
   */
  _expandWindow(requiredSpace) {
    // Calculate how much we need to expand
    const minimumNewSize = this.currentSize + requiredSpace;
    
    // Expand by the expand factor, but ensure we have at least the required space
    const expandedSize = Math.max(
      minimumNewSize,
      Math.min(
        this.options.maxSize,
        Math.ceil(this.currentSize * this.options.expandFactor)
      )
    );
    
    // Update the window size
    this.currentSize = expandedSize;
    this.availableSpace = this.currentSize - this.currentTokenCount;
    
    this.logger.info(`Expanded window to ${this.currentSize} tokens`);
  }
  
  /**
   * Prune the window to make space for new content
   * @param {Array} window - Current window content
   * @param {number} requiredSpace - Required space in tokens
   * @param {Object} options - Pruning options
   * @returns {Array} Pruned content
   * @private
   */
  _pruneWindow(window, requiredSpace, options = {}) {
    // Determine how much space we need to free up
    const spaceToFree = requiredSpace - this.availableSpace;
    
    // Make a copy of the window for modification
    const workingWindow = [...window];
    const prunedItems = [];
    let freedSpace = 0;
    
    // Use the appropriate pruning strategy
    const strategy = options.pruneStrategy || this.options.pruneStrategy;
    
    switch (strategy) {
      case 'oldest-first':
        // Sort window items by timestamp (oldest first)
        workingWindow.sort((a, b) => a.timestamp - b.timestamp);
        
        // Remove oldest items until we've freed enough space
        while (freedSpace < spaceToFree && workingWindow.length > 0) {
          const item = workingWindow.shift();
          const itemTokens = item.tokenCount || TokenEstimation.estimateObjectTokens(item);
          
          prunedItems.push(item);
          freedSpace += itemTokens;
        }
        break;
        
      case 'relevance':
        // Sort by relevance score if available, otherwise default to oldest-first
        if (options.relevanceScores) {
          workingWindow.sort((a, b) => 
            (options.relevanceScores[a.id] || 0) - 
            (options.relevanceScores[b.id] || 0)
          );
        } else {
          // Fall back to oldest-first
          workingWindow.sort((a, b) => a.timestamp - b.timestamp);
        }
        
        // Remove least relevant items until we've freed enough space
        while (freedSpace < spaceToFree && workingWindow.length > 0) {
          const item = workingWindow.shift();
          const itemTokens = item.tokenCount || TokenEstimation.estimateObjectTokens(item);
          
          prunedItems.push(item);
          freedSpace += itemTokens;
        }
        break;
        
      default:
        // Default to oldest-first
        workingWindow.sort((a, b) => a.timestamp - b.timestamp);
        
        while (freedSpace < spaceToFree && workingWindow.length > 0) {
          const item = workingWindow.shift();
          const itemTokens = item.tokenCount || TokenEstimation.estimateObjectTokens(item);
          
          prunedItems.push(item);
          freedSpace += itemTokens;
        }
    }
    
    // Update the window to the pruned version
    window.length = 0;
    window.push(...workingWindow);
    
    this.logger.info(`Pruned ${prunedItems.length} items to free ${freedSpace} tokens`);
    
    return prunedItems;
  }
  
  /**
   * Adjust window size based on content complexity
   * @param {string} complexity - Content complexity level
   * @private
   */
  _adjustForComplexity(complexity) {
    const currentMaxSize = this.options.maxSize;
    let complexityFactor = 1.0;
    
    // Set factor based on complexity
    switch (complexity) {
      case ComplexityLevel.LOW:
        complexityFactor = 0.5; // Use smaller window for simple content
        break;
      case ComplexityLevel.MEDIUM:
        complexityFactor = 1.0; // Use normal size for medium complexity
        break;
      case ComplexityLevel.HIGH:
        complexityFactor = 1.5; // Use larger window for complex content
        break;
      case ComplexityLevel.VERY_HIGH:
        complexityFactor = 2.0; // Use maximum window for very complex content
        break;
      default:
        complexityFactor = 1.0;
    }
    
    // Calculate adjusted size, bounded by min and max
    const targetSize = Math.min(
      currentMaxSize,
      Math.max(
        this.options.minSize,
        Math.floor(this.options.initialSize * complexityFactor)
      )
    );
    
    // Only adjust if the difference is significant
    if (Math.abs(targetSize - this.currentSize) / this.currentSize > 0.1) {
      const oldSize = this.currentSize;
      this.currentSize = targetSize;
      this.availableSpace = this.currentSize - this.currentTokenCount;
      
      this.logger.info(
        `Adjusted window from ${oldSize} to ${targetSize} tokens based on ${complexity} complexity`
      );
    }
  }
  
  /**
   * Detect content complexity
   * @param {Object} content - Content to analyze
   * @param {string} [overrideComplexity] - Explicitly provided complexity
   * @returns {string} Complexity level
   * @private
   */
  _detectComplexity(content, overrideComplexity) {
    // If complexity is explicitly provided, use that
    if (overrideComplexity && Object.values(ComplexityLevel).includes(overrideComplexity)) {
      return overrideComplexity;
    }
    
    // Simple heuristic based on content length and structure
    // In a real implementation, this would use more sophisticated analysis
    
    // Convert content to string for analysis
    const contentStr = JSON.stringify(content);
    const length = contentStr.length;
    
    // Check for complexity indicators
    const hasCodeBlocks = contentStr.includes('```') || contentStr.includes('`');
    const hasLists = contentStr.includes('- ') || contentStr.includes('* ') || 
      contentStr.includes('1. ');
    const hasNestedStructure = (contentStr.match(/{/g) || []).length > 2;
    const hasTables = contentStr.includes('|') && contentStr.includes('\n|');
    
    // Calculate complexity score
    let complexityScore = 0;
    
    // Length factors
    if (length < 500) complexityScore += 1;
    else if (length < 2000) complexityScore += 2;
    else if (length < 5000) complexityScore += 3;
    else complexityScore += 4;
    
    // Structure factors
    if (hasCodeBlocks) complexityScore += 2;
    if (hasLists) complexityScore += 1;
    if (hasNestedStructure) complexityScore += 2;
    if (hasTables) complexityScore += 2;
    
    // Map score to complexity level
    if (complexityScore <= 2) return ComplexityLevel.LOW;
    if (complexityScore <= 5) return ComplexityLevel.MEDIUM;
    if (complexityScore <= 8) return ComplexityLevel.HIGH;
    return ComplexityLevel.VERY_HIGH;
  }
}

module.exports = AdaptiveWindowManager;
module.exports.AdjustmentType = AdjustmentType;
module.exports.ComplexityLevel = ComplexityLevel;
module.exports.TokenEstimation = TokenEstimation; 