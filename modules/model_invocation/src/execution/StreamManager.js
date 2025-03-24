/**
 * StreamManager
 * 
 * Manages streaming responses from models and provides utilities
 * for stream handling, buffering, and transformation.
 */

const EventEmitter = require('events');
const { generateRequestId } = require('../utils/identifiers');

class StreamManager {
  /**
   * Creates a new StreamManager instance
   * @param {Object} config - Stream configuration
   */
  constructor(config = {}) {
    this.bufferSize = config.bufferSize || 1024;
    this.streamTimeoutMs = config.streamTimeoutMs || 60000; // Default 60s timeout
    this.activeStreams = new Map();
    this.streamMetrics = {
      created: 0,
      completed: 0,
      errored: 0,
      active: 0
    };
  }
  
  /**
   * Create a stream for a model invocation
   * @param {Object} request - The model request
   * @param {RequestRouter} router - The request router
   * @returns {EventEmitter} - Stream event emitter
   */
  createStream(request, router) {
    // Generate unique stream ID if not provided
    const streamId = request.requestId || generateRequestId();
    
    // Create stream-specific event emitter
    const streamEmitter = new EventEmitter();
    
    // Update metrics
    this.streamMetrics.created++;
    this.streamMetrics.active++;
    
    try {
      // Start streaming request
      this._handleStream(streamId, request, router, streamEmitter);
      
      // Store the stream in active streams
      this.activeStreams.set(streamId, {
        emitter: streamEmitter,
        request,
        startTime: Date.now(),
        chunkCount: 0,
        completed: false
      });
      
      // Return the emitter for the consumer to listen to
      return streamEmitter;
    } catch (error) {
      this._cleanupStream(streamId, error);
      streamEmitter.emit('error', error);
      throw error;
    }
  }
  
  /**
   * Handle streaming from a router to a stream emitter
   * @param {string} streamId - Unique stream ID
   * @param {Object} request - The model request
   * @param {RequestRouter} router - The request router
   * @param {EventEmitter} streamEmitter - Target stream emitter
   * @private
   */
  async _handleStream(streamId, request, router, streamEmitter) {
    try {
      // Set up timeout for the stream
      const timeoutId = setTimeout(() => {
        const error = new Error(`Stream timeout after ${this.streamTimeoutMs}ms`);
        this._emitErrorAndCleanup(streamId, streamEmitter, error);
      }, this.streamTimeoutMs);
      
      // Get the stream from the router
      const providerStream = await router.routeStreamRequest(request);
      
      // Store timeout ID in the active stream for cleanup
      const activeStream = this.activeStreams.get(streamId);
      if (activeStream) {
        activeStream.timeoutId = timeoutId;
        activeStream.providerStream = providerStream;
      }
      
      // Handle provider stream events
      
      // Data event
      providerStream.on('data', (data) => {
        // Update metrics
        const stream = this.activeStreams.get(streamId);
        if (stream) {
          stream.chunkCount++;
          stream.lastActivity = Date.now();
        }
        
        // Forward the chunk to the consumer
        streamEmitter.emit('data', data);
      });
      
      // Error event
      providerStream.on('error', (error) => {
        clearTimeout(timeoutId);
        this._emitErrorAndCleanup(streamId, streamEmitter, error);
      });
      
      // End event
      providerStream.on('end', (data) => {
        clearTimeout(timeoutId);
        
        // Mark as completed and emit end event
        const stream = this.activeStreams.get(streamId);
        if (stream) {
          stream.completed = true;
          
          // Calculate total duration
          const duration = Date.now() - stream.startTime;
          
          // Emit end event with completion stats
          streamEmitter.emit('end', {
            requestId: streamId,
            chunkCount: stream.chunkCount,
            duration,
            ...data
          });
          
          // Clean up the stream
          this._cleanupStream(streamId);
        }
      });
    } catch (error) {
      this._emitErrorAndCleanup(streamId, streamEmitter, error);
    }
  }
  
  /**
   * Emit error event and clean up stream
   * @param {string} streamId - ID of the stream
   * @param {EventEmitter} streamEmitter - The stream emitter
   * @param {Error} error - The error to emit
   * @private
   */
  _emitErrorAndCleanup(streamId, streamEmitter, error) {
    // Emit error event
    streamEmitter.emit('error', error);
    
    // Cleanup the stream
    this._cleanupStream(streamId, error);
  }
  
  /**
   * Clean up a stream
   * @param {string} streamId - ID of the stream to clean up
   * @param {Error} [error] - Optional error that caused the cleanup
   * @private
   */
  _cleanupStream(streamId, error = null) {
    const stream = this.activeStreams.get(streamId);
    if (!stream) {
      return;
    }
    
    // Clear any active timeout
    if (stream.timeoutId) {
      clearTimeout(stream.timeoutId);
    }
    
    // Remove from active streams
    this.activeStreams.delete(streamId);
    
    // Update metrics
    this.streamMetrics.active--;
    
    if (error) {
      this.streamMetrics.errored++;
    } else if (stream.completed) {
      this.streamMetrics.completed++;
    }
  }
  
  /**
   * Cancel an active stream
   * @param {string} streamId - ID of the stream to cancel
   * @returns {boolean} - Whether the cancellation was successful
   */
  cancelStream(streamId) {
    const stream = this.activeStreams.get(streamId);
    if (!stream) {
      return false;
    }
    
    // Cancel the provider stream if possible
    if (stream.providerStream && typeof stream.providerStream.cancel === 'function') {
      stream.providerStream.cancel();
    }
    
    // Create cancellation error
    const error = new Error('Stream cancelled by user');
    
    // Emit error and clean up
    this._emitErrorAndCleanup(streamId, stream.emitter, error);
    
    return true;
  }
  
  /**
   * Get metrics about streams
   * @returns {Object} - Stream metrics
   */
  getMetrics() {
    return {
      ...this.streamMetrics,
      activeStreams: Array.from(this.activeStreams.entries()).map(([id, stream]) => ({
        streamId: id,
        startTime: stream.startTime,
        chunkCount: stream.chunkCount,
        duration: Date.now() - stream.startTime,
        model: stream.request.model,
        provider: stream.request.provider
      }))
    };
  }
  
  /**
   * Create a buffer from a stream
   * @param {EventEmitter} stream - The stream to buffer
   * @returns {Promise<Array>} - Array of all data chunks
   */
  bufferStream(stream) {
    return new Promise((resolve, reject) => {
      const buffer = [];
      
      stream.on('data', (data) => {
        buffer.push(data);
      });
      
      stream.on('error', (error) => {
        reject(error);
      });
      
      stream.on('end', () => {
        resolve(buffer);
      });
    });
  }
  
  /**
   * Create a combined response from a stream
   * @param {EventEmitter} stream - The stream to combine
   * @returns {Promise<Object>} - The combined response
   */
  async streamToResponse(stream) {
    const chunks = await this.bufferStream(stream);
    
    // The final chunk often contains the complete response info
    const finalChunk = chunks[chunks.length - 1] || {};
    
    // Combine response content from all chunks
    let combinedContent = '';
    let combinedFunctionCall = null;
    
    // Process all chunks to build the response
    for (const chunk of chunks) {
      if (chunk.content) {
        combinedContent += chunk.content;
      }
      
      // For function calls, use the most complete one (usually the last)
      if (chunk.function_call && 
          (!combinedFunctionCall || 
           Object.keys(chunk.function_call).length > Object.keys(combinedFunctionCall).length)) {
        combinedFunctionCall = chunk.function_call;
      }
    }
    
    // Construct the combined response
    const response = {
      ...finalChunk,
      content: combinedContent
    };
    
    // Add function call if present
    if (combinedFunctionCall) {
      response.function_call = combinedFunctionCall;
    }
    
    return response;
  }
}

module.exports = StreamManager; 