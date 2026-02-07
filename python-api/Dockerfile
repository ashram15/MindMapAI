# Use slim Python image for smaller size
FROM python:3.11-slim

WORKDIR /app

# Copy only necessary files
COPY api.py .
COPY data.json .
COPY create_embeddings.py .

# Install dependencies with no cache to reduce size
RUN pip install --no-cache-dir \
    fastapi==0.104.1 \
    uvicorn[standard]==0.24.0 \
    requests==2.31.0 \
    numpy==1.26.2 \
    sentence-transformers==2.2.2 \
    google-generativeai==0.3.2 \
    python-dotenv==1.0.0 \
    wikipedia==1.4.0 && \
    rm -rf /root/.cache/pip

# Pre-download ML models during build (fixes Railway timeout)
RUN python3 -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

EXPOSE 8000

CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000"]