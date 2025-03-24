/**
 * ModelSelector
 * 
 * Selects the most appropriate model for a given request based on:
 * - Capabilities requirements
 * - Provider availability and performance
 * - Cost and latency preferences
 */

class ModelSelector {
  /**
   * Create a new ModelSelector
   * @param {Object} options - Options for the model selector
   */
  constructor(options) {
    this.modelRegistry = options.modelRegistry;
    this.config = options.config;
    this.selectionStrategies = {
      'cost-efficient': this._costEfficientStrategy.bind(this),
      'low-latency': this._lowLatencyStrategy.bind(this),
      'high-quality': this._highQualityStrategy.bind(this),
      'balanced': this._balancedStrategy.bind(this),
      'provider-preferred': this._providerPreferredStrategy.bind(this)
    };
  }
  
  /**
   * Select a model based on selection criteria
   * @param {Object} selector - Model selection criteria
   * @returns {Promise<Object>} The selected model
   */
  async selectModel(selector) {
    // Get models matching the required capabilities
    const matchingModels = this._findMatchingModels(selector);
    
    if (matchingModels.length === 0) {
      return null;
    }
    
    // Use specified strategy or default
    const strategy = selector.strategy || this.config.defaults.selectionStrategy || 'balanced';
    
    // Get the strategy function
    const strategyFn = this.selectionStrategies[strategy] || this.selectionStrategies.balanced;
    
    // Apply the strategy to rank models
    const rankedModels = strategyFn(matchingModels, selector);
    
    // Return the top-ranked model
    return rankedModels[0];
  }
  
  /**
   * Find models matching the required capabilities
   * @param {Object} selector - Model selection criteria
   * @returns {Array<Object>} Array of matching models
   * @private
   */
  _findMatchingModels(selector) {
    // Start with all available models
    let candidates = this.modelRegistry.getModels();
    
    // Filter by provider if specified
    if (selector.provider) {
      candidates = candidates.filter(model => 
        model.providerId === selector.provider
      );
    }
    
    // Filter by required capabilities
    if (selector.capabilities) {
      candidates = candidates.filter(model => {
        // All required capabilities must be present in the model
        return selector.capabilities.every(cap => 
          model.capabilities && model.capabilities.includes(cap)
        );
      });
    }
    
    // Filter by context window requirement
    if (selector.minContextWindow) {
      candidates = candidates.filter(model => 
        model.contextWindow >= selector.minContextWindow
      );
    }
    
    // Filter by token limit
    if (selector.minOutputTokens) {
      candidates = candidates.filter(model => 
        model.maxOutputTokens >= selector.minOutputTokens
      );
    }
    
    return candidates;
  }
  
  /**
   * Cost-efficient selection strategy
   * @param {Array<Object>} models - Candidate models
   * @param {Object} selector - Model selection criteria
   * @returns {Array<Object>} Ranked models
   * @private
   */
  _costEfficientStrategy(models, selector) {
    return [...models].sort((a, b) => {
      // Sort by cost per token (ascending)
      if (a.costPerToken !== b.costPerToken) {
        return a.costPerToken - b.costPerToken;
      }
      
      // Then by quality score (descending)
      return b.qualityScore - a.qualityScore;
    });
  }
  
  /**
   * Low-latency selection strategy
   * @param {Array<Object>} models - Candidate models
   * @param {Object} selector - Model selection criteria
   * @returns {Array<Object>} Ranked models
   * @private
   */
  _lowLatencyStrategy(models, selector) {
    return [...models].sort((a, b) => {
      // Sort by average latency (ascending)
      if (a.averageLatency !== b.averageLatency) {
        return a.averageLatency - b.averageLatency;
      }
      
      // Then by quality score (descending)
      return b.qualityScore - a.qualityScore;
    });
  }
  
  /**
   * High-quality selection strategy
   * @param {Array<Object>} models - Candidate models
   * @param {Object} selector - Model selection criteria
   * @returns {Array<Object>} Ranked models
   * @private
   */
  _highQualityStrategy(models, selector) {
    return [...models].sort((a, b) => {
      // Sort by quality score (descending)
      if (a.qualityScore !== b.qualityScore) {
        return b.qualityScore - a.qualityScore;
      }
      
      // Then by cost per token (ascending)
      return a.costPerToken - b.costPerToken;
    });
  }
  
  /**
   * Balanced selection strategy
   * @param {Array<Object>} models - Candidate models
   * @param {Object} selector - Model selection criteria
   * @returns {Array<Object>} Ranked models
   * @private
   */
  _balancedStrategy(models, selector) {
    return [...models].sort((a, b) => {
      // Calculate a combined score considering quality, cost, and latency
      const scoreA = (a.qualityScore * 0.5) - 
                     (a.costPerToken * 0.3) - 
                     (a.averageLatency * 0.2);
      
      const scoreB = (b.qualityScore * 0.5) - 
                     (b.costPerToken * 0.3) - 
                     (b.averageLatency * 0.2);
      
      return scoreB - scoreA;
    });
  }
  
  /**
   * Provider-preferred selection strategy
   * @param {Array<Object>} models - Candidate models
   * @param {Object} selector - Model selection criteria
   * @returns {Array<Object>} Ranked models
   * @private
   */
  _providerPreferredStrategy(models, selector) {
    // Get preferred provider order
    const preferredProviders = selector.preferredProviders || 
                               this.config.modelSelection?.preferredProviders || 
                               [];
    
    return [...models].sort((a, b) => {
      // Sort by preferred provider order
      const indexA = preferredProviders.indexOf(a.providerId);
      const indexB = preferredProviders.indexOf(b.providerId);
      
      // If both providers are in the preferred list
      if (indexA >= 0 && indexB >= 0) {
        if (indexA !== indexB) {
          return indexA - indexB;
        }
      } 
      // If only one provider is in the preferred list
      else if (indexA >= 0) {
        return -1;
      } 
      else if (indexB >= 0) {
        return 1;
      }
      
      // Fall back to balanced strategy
      return this._balancedStrategy([a, b], selector)[0] === a ? -1 : 1;
    });
  }
}

module.exports = ModelSelector; 