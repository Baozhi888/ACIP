/**
 * ModelFineTuner
 * 
 * Manages fine-tuning operations for AI models, enabling
 * customization and specialization of models for specific tasks.
 */

const EventEmitter = require('events');
const { generateId } = require('../utils/identifiers');

class ModelFineTuner {
  /**
   * Creates a new ModelFineTuner instance
   * @param {Object} options - Fine-tuning options
   */
  constructor(options) {
    this.modelRegistry = options.modelRegistry;
    this.providerRegistry = options.providerRegistry;
    this.config = options.config || {};
    this.events = new EventEmitter();
    
    // Track active fine-tuning jobs
    this.activeJobs = new Map();
    this.jobHistory = new Map();
    
    // Supported fine-tuning types
    this.supportedTypes = {
      'instruction-tuning': true,
      'domain-adaptation': true,
      'behavior-alignment': true,
      'task-specific': true
    };
  }
  
  /**
   * Create a new fine-tuning job
   * @param {Object} options - Fine-tuning job options
   * @returns {Promise<Object>} - The created job
   */
  async createFineTuningJob(options) {
    // Validate options
    this._validateJobOptions(options);
    
    // Generate a unique job ID
    const jobId = options.jobId || this._generateJobId();
    
    // Check if model supports fine-tuning
    const model = await this.modelRegistry.getModel(options.baseModelId);
    if (!model) {
      throw new Error(`Model not found: ${options.baseModelId}`);
    }
    
    if (!model.capabilities?.includes('fine-tuning')) {
      throw new Error(`Model ${options.baseModelId} does not support fine-tuning`);
    }
    
    // Get the provider
    const provider = this.providerRegistry.getProvider(model.providerId);
    if (!provider || !provider.supportsFineTuning) {
      throw new Error(`Provider ${model.providerId} does not support fine-tuning`);
    }
    
    // Create job object
    const job = {
      id: jobId,
      baseModelId: options.baseModelId,
      providerId: model.providerId,
      type: options.type,
      trainingData: options.trainingData,
      validationData: options.validationData,
      hyperparameters: options.hyperparameters || {},
      status: 'created',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      resultModelId: null,
      metrics: {},
      metadata: options.metadata || {}
    };
    
    // Store job in active jobs
    this.activeJobs.set(jobId, job);
    
    // Emit job created event
    this.events.emit('job:created', {
      jobId,
      timestamp: job.createdAt
    });
    
    // Return the job
    return job;
  }
  
  /**
   * Start a fine-tuning job
   * @param {string} jobId - ID of the job to start
   * @returns {Promise<Object>} - The updated job
   */
  async startFineTuningJob(jobId) {
    // Get the job
    const job = this.activeJobs.get(jobId);
    if (!job) {
      throw new Error(`Fine-tuning job not found: ${jobId}`);
    }
    
    // Check if the job can be started
    if (job.status !== 'created') {
      throw new Error(`Fine-tuning job ${jobId} cannot be started (status: ${job.status})`);
    }
    
    // Get the provider
    const provider = this.providerRegistry.getProvider(job.providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${job.providerId}`);
    }
    
    try {
      // Update job status
      job.status = 'running';
      job.updatedAt = Date.now();
      job.startedAt = Date.now();
      
      // Start the fine-tuning job with the provider
      const result = await provider.startFineTuning({
        jobId,
        baseModelId: job.baseModelId,
        type: job.type,
        trainingData: job.trainingData,
        validationData: job.validationData,
        hyperparameters: job.hyperparameters,
        metadata: job.metadata
      });
      
      // Update job with provider-specific information
      job.providerJobId = result.providerJobId;
      job.estimatedCompletionTime = result.estimatedCompletionTime;
      
      // Emit job started event
      this.events.emit('job:started', {
        jobId,
        timestamp: job.startedAt,
        providerJobId: job.providerJobId
      });
      
      // If the provider supports webhooks, register one
      if (provider.registerFineTuningWebhook && this.config.webhookUrl) {
        await provider.registerFineTuningWebhook({
          jobId,
          providerJobId: job.providerJobId,
          webhookUrl: this.config.webhookUrl
        });
      } else {
        // Otherwise, start polling for updates
        this._startJobPolling(jobId);
      }
      
      return job;
    } catch (error) {
      // Update job status on error
      job.status = 'failed';
      job.updatedAt = Date.now();
      job.error = error.message;
      
      // Emit job failed event
      this.events.emit('job:failed', {
        jobId,
        timestamp: job.updatedAt,
        error: error.message
      });
      
      throw error;
    }
  }
  
  /**
   * Cancel a fine-tuning job
   * @param {string} jobId - ID of the job to cancel
   * @returns {Promise<Object>} - The updated job
   */
  async cancelFineTuningJob(jobId) {
    // Get the job
    const job = this.activeJobs.get(jobId);
    if (!job) {
      throw new Error(`Fine-tuning job not found: ${jobId}`);
    }
    
    // Check if the job can be cancelled
    if (job.status !== 'running') {
      throw new Error(`Fine-tuning job ${jobId} cannot be canceled (status: ${job.status})`);
    }
    
    // Get the provider
    const provider = this.providerRegistry.getProvider(job.providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${job.providerId}`);
    }
    
    try {
      // Cancel the fine-tuning job with the provider
      await provider.cancelFineTuning({
        jobId,
        providerJobId: job.providerJobId
      });
      
      // Update job status
      job.status = 'cancelled';
      job.updatedAt = Date.now();
      
      // Emit job cancelled event
      this.events.emit('job:cancelled', {
        jobId,
        timestamp: job.updatedAt
      });
      
      return job;
    } catch (error) {
      // Emit cancellation error event but don't change job status
      this.events.emit('job:cancellation-failed', {
        jobId,
        timestamp: Date.now(),
        error: error.message
      });
      
      throw error;
    }
  }
  
  /**
   * Get a fine-tuning job
   * @param {string} jobId - ID of the job to get
   * @returns {Object} - The job
   */
  getFineTuningJob(jobId) {
    // Check active jobs first
    if (this.activeJobs.has(jobId)) {
      return this.activeJobs.get(jobId);
    }
    
    // Then check job history
    if (this.jobHistory.has(jobId)) {
      return this.jobHistory.get(jobId);
    }
    
    throw new Error(`Fine-tuning job not found: ${jobId}`);
  }
  
  /**
   * List fine-tuning jobs
   * @param {Object} filters - Optional filters for jobs
   * @returns {Array<Object>} - List of jobs
   */
  listFineTuningJobs(filters = {}) {
    let jobs = [...this.activeJobs.values(), ...this.jobHistory.values()];
    
    // Apply filters
    if (filters.status) {
      jobs = jobs.filter(job => job.status === filters.status);
    }
    
    if (filters.baseModelId) {
      jobs = jobs.filter(job => job.baseModelId === filters.baseModelId);
    }
    
    if (filters.providerId) {
      jobs = jobs.filter(job => job.providerId === filters.providerId);
    }
    
    if (filters.type) {
      jobs = jobs.filter(job => job.type === filters.type);
    }
    
    // Sort by creation time (newest first)
    jobs.sort((a, b) => b.createdAt - a.createdAt);
    
    return jobs;
  }
  
  /**
   * Handle a fine-tuning job webhook event
   * @param {Object} event - Webhook event data
   */
  handleWebhookEvent(event) {
    // Get the job ID from the event
    const jobId = event.jobId;
    
    // Find the job
    const job = this.activeJobs.get(jobId);
    if (!job) {
      console.error(`Received webhook for unknown job: ${jobId}`);
      return;
    }
    
    // Update job based on event type
    switch (event.type) {
      case 'progress':
        job.progress = event.progress;
        job.metrics = event.metrics || job.metrics;
        job.updatedAt = Date.now();
        
        this.events.emit('job:progress', {
          jobId,
          timestamp: job.updatedAt,
          progress: job.progress,
          metrics: job.metrics
        });
        break;
        
      case 'completed':
        this._handleJobCompletion(job, event);
        break;
        
      case 'failed':
        job.status = 'failed';
        job.error = event.error;
        job.updatedAt = Date.now();
        
        this.events.emit('job:failed', {
          jobId,
          timestamp: job.updatedAt,
          error: job.error
        });
        break;
        
      default:
        console.warn(`Unknown webhook event type: ${event.type}`);
    }
  }
  
  /**
   * Update a fine-tuning job status
   * @param {string} jobId - ID of the job to update
   * @returns {Promise<Object>} - The updated job
   */
  async updateJobStatus(jobId) {
    // Get the job
    const job = this.activeJobs.get(jobId);
    if (!job) {
      throw new Error(`Fine-tuning job not found: ${jobId}`);
    }
    
    // Get the provider
    const provider = this.providerRegistry.getProvider(job.providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${job.providerId}`);
    }
    
    // Get the current status from the provider
    const status = await provider.getFineTuningStatus({
      jobId,
      providerJobId: job.providerJobId
    });
    
    // Update job with new status information
    job.status = status.status;
    job.progress = status.progress;
    job.metrics = status.metrics || job.metrics;
    job.updatedAt = Date.now();
    
    // Handle completion if the job is done
    if (status.status === 'completed') {
      this._handleJobCompletion(job, status);
    } else if (status.status === 'failed') {
      job.error = status.error;
      
      this.events.emit('job:failed', {
        jobId,
        timestamp: job.updatedAt,
        error: job.error
      });
    }
    
    return job;
  }
  
  /**
   * Register event listener for fine-tuning events
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   */
  on(event, handler) {
    this.events.on(event, handler);
  }
  
  /**
   * Remove event listener for fine-tuning events
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   */
  off(event, handler) {
    this.events.off(event, handler);
  }
  
  /**
   * Handle job completion logic
   * @param {Object} job - The job object
   * @param {Object} completionData - Completion data
   * @private
   */
  async _handleJobCompletion(job, completionData) {
    // Update job status
    job.status = 'completed';
    job.updatedAt = Date.now();
    job.completedAt = Date.now();
    job.metrics = completionData.metrics || job.metrics;
    job.resultModelId = completionData.modelId || `${job.baseModelId}-ft-${job.id}`;
    
    // Register the new fine-tuned model with the model registry
    if (job.resultModelId) {
      try {
        // Get the base model
        const baseModel = await this.modelRegistry.getModel(job.baseModelId);
        
        // Create a new model entry for the fine-tuned model
        await this.modelRegistry.registerModel({
          id: job.resultModelId,
          providerId: job.providerId,
          baseModelId: job.baseModelId,
          name: `${baseModel?.name || job.baseModelId} Fine-tuned (${job.type})`,
          type: 'fine-tuned',
          capabilities: baseModel?.capabilities || [],
          contextWindow: baseModel?.contextWindow,
          maxTokens: baseModel?.maxTokens,
          costPerToken: baseModel?.costPerToken,
          qualityScore: baseModel?.qualityScore,
          metadata: {
            finetuningJob: job.id,
            finetuningType: job.type,
            finetuningDate: job.completedAt,
            ...job.metadata
          }
        });
      } catch (error) {
        console.error(`Failed to register fine-tuned model: ${error.message}`);
      }
    }
    
    // Move job to history
    this.jobHistory.set(job.id, job);
    this.activeJobs.delete(job.id);
    
    // Emit job completed event
    this.events.emit('job:completed', {
      jobId: job.id,
      timestamp: job.completedAt,
      resultModelId: job.resultModelId,
      metrics: job.metrics
    });
  }
  
  /**
   * Start polling for job status updates
   * @param {string} jobId - ID of the job to poll
   * @private
   */
  _startJobPolling(jobId) {
    const job = this.activeJobs.get(jobId);
    if (!job) {
      return;
    }
    
    // Calculate initial polling interval (start with 30 seconds)
    let pollingInterval = this.config.fineTuningPollingIntervalMs || 30000;
    
    // Start polling timer
    const poll = async () => {
      try {
        // Get the job again to ensure it's still active
        const currentJob = this.activeJobs.get(jobId);
        if (!currentJob || ['completed', 'failed', 'cancelled'].includes(currentJob.status)) {
          return; // Stop polling
        }
        
        // Update job status
        await this.updateJobStatus(jobId);
        
        // Check if job is still running
        const updatedJob = this.activeJobs.get(jobId);
        if (updatedJob && updatedJob.status === 'running') {
          // Schedule next poll (with exponential backoff, max 10 minutes)
          pollingInterval = Math.min(pollingInterval * 1.5, 600000);
          setTimeout(poll, pollingInterval);
        }
      } catch (error) {
        console.error(`Error polling fine-tuning job ${jobId}:`, error);
        
        // Schedule next poll with a longer interval after error
        pollingInterval = Math.min(pollingInterval * 2, 600000);
        setTimeout(poll, pollingInterval);
      }
    };
    
    // Start the first poll
    setTimeout(poll, pollingInterval);
  }
  
  /**
   * Validate fine-tuning job options
   * @param {Object} options - Job options to validate
   * @throws {Error} - If options are invalid
   * @private
   */
  _validateJobOptions(options) {
    if (!options) {
      throw new Error('Fine-tuning job options are required');
    }
    
    if (!options.baseModelId) {
      throw new Error('Base model ID is required');
    }
    
    if (!options.type) {
      throw new Error('Fine-tuning type is required');
    }
    
    if (!this.supportedTypes[options.type]) {
      throw new Error(`Unsupported fine-tuning type: ${options.type}`);
    }
    
    if (!options.trainingData || !Array.isArray(options.trainingData) || options.trainingData.length === 0) {
      throw new Error('Training data is required and must be a non-empty array');
    }
  }
  
  /**
   * Generate a unique job ID
   * @returns {string} - Unique job ID
   * @private
   */
  _generateJobId() {
    return `ft_${generateId()}`;
  }
}

module.exports = ModelFineTuner; 