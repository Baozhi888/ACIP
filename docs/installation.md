# ACIP Installation Guide

This guide provides instructions for installing and setting up the Adaptive Contextual Intelligence Protocol (ACIP) for development and production environments.

## Prerequisites

Before installing ACIP, ensure your system meets the following requirements:

### System Requirements

- **Operating System**: Linux (recommended), macOS, or Windows 10/11
- **Processor**: 4+ core CPU
- **Memory**: 8GB RAM minimum (16GB or more recommended)
- **Storage**: 20GB available disk space
- **Network**: Broadband internet connection

### Software Requirements

- **Node.js**: v16.0.0 or later
- **Python**: 3.9 or later
- **Docker**: Latest stable version
- **Git**: Latest stable version
- **Blockchain Node** (optional, for full decentralization features):
  - Ethereum client or
  - Solana client or
  - Compatible blockchain client

## Basic Installation

### 1. Clone the Repository

```bash
git clone https://github.com/Baozhi888/acip.git
cd acip
```

### 2. Install Dependencies

```bash
# Install core dependencies
npm install

# Install module-specific dependencies
cd modules/context_management
npm install
cd ../data_access
npm install
cd ../security_authentication
npm install
cd ../model_invocation
npm install
cd ../payment_settlement
npm install
cd ../..
```

### 3. Build the Project

```bash
npm run build
```

### 4. Run Tests

```bash
npm test
```

### 5. Start the ACIP Node

```bash
npm start
```

By default, the ACIP node will start with minimal configuration. For production deployments, refer to the advanced configuration section below.

## Docker Installation

For containerized deployment, we provide Docker support:

```bash
# Build the Docker image
docker build -t acip .

# Run the container
docker run -p 3000:3000 -p 8545:8545 acip
```

## Configuration

ACIP can be configured through a `config.json` file in the root directory or through environment variables.

### Basic Configuration

Create a `config.json` file:

```json
{
  "node": {
    "port": 3000,
    "host": "0.0.0.0",
    "logLevel": "info"
  },
  "modules": {
    "contextManagement": {
      "enabled": true,
      "maxContextSize": 16384,
      "adaptiveMode": "auto"
    },
    "dataAccess": {
      "enabled": true,
      "cachingEnabled": true
    },
    "securityAuthentication": {
      "enabled": true,
      "authMethod": "did"
    },
    "modelInvocation": {
      "enabled": true,
      "defaultProvider": "local"
    },
    "paymentSettlement": {
      "enabled": false
    }
  },
  "blockchain": {
    "enabled": false,
    "provider": "ethereum",
    "networkUrl": "http://localhost:8545"
  }
}
```

### Environment Variables

You can override configuration settings with environment variables:

```bash
# Core settings
export ACIP_NODE_PORT=3000
export ACIP_NODE_HOST=0.0.0.0
export ACIP_LOG_LEVEL=info

# Module enablement
export ACIP_MODULE_CONTEXT_ENABLED=true
export ACIP_MODULE_DATA_ENABLED=true
export ACIP_MODULE_SECURITY_ENABLED=true
export ACIP_MODULE_MODEL_ENABLED=true
export ACIP_MODULE_PAYMENT_ENABLED=false

# Blockchain settings
export ACIP_BLOCKCHAIN_ENABLED=false
export ACIP_BLOCKCHAIN_PROVIDER=ethereum
export ACIP_BLOCKCHAIN_NETWORK_URL=http://localhost:8545
```

## Module Setup

Each ACIP module can be configured individually:

### Context Management Module

```bash
cd modules/context_management
npm install
npm run configure
```

### Data Access Module

```bash
cd modules/data_access
npm install
npm run configure
```

### Security Authentication Module

```bash
cd modules/security_authentication
npm install
npm run configure
```

### Model Invocation Module

```bash
cd modules/model_invocation
npm install
npm run configure
```

### Payment Settlement Module

```bash
cd modules/payment_settlement
npm install
npm run configure
```

## Blockchain Node Setup (Optional)

For full decentralization features, set up a blockchain node:

### Ethereum

```bash
# Install Geth
sudo apt-get install ethereum

# Start a development node
geth --dev --http --http.addr 0.0.0.0 --http.port 8545 --http.corsdomain "*"
```

### Solana

```bash
# Install Solana
sh -c "$(curl -sSfL https://release.solana.com/v1.10.0/install)"

# Start a test validator
solana-test-validator
```

## Edge Deployment

For deploying ACIP on edge devices:

```bash
# Install edge-optimized version
npm install --production

# Configure for edge environment
export ACIP_EDGE_MODE=true
export ACIP_RESOURCE_OPTIMIZATION=high

# Start with minimal services
npm run start:edge
```

## Verification

To verify your installation:

```bash
# Run the verification script
npm run verify

# Check API endpoints
curl http://localhost:3000/health
```

A successful installation will show all services as running and healthy.

## Troubleshooting

If you encounter issues during installation:

1. **Dependency Errors**: Ensure Node.js and Python versions match requirements
2. **Port Conflicts**: Change ports in configuration if 3000 or 8545 are in use
3. **Blockchain Connection**: Verify blockchain node is running and accessible
4. **Module Failures**: Check individual module logs in `logs/` directory

For more detailed troubleshooting, see our [troubleshooting guide](troubleshooting.md).

## Next Steps

After successful installation:

1. Follow the [usage guide](usage.md) to start using ACIP
2. Explore [example applications](../examples)
3. Review the [architecture documentation](architecture.md) for deeper understanding

## Support

For installation support:

- GitHub Issues: [https://github.com/Baozhi888/acip/issues](https://github.com/Baozhi888/acip/issues)
- Community Forum: [https://community.acip.org](https://community.acip.org)
- Documentation: [https://docs.acip.org](https://docs.acip.org) 
