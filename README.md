# FinPilot Financial Advisor

Your intelligent financial companion for portfolio analysis, market insights, and investment guidance.

## Project Structure

This project consists of two main parts:

1. **Backend (FastAPI)**: Provides the API endpoints and server-side intelligence
2. **Frontend (React)**: Provides the user interface for interacting with the system

## Setup and Installation

### Backend Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/FinPilot-Financial_Advisor.git
cd FinPilot-Financial_Advisor
```

2. Create a virtual environment and install dependencies:
```bash
python -m venv venv
source venv/bin/activate  # On Windows, use: venv\Scripts\activate
pip install -r requirements.txt
```

3. Run the FastAPI backend:
```bash
python app.py
```

The backend will be available at http://localhost:8000 with API documentation at http://localhost:8000/api/docs.

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd FinPilot-Frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The frontend will be available at http://localhost:3000.

## Production Deployment

For production deployment, you need to build the React frontend and configure the FastAPI backend to serve it:

1. Build the React frontend:
```bash
cd FinPilot-Frontend
npm run build
```

2. Make sure your backend is properly configured to serve the React build files:
   - The FastAPI app is already configured to serve the React build if it exists at `FinPilot-Frontend/build`
   - The app also has a catch-all route that will serve the React index.html for client-side routing

3. Start the FastAPI server which will now serve both the API and the React frontend:
```bash
python app.py
```

## Connecting Frontend to Backend

- During development, the React app connects to the FastAPI backend using the environment variable `REACT_APP_API_URL` defined in `.env`
- By default, this is set to `http://localhost:8000`, which is the default address of the FastAPI server
- For production, you should modify this URL to match your deployment environment

## Available Features

- General Finance Queries: Ask any finance-related questions
- Portfolio Analysis: Analyze your investment portfolio
- Binance Portfolio Integration: Connect and analyze your Binance holdings
- Kite Portfolio Integration: Connect and analyze your Kite holdings

## API Documentation

When the backend is running, you can access the API documentation at:
- Swagger UI: http://localhost:8000/api/docs
- ReDoc: http://localhost:8000/api/redoc

## License

[MIT License](LICENSE) 