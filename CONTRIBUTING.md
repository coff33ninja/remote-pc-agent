# Contributing to Remote PC Agent

Thank you for your interest in contributing! Here's how you can help.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/coff33ninja/remote-pc-agent.git`
3. Create a branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test thoroughly
6. Commit: `git commit -m "Add your feature"`
7. Push: `git push origin feature/your-feature-name`
8. Open a Pull Request

## Development Setup

### Server
```bash
cd server
npm install
cp .env.example .env
# Edit .env with your settings
npm start
```

### Agent
```bash
cd agent
pip install -r requirements.txt
# Edit .env.embedded for defaults
python src/main.py
```

## Code Style

- **JavaScript**: Use ES6+ features, async/await
- **Python**: Follow PEP 8
- **Comments**: Explain why, not what
- **Commits**: Use clear, descriptive messages

## Testing

- Test all changes locally before submitting
- Ensure agent connects to server
- Verify API endpoints work
- Check UI functionality

## Pull Request Guidelines

- One feature per PR
- Update documentation if needed
- Add to CHANGELOG.md
- Ensure no breaking changes (or document them)
- Include screenshots for UI changes

## Reporting Bugs

Use the bug report template and include:
- Steps to reproduce
- Expected vs actual behavior
- Environment details
- Logs if applicable

## Feature Requests

Use the feature request template and explain:
- The problem you're solving
- Your proposed solution
- Alternative approaches considered

## Questions?

Open an issue with the question label or reach out to @coff33ninja

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
