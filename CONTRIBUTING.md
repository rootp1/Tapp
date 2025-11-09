# Contributing to Tapp

Thank you for considering contributing to Tapp! This document provides guidelines for contributing to the project.

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- Help others learn and grow

## How to Contribute

### Reporting Bugs

1. **Check existing issues** to avoid duplicates
2. **Create a new issue** with:
   - Clear, descriptive title
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots (if applicable)
   - Environment details (OS, Node version, etc.)

### Suggesting Features

1. **Open an issue** with:
   - Clear description of the feature
   - Use cases
   - Why it would be valuable
   - Potential implementation approach

### Pull Requests

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**
4. **Test thoroughly**
5. **Commit with clear messages**: `git commit -m "Add amazing feature"`
6. **Push to your fork**: `git push origin feature/amazing-feature`
7. **Open a Pull Request**

## Development Setup

See [README.md](README.md#setup-instructions) for setup instructions.

## Code Style

### TypeScript/JavaScript

- Use TypeScript for all new code
- Follow existing code style
- Use meaningful variable names
- Add comments for complex logic
- Keep functions small and focused

Example:
```typescript
// Good
const calculatePlatformFee = (amount: number, feePercent: number): number => {
  return (amount * feePercent) / 100;
};

// Bad
const calc = (a: number, b: number) => (a * b) / 100;
```

### React Components

- Use functional components with hooks
- Keep components small and reusable
- Use TypeScript interfaces for props
- Handle loading and error states

Example:
```typescript
interface ButtonProps {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ onClick, disabled, children }) => {
  return (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
};
```

### Commit Messages

Follow conventional commits format:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Examples:
```
feat: add referral system for users
fix: resolve payment verification timeout
docs: update deployment guide
refactor: improve transaction service performance
```

## Project Structure

```
src/
├── bot/           # Telegram bot logic
├── config/        # Configuration files
├── models/        # Database models
├── routes/        # API routes
├── services/      # Business logic
└── utils/         # Helper functions

webapp/
├── src/
│   ├── components/  # React components
│   ├── hooks/       # Custom hooks
│   └── utils/       # Utility functions
└── public/          # Static assets
```

## Testing

- Write tests for new features
- Ensure all tests pass before submitting PR
- Test both backend and frontend changes
- Include integration tests when applicable

## Documentation

- Update README.md for user-facing changes
- Add code comments for complex logic
- Update API documentation for new endpoints
- Include examples in documentation

## Areas for Contribution

### High Priority
- [ ] Add unit and integration tests
- [ ] Improve error handling
- [ ] Add rate limiting middleware
- [ ] Implement caching layer
- [ ] Add internationalization (i18n)

### Features
- [ ] Web dashboard for creators
- [ ] Referral system
- [ ] Analytics dashboard
- [ ] Subscription model
- [ ] Content scheduling
- [ ] Bulk post creation
- [ ] Multi-language support

### Improvements
- [ ] Better error messages
- [ ] Improved logging
- [ ] Performance optimizations
- [ ] Mobile responsiveness
- [ ] Accessibility improvements
- [ ] Dark mode for webapp

### Documentation
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Video tutorials
- [ ] Code examples
- [ ] Troubleshooting guide
- [ ] Architecture diagrams

## Review Process

1. **Code Review**: Maintainers will review your PR
2. **Feedback**: Address any comments or requested changes
3. **Approval**: Once approved, your PR will be merged
4. **Recognition**: Contributors will be credited

## Questions?

- Open an issue for questions
- Join our community chat (if available)
- Email: your-email@example.com

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Tapp! Your efforts help make this project better for everyone.
