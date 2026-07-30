# ZenPost AI Website Analysis Engine - Backend

FastAPI backend server for AI-powered website analysis using Groq.

## Features

- ✅ **14-Step Analysis Pipeline**
  1. Website Validation
  2. Website Crawling
  3. Content Extraction
  4. SEO Analysis
  5. Brand Analysis (AI)
  6. Audience Detection (AI)
  7. Business Summary (AI)
  8. Competitor Discovery (AI)
  9. Competitor Analysis (AI)
  10. Marketing Strategy (AI)
  11. 30-Day Campaign Calendar (AI)
  12. Content Generation (AI)
  13. AI Recommendations
  14. Knowledge Base Storage (ZendBX)

- 🤖 **Groq AI Integration**
  - Uses `llama-3.3-70b-versatile` model
  - Structured JSON responses
  - Expert-level business analysis

- 🗄️ **ZendBX Storage**
  - Complete analysis stored as structured JSON
  - Historical tracking
  - Fast retrieval

## Installation

### 1. Create Virtual Environment

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Mac/Linux
python3 -m venv venv
source venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
# Groq API Configuration
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile

# ZendBX Configuration
ZENDBX_API_URL=https://api.zendbx.in
ZENDBX_ANON_KEY=your_zendbx_anon_key_here
ZENDBX_PROJECT_SLUG=zen-smoking-post

# Server Configuration
HOST=0.0.0.0
PORT=8000
DEBUG=True

# CORS Origins (comma-separated)
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### 4. Create Database Tables

Run the SQL script in `DATABASE_SCHEMA.sql` in your ZendBX dashboard SQL editor.

## Running the Server

### Development Mode

```bash
# With auto-reload
python main.py

# Or using uvicorn directly
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Production Mode

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

The server will be available at `http://localhost:8000`

## API Endpoints

### Health Check

```
GET /health
```

Returns server health status and configuration check.

### Analyze Website

```
POST /api/analyze
```

**Request Body:**
```json
{
  "website_url": "https://example.com",
  "user_id": "user-uuid",
  "website_id": "website-uuid",
  "deep_crawl": true
}
```

**Response:**
```json
{
  "success": true,
  "analysis_id": "analysis-uuid",
  "data": {
    "business": {...},
    "brand": {...},
    "seo": {...},
    "competitors": [...],
    "marketing_strategy": {...},
    "campaign_calendar": [...],
    "content": {...},
    "recommendations": {...}
  },
  "message": "Website analysis completed successfully"
}
```

### Get Analysis

```
GET /api/analyze/{analysis_id}?user_id={user_id}
```

Returns analysis by ID.

### Get Website Analysis

```
GET /api/website/{website_id}/analysis?user_id={user_id}
```

Returns latest analysis for a website.

## Project Structure

```
backend/
├── main.py                         # FastAPI application entry point
├── requirements.txt                # Python dependencies
├── .env.example                    # Environment variables template
├── DATABASE_SCHEMA.sql             # ZendBX database schema
├── README.md                       # This file
└── services/
    ├── __init__.py
    ├── analysis_orchestrator.py    # Main orchestrator
    ├── website_validator.py        # Step 1: Validation
    ├── website_crawler.py          # Step 2: Crawling
    ├── content_extractor.py        # Step 3: Content extraction
    ├── seo_analyzer.py             # Step 4: SEO analysis
    ├── ai_analyzer.py              # Steps 5-13: AI analysis
    └── zendbx_service.py           # Step 14: Storage
```

## Dependencies

- **FastAPI** - Modern web framework
- **Uvicorn** - ASGI server
- **httpx** - Async HTTP client
- **BeautifulSoup4** - HTML parsing
- **trafilatura** - Content extraction
- **Groq** - AI analysis
- **python-dotenv** - Environment management

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GROQ_API_KEY` | Groq API key | Yes |
| `GROQ_MODEL` | Groq model name | Yes |
| `ZENDBX_API_URL` | ZendBX API URL | Yes |
| `ZENDBX_ANON_KEY` | ZendBX anonymous key | Yes |
| `ZENDBX_PROJECT_SLUG` | ZendBX project slug | Yes |
| `HOST` | Server host | No (default: 0.0.0.0) |
| `PORT` | Server port | No (default: 8000) |
| `DEBUG` | Debug mode | No (default: True) |
| `CORS_ORIGINS` | Allowed CORS origins | No (default: localhost:5173) |

## Getting API Keys

### Groq API Key

1. Go to [https://console.groq.com](https://console.groq.com)
2. Sign up or log in
3. Navigate to API Keys
4. Create a new API key
5. Copy the key to your `.env` file

### ZendBX Credentials

1. Go to your ZendBX dashboard
2. Select your project
3. Navigate to Settings → API
4. Copy the API URL, Anonymous Key, and Project Slug

## Error Handling

The API returns standard HTTP status codes:

- `200` - Success
- `400` - Bad Request (invalid input)
- `404` - Not Found
- `500` - Server Error

Error responses include a `detail` field with the error message.

## Logging

Logs are written to console with INFO level by default.

To change log level:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## Performance

- Analysis typically takes 2-3 minutes
- Deep crawl can analyze up to 50 pages
- Uses async operations for better performance
- Groq API is fast (~1-2s per AI call)

## Troubleshooting

### Analysis Fails

- Check GROQ_API_KEY is valid
- Check website is accessible
- Check ZendBX credentials are correct
- Review logs for specific errors

### Slow Analysis

- Reduce `max_pages` in `website_crawler.py`
- Set `deep_crawl=false` for faster analysis
- Check internet connection

### Database Errors

- Verify database schema is created
- Check ZendBX credentials
- Ensure user_id is valid UUID

## Development

### Run Tests

```bash
pytest
```

### Code Formatting

```bash
black .
```

### Linting

```bash
flake8
```

## Production Deployment

### Using Docker

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Using Railway/Render/Heroku

1. Push code to GitHub
2. Connect repository to hosting platform
3. Set environment variables in dashboard
4. Deploy

### Environment Variables in Production

Make sure to set all required environment variables in your hosting platform's dashboard.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## License

Proprietary - ZenPost

## Support

For issues or questions:
- Check logs first
- Review documentation
- Contact support

---

Built with ❤️ using FastAPI, Groq, and ZendBX
