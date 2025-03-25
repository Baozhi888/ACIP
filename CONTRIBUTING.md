# Contributing to ACIP

First off, thank you for considering contributing to ACIP! It's people like you that make ACIP such a great tool.

## Code of Conduct

By participating in this project, you are expected to uphold our Code of Conduct. Please report unacceptable behavior to [project maintainers].

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the issue list as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

* Use a clear and descriptive title
* Describe the exact steps which reproduce the problem
* Provide specific examples to demonstrate the steps
* Describe the behavior you observed after following the steps
* Explain which behavior you expected to see instead and why
* Include screenshots or animated GIFs if possible

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

* A clear and descriptive title
* A detailed description of the proposed functionality
* Explain why this enhancement would be useful
* List some other tools or applications where this enhancement exists

### Pull Requests

* Fill in the required template
* Do not include issue numbers in the PR title
* Follow the JavaScript/TypeScript styleguide
* Include thoughtfully-worded, well-structured tests
* Document new code
* End all files with a newline

## Development Process

1. Fork the repo
2. Create a new branch from `main`
3. Make your changes
4. Run tests and linting
5. Submit a pull request

### Setup Development Environment

```bash
# Clone your fork
git clone https://github.com/Baozhi888/acip.git

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

### Project Structure

```
acip/
├── packages/           # Packages directory
│   ├── cli/           # CLI package
│   └── core/          # Core package
├── docs/              # Documentation
└── examples/          # Example projects
```

### Coding Style

* Use TypeScript
* Follow the existing code style
* Use meaningful variable names
* Write comments for complex logic
* Keep functions small and focused

## License

By contributing, you agree that your contributions will be licensed under its MIT License.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before contributing.

## How to Contribute

### Types of Contributions

There are many ways to contribute to ACIP:

1. **Code Contributions**: Implementing new features, fixing bugs, improving performance
2. **Documentation**: Improving or extending documentation, tutorials, and examples
3. **Testing**: Adding tests, identifying edge cases, improving test coverage
4. **Design**: UI/UX design, architecture design, API design
5. **Community Support**: Answering questions, helping new contributors
6. **Reporting Issues**: Reporting bugs or suggesting new features
7. **Review**: Reviewing pull requests from other contributors

### Development Workflow

#### Setting Up Development Environment

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/Baozhi888/acip.git
   cd acip
   ```
3. Add the original repository as an upstream remote:
   ```bash
   git remote add upstream https://github.com/original-org/acip.git
   ```
4. Install dependencies:
   ```bash
   npm install
   ```
5. Create a new branch for your work:
   ```bash
   git checkout -b feature/your-feature-name
   ```

#### Making Changes

1. Make your changes in your feature branch
2. Follow the [coding standards](#coding-standards)
3. Add tests for your changes
4. Make sure all tests pass:
   ```bash
   npm test
   ```
5. Update documentation if necessary

#### Submitting Changes

1. Commit your changes with a descriptive commit message:
   ```bash
   git commit -m "Feature: Add new adaptive context window implementation"
   ```
2. Push your branch to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
3. Create a pull request (PR) from your branch to the main repository's `main` branch
4. Follow the PR template and provide a clear description of your changes
5. Ensure the PR passes all CI checks
6. Address any feedback from reviewers

### Reporting Issues

If you find a bug or have a feature request:

1. Check the [issue tracker](https://github.com/original-org/acip/issues) to see if it's already reported
2. If not, create a new issue using the appropriate template
3. Provide a clear, detailed description and steps to reproduce (for bugs)
4. Add relevant labels if you have permission

## Coding Standards

### General Guidelines

- Write clean, readable, and maintainable code
- Follow the principle of "one function, one responsibility"
- Comment code that isn't self-explanatory, but prefer self-explanatory code
- Use meaningful variable and function names
- Keep functions small and focused

### JavaScript/TypeScript Guidelines

- Use TypeScript for all new code
- Follow the [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- Use async/await for asynchronous code
- Properly handle errors and edge cases
- Include TSDoc comments for public APIs

### Testing Guidelines

- Write unit tests for all new code
- Aim for at least 80% test coverage for new features
- Include integration tests for system components
- Test edge cases and error conditions
- Use mocks and stubs appropriately

### Documentation Guidelines

- Document all public APIs
- Keep documentation up-to-date with code changes
- Use clear, concise language
- Include examples for complex features
- Document both success and failure scenarios

## Architecture Guidelines

When contributing to core architectural components:

1. **Modularity**: Keep components modular and loosely coupled
2. **Extensibility**: Design for extensibility through plugins and hooks
3. **Compatibility**: Maintain backward compatibility when possible
4. **Security**: Consider security implications of all changes
5. **Performance**: Be mindful of performance impacts
6. **Privacy**: Respect user privacy in all design decisions
7. **Decentralization**: Support the decentralized nature of the protocol

## Governance Model

ACIP follows an open governance model:

### Decision-Making Process

1. **Technical Decisions**: Made through consensus in technical discussions
2. **Strategic Decisions**: Made through community voting
3. **Conflict Resolution**: Handled through mediation by maintainers

### Roles and Responsibilities

1. **Contributors**: Anyone who contributes to the project
2. **Committers**: Regular contributors with write access
3. **Maintainers**: Responsible for project direction and contributor mentoring
4. **Technical Committee**: Oversees technical direction and standards

### Becoming a Committer

Regular contributors who demonstrate expertise, quality work, and alignment with project values may be invited to become committers.

## Communication Channels

- **GitHub Issues**: For bug reports and feature requests
- **Pull Requests**: For code contributions and reviews
- **Discord Server**: For real-time discussions and community support
- **Mailing List**: For announcements and broader discussions
- **Community Calls**: Regular video calls for project updates and discussions

## License

By contributing to ACIP, you agree that your contributions will be licensed under the same license as the project. See [LICENSE](LICENSE) for details.

## Recognition

We believe in recognizing the contributions of community members:

- All contributors are listed in [CONTRIBUTORS.md](CONTRIBUTORS.md)
- Significant contributions are highlighted in release notes
- Regular contributors may be invited to join the core team

## Questions?

If you have any questions about contributing, feel free to:

- Open an issue with your question
- Ask in the Discord server
- Contact the maintainers directly

Thank you for contributing to ACIP! Your efforts help make this project better for everyone. 
