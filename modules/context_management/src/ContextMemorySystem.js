/**
 * ContextMemorySystem.js
 * 
 * Implements the Context Memory System for sophisticated memory management.
 * Provides short-term, long-term, episodic, semantic, and procedural memory.
 */

/**
 * Enumeration of memory types
 */
const MemoryType = {
  SHORT_TERM: 'short_term',   // Recent items, limited capacity, quick access
  LONG_TERM: 'long_term',     // Important items, stored indefinitely
  EPISODIC: 'episodic',       // Event-based memories with temporal aspects
  SEMANTIC: 'semantic',       // Fact-based knowledge and concepts
  PROCEDURAL: 'procedural',   // Task-related sequences and procedures
};

/**
 * Memory item interface
 * @typedef {Object} MemoryItem
 * @property {string} id - Unique identifier
 * @property {string} type - Type of memory (from MemoryType)
 * @property {*} content - The memory content
 * @property {number} timestamp - Creation timestamp
 * @property {number} [lastAccessed] - Last access timestamp
 * @property {number} [importance] - Importance score (0-100)
 * @property {number} [accessCount] - Number of times accessed
 * @property {string[]} [tags] - Associated tags
 * @property {Object} [metadata] - Additional metadata
 */

/**
 * Context Memory System class
 * Manages different types of memory for context
 */
class ContextMemorySystem {
  /**
   * Constructor
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      maxShortTermItems: 100,     // Maximum items in short-term memory
      shortTermRetention: 86400, // Time in seconds to retain short-term memories (24 hours)
      episodicThreshold: 60,     // Importance threshold for episodic memory storage
      consolidationInterval: 3600, // Time in seconds between memory consolidation (1 hour)
      semanticExtractionEnabled: true, // Whether to extract semantic info from memories
      enabled: {
        shortTerm: true,        // Enable short-term memory
        longTerm: true,         // Enable long-term memory
        episodic: true,         // Enable episodic memory
        semantic: true,         // Enable semantic memory
        procedural: true,       // Enable procedural memory
      },
      ...options
    };

    this.logger = options.logger || console;
    
    // Initialize memory stores
    this.memory = {
      shortTerm: [],
      longTerm: [],
      episodic: [],
      semantic: {},
      procedural: []
    };
    
    // Statistics
    this.stats = {
      totalItems: 0,
      retrievals: 0,
      stores: 0,
      consolidations: 0,
      averageAccessTime: 0,
      accessTimeSamples: 0
    };
    
    // Set up consolidation interval if enabled
    if (this.options.enabled.shortTerm && this.options.enabled.longTerm) {
      this._setupConsolidation();
    }
  }
  
  /**
   * Store a memory item
   * @param {MemoryItem} item - Memory item to store
   * @returns {string} ID of the stored memory
   */
  store(item) {
    // Ensure the item has basic required properties
    const timestamp = Date.now();
    const memoryItem = {
      id: item.id || `mem_${timestamp}_${Math.floor(Math.random() * 10000)}`,
      type: item.type || MemoryType.SHORT_TERM,
      content: item.content,
      timestamp,
      lastAccessed: timestamp,
      importance: item.importance || 0,
      accessCount: 0,
      tags: item.tags || [],
      metadata: item.metadata || {}
    };
    
    // Store in the appropriate memory storage
    switch (memoryItem.type) {
      case MemoryType.SHORT_TERM:
        if (this.options.enabled.shortTerm) {
          // Add to short-term memory
          this.memory.shortTerm.push(memoryItem);
          
          // Manage capacity
          if (this.memory.shortTerm.length > this.options.maxShortTermItems) {
            this._pruneShortTermMemory();
          }
        }
        break;
        
      case MemoryType.LONG_TERM:
        if (this.options.enabled.longTerm) {
          this.memory.longTerm.push(memoryItem);
        }
        break;
        
      case MemoryType.EPISODIC:
        if (this.options.enabled.episodic) {
          this.memory.episodic.push(memoryItem);
        }
        break;
        
      case MemoryType.SEMANTIC:
        if (this.options.enabled.semantic) {
          // For semantic memory, we store by concept/key
          const key = memoryItem.metadata.concept || memoryItem.id;
          this.memory.semantic[key] = memoryItem;
        }
        break;
        
      case MemoryType.PROCEDURAL:
        if (this.options.enabled.procedural) {
          this.memory.procedural.push(memoryItem);
        }
        break;
        
      default:
        // Default to short-term memory
        if (this.options.enabled.shortTerm) {
          this.memory.shortTerm.push(memoryItem);
        }
    }
    
    // Update stats
    this.stats.totalItems++;
    this.stats.stores++;
    
    // Extract semantic information if enabled
    if (this.options.semanticExtractionEnabled && 
        this.options.enabled.semantic && 
        memoryItem.type !== MemoryType.SEMANTIC) {
      this._extractSemanticInfo(memoryItem);
    }
    
    this.logger.debug(`Stored memory: ${memoryItem.id} (${memoryItem.type})`);
    
    return memoryItem.id;
  }
  
  /**
   * Retrieve a memory by ID
   * @param {string} id - Memory ID
   * @param {Object} options - Retrieval options
   * @returns {MemoryItem|null} Memory item or null if not found
   */
  retrieve(id, options = {}) {
    const startTime = Date.now();
    
    // Search in all memory stores
    let foundItem = null;
    const searchStores = options.memoryTypes || Object.values(MemoryType);
    
    for (const type of searchStores) {
      let item = null;
      
      switch (type) {
        case MemoryType.SHORT_TERM:
          item = this.memory.shortTerm.find(item => item.id === id);
          break;
          
        case MemoryType.LONG_TERM:
          item = this.memory.longTerm.find(item => item.id === id);
          break;
          
        case MemoryType.EPISODIC:
          item = this.memory.episodic.find(item => item.id === id);
          break;
          
        case MemoryType.SEMANTIC:
          // Check if the ID matches a concept key
          item = this.memory.semantic[id] || null;
          break;
          
        case MemoryType.PROCEDURAL:
          item = this.memory.procedural.find(item => item.id === id);
          break;
      }
      
      if (item) {
        foundItem = item;
        break;
      }
    }
    
    if (foundItem) {
      // Update access metrics
      foundItem.lastAccessed = Date.now();
      foundItem.accessCount = (foundItem.accessCount || 0) + 1;
      
      // Increase importance based on access
      if (!options.readOnly && foundItem.importance < 100) {
        foundItem.importance = Math.min(100, foundItem.importance + 1);
      }
      
      this.stats.retrievals++;
    }
    
    // Update stats
    const endTime = Date.now();
    const accessTime = endTime - startTime;
    this.stats.averageAccessTime = (
      (this.stats.averageAccessTime * this.stats.accessTimeSamples) + accessTime
    ) / (this.stats.accessTimeSamples + 1);
    this.stats.accessTimeSamples++;
    
    return foundItem;
  }
  
  /**
   * Query memories based on criteria
   * @param {Object} query - Query criteria
   * @param {Object} options - Query options
   * @returns {Array} Matching memory items
   */
  query(query = {}, options = {}) {
    const results = [];
    const searchTypes = options.memoryTypes || Object.values(MemoryType);
    const limit = options.limit || 100;
    
    // Helper function to check if an item matches the query
    const matchesQuery = (item) => {
      // Match by tags
      if (query.tags && query.tags.length > 0) {
        const hasAllTags = query.tags.every(tag => item.tags.includes(tag));
        if (!hasAllTags) return false;
      }
      
      // Match by time range
      if (query.timeStart && item.timestamp < query.timeStart) return false;
      if (query.timeEnd && item.timestamp > query.timeEnd) return false;
      
      // Match by importance
      if (query.minImportance && item.importance < query.minImportance) return false;
      if (query.maxImportance && item.importance > query.maxImportance) return false;
      
      // Match by text content (if item.content is a string)
      if (query.textContains && typeof item.content === 'string') {
        if (!item.content.includes(query.textContains)) return false;
      }
      
      // Match by custom function
      if (query.matchFn && typeof query.matchFn === 'function') {
        if (!query.matchFn(item)) return false;
      }
      
      return true;
    };
    
    // Search through each enabled memory type
    for (const type of searchTypes) {
      let itemsToSearch = [];
      
      switch (type) {
        case MemoryType.SHORT_TERM:
          if (this.options.enabled.shortTerm) {
            itemsToSearch = this.memory.shortTerm;
          }
          break;
          
        case MemoryType.LONG_TERM:
          if (this.options.enabled.longTerm) {
            itemsToSearch = this.memory.longTerm;
          }
          break;
          
        case MemoryType.EPISODIC:
          if (this.options.enabled.episodic) {
            itemsToSearch = this.memory.episodic;
          }
          break;
          
        case MemoryType.SEMANTIC:
          if (this.options.enabled.semantic) {
            itemsToSearch = Object.values(this.memory.semantic);
          }
          break;
          
        case MemoryType.PROCEDURAL:
          if (this.options.enabled.procedural) {
            itemsToSearch = this.memory.procedural;
          }
          break;
      }
      
      // Filter items by query criteria
      const matchingItems = itemsToSearch.filter(matchesQuery);
      results.push(...matchingItems);
      
      // Stop if we've reached the limit
      if (results.length >= limit) {
        break;
      }
    }
    
    // Apply sorting if specified
    if (options.sortBy) {
      results.sort((a, b) => {
        if (options.sortBy === 'timestamp') {
          return options.sortDesc ? b.timestamp - a.timestamp : a.timestamp - b.timestamp;
        }
        if (options.sortBy === 'importance') {
          return options.sortDesc ? b.importance - a.importance : a.importance - b.importance;
        }
        if (options.sortBy === 'accessCount') {
          return options.sortDesc ? b.accessCount - a.accessCount : a.accessCount - b.accessCount;
        }
        if (options.sortBy === 'lastAccessed') {
          return options.sortDesc ? b.lastAccessed - a.lastAccessed : a.lastAccessed - b.lastAccessed;
        }
        return 0;
      });
    }
    
    // Trim to limit
    const finalResults = results.slice(0, limit);
    
    // Update access count for retrieved items
    if (!options.readOnly) {
      finalResults.forEach(item => {
        item.lastAccessed = Date.now();
        item.accessCount = (item.accessCount || 0) + 1;
      });
    }
    
    this.stats.retrievals += finalResults.length;
    
    return finalResults;
  }
  
  /**
   * Remove a memory by ID
   * @param {string} id - Memory ID
   * @returns {boolean} True if memory was found and removed
   */
  forget(id) {
    let found = false;
    
    // Search in all memory stores
    if (this.options.enabled.shortTerm) {
      const index = this.memory.shortTerm.findIndex(item => item.id === id);
      if (index !== -1) {
        this.memory.shortTerm.splice(index, 1);
        found = true;
      }
    }
    
    if (!found && this.options.enabled.longTerm) {
      const index = this.memory.longTerm.findIndex(item => item.id === id);
      if (index !== -1) {
        this.memory.longTerm.splice(index, 1);
        found = true;
      }
    }
    
    if (!found && this.options.enabled.episodic) {
      const index = this.memory.episodic.findIndex(item => item.id === id);
      if (index !== -1) {
        this.memory.episodic.splice(index, 1);
        found = true;
      }
    }
    
    if (!found && this.options.enabled.semantic) {
      // Check if the ID is a direct key
      if (this.memory.semantic[id]) {
        delete this.memory.semantic[id];
        found = true;
      } else {
        // Check if any semantic memory has this ID
        Object.keys(this.memory.semantic).forEach(key => {
          if (this.memory.semantic[key].id === id) {
            delete this.memory.semantic[key];
            found = true;
          }
        });
      }
    }
    
    if (!found && this.options.enabled.procedural) {
      const index = this.memory.procedural.findIndex(item => item.id === id);
      if (index !== -1) {
        this.memory.procedural.splice(index, 1);
        found = true;
      }
    }
    
    if (found) {
      this.stats.totalItems--;
      this.logger.debug(`Forgot memory: ${id}`);
    }
    
    return found;
  }
  
  /**
   * Consolidate memories from short-term to long-term
   * @returns {Object} Consolidation statistics
   */
  consolidate() {
    if (!this.options.enabled.shortTerm || !this.options.enabled.longTerm) {
      return { 
        moved: 0, 
        pruned: 0 
      };
    }
    
    const now = Date.now();
    const moveToCandidates = [];
    const pruneCandidates = [];
    
    // Check each short-term memory
    this.memory.shortTerm.forEach(item => {
      const ageInSeconds = (now - item.timestamp) / 1000;
      
      // If old enough and important enough, move to long-term
      if (ageInSeconds > this.options.shortTermRetention / 2 && 
          item.importance >= this.options.episodicThreshold) {
        moveToCandidates.push(item);
      }
      // If too old and not important, mark for pruning
      else if (ageInSeconds > this.options.shortTermRetention && 
              item.importance < this.options.episodicThreshold / 2) {
        pruneCandidates.push(item);
      }
    });
    
    // Move memories to long-term
    const movedItems = [];
    moveToCandidates.forEach(item => {
      // Create a copy for long-term memory
      const longTermItem = {
        ...item,
        type: MemoryType.LONG_TERM
      };
      
      // Also create episodic memories for important events
      if (item.importance >= this.options.episodicThreshold && 
          this.options.enabled.episodic) {
        const episodicItem = {
          ...item,
          type: MemoryType.EPISODIC,
          metadata: {
            ...item.metadata,
            originalType: item.type,
            originalId: item.id,
          }
        };
        
        this.memory.episodic.push(episodicItem);
      }
      
      // Store in long-term memory
      this.memory.longTerm.push(longTermItem);
      movedItems.push(item.id);
    });
    
    // Remove the consolidated items from short-term memory
    this.memory.shortTerm = this.memory.shortTerm.filter(
      item => !movedItems.includes(item.id)
    );
    
    // Prune old, unimportant memories
    const prunedItems = [];
    pruneCandidates.forEach(item => {
      const index = this.memory.shortTerm.findIndex(mem => mem.id === item.id);
      if (index !== -1) {
        this.memory.shortTerm.splice(index, 1);
        prunedItems.push(item.id);
      }
    });
    
    // Update stats
    this.stats.consolidations++;
    
    this.logger.info(
      `Memory consolidation: moved ${movedItems.length} to long-term, pruned ${prunedItems.length}`
    );
    
    return {
      moved: movedItems.length,
      pruned: prunedItems.length,
      movedIds: movedItems,
      prunedIds: prunedItems
    };
  }
  
  /**
   * Get statistics and metrics about the memory system
   * @returns {Object} Memory statistics
   */
  getStats() {
    const shortTermCount = this.options.enabled.shortTerm ? this.memory.shortTerm.length : 0;
    const longTermCount = this.options.enabled.longTerm ? this.memory.longTerm.length : 0;
    const episodicCount = this.options.enabled.episodic ? this.memory.episodic.length : 0;
    const semanticCount = this.options.enabled.semantic ? Object.keys(this.memory.semantic).length : 0;
    const proceduralCount = this.options.enabled.procedural ? this.memory.procedural.length : 0;
    
    return {
      ...this.stats,
      counts: {
        shortTerm: shortTermCount,
        longTerm: longTermCount,
        episodic: episodicCount,
        semantic: semanticCount,
        procedural: proceduralCount,
        total: shortTermCount + longTermCount + episodicCount + semanticCount + proceduralCount
      },
      averageImportance: this._calculateAverageImportance(),
      memoryTypeDistribution: {
        shortTerm: shortTermCount / this.stats.totalItems,
        longTerm: longTermCount / this.stats.totalItems,
        episodic: episodicCount / this.stats.totalItems,
        semantic: semanticCount / this.stats.totalItems,
        procedural: proceduralCount / this.stats.totalItems
      }
    };
  }
  
  /**
   * Set up memory consolidation interval
   * @private
   */
  _setupConsolidation() {
    // This would normally set up a timer in a real application
    // For this implementation, we'll note that consolidation should
    // be called periodically either manually or through external scheduling
    
    this.logger.info(
      `Memory consolidation should run every ${this.options.consolidationInterval} seconds`
    );
  }
  
  /**
   * Prune short-term memory to stay within capacity
   * @private
   */
  _pruneShortTermMemory() {
    // Sort by importance (ascending) and then by age (oldest first)
    this.memory.shortTerm.sort((a, b) => {
      if (a.importance === b.importance) {
        return a.timestamp - b.timestamp;
      }
      return a.importance - b.importance;
    });
    
    // Remove items to get back to 90% capacity
    const targetSize = Math.floor(this.options.maxShortTermItems * 0.9);
    const excessItems = this.memory.shortTerm.length - targetSize;
    
    if (excessItems > 0) {
      const prunedItems = this.memory.shortTerm.splice(0, excessItems);
      this.logger.debug(`Pruned ${prunedItems.length} items from short-term memory`);
    }
  }
  
  /**
   * Extract semantic information from a memory item
   * @param {MemoryItem} item - Memory item to analyze
   * @private
   */
  _extractSemanticInfo(item) {
    // In a real implementation, this would use more sophisticated analysis
    // For this implementation, we'll use a simple approach based on tags
    
    if (!item.tags || item.tags.length === 0) {
      return;
    }
    
    // Use tags as semantic concepts
    item.tags.forEach(tag => {
      // Skip if tag is too short or common
      if (tag.length < 3) return;
      
      const existing = this.memory.semantic[tag];
      
      if (!existing) {
        // Create a new semantic memory
        const semanticItem = {
          id: `semantic_${tag}_${Date.now()}`,
          type: MemoryType.SEMANTIC,
          content: {
            concept: tag,
            instances: [item.id],
            definition: `Information related to "${tag}"`,
            relationships: []
          },
          timestamp: Date.now(),
          lastAccessed: Date.now(),
          importance: Math.min(item.importance + 10, 100),
          accessCount: 0,
          tags: [tag],
          metadata: {
            concept: tag,
            source: item.id
          }
        };
        
        this.memory.semantic[tag] = semanticItem;
        this.stats.totalItems++;
      } else {
        // Update existing semantic memory
        if (!existing.content.instances.includes(item.id)) {
          existing.content.instances.push(item.id);
          existing.lastAccessed = Date.now();
          
          // Increase importance based on frequency
          existing.importance = Math.min(
            existing.importance + 5,
            100
          );
        }
      }
    });
  }
  
  /**
   * Calculate average importance of all memory items
   * @returns {number} Average importance
   * @private
   */
  _calculateAverageImportance() {
    let totalImportance = 0;
    let totalItems = 0;
    
    // Calculate for each memory type
    if (this.options.enabled.shortTerm) {
      this.memory.shortTerm.forEach(item => {
        totalImportance += item.importance;
      });
      totalItems += this.memory.shortTerm.length;
    }
    
    if (this.options.enabled.longTerm) {
      this.memory.longTerm.forEach(item => {
        totalImportance += item.importance;
      });
      totalItems += this.memory.longTerm.length;
    }
    
    if (this.options.enabled.episodic) {
      this.memory.episodic.forEach(item => {
        totalImportance += item.importance;
      });
      totalItems += this.memory.episodic.length;
    }
    
    if (this.options.enabled.semantic) {
      Object.values(this.memory.semantic).forEach(item => {
        totalImportance += item.importance;
      });
      totalItems += Object.keys(this.memory.semantic).length;
    }
    
    if (this.options.enabled.procedural) {
      this.memory.procedural.forEach(item => {
        totalImportance += item.importance;
      });
      totalItems += this.memory.procedural.length;
    }
    
    return totalItems > 0 ? totalImportance / totalItems : 0;
  }
}

module.exports = ContextMemorySystem;
module.exports.MemoryType = MemoryType; 