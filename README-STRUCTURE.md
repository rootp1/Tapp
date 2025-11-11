# Project Structure

```
Tapp/
├── backend/               # Backend API and Bot
│   ├── src/              # TypeScript source code
│   ├── contracts/        # TON smart contracts
│   ├── wrappers/         # Contract wrappers
│   ├── scripts/          # Deployment scripts
│   ├── tests/            # Backend tests
│   └── package.json      # Backend dependencies
├── webapp/               # Frontend Mini App
│   ├── src/              # React source code
│   └── package.json      # Frontend dependencies
├── .env                  # Environment variables (not committed)
├── docker-compose.yml    # Docker configuration
└── render.yaml           # Render deployment config
```

## Development

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
cd webapp
npm install
npm run dev
```
