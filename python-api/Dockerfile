# Use slim Python image for smaller size
FROM python:3.11-slim

WORKDIR /app

# Copy application files first
COPY api.py .
COPY data.json .
COPY create_embeddings.py .

# Install PyTorch CPU-only (much smaller than GPU version) - v2.2+ for compatibility
RUN pip install --no-cache-dir torch==2.2.0 --index-url https://download.pytorch.org/whl/cpu

# Install remaining dependencies
RUN pip install --no-cache-dir \
    fastapi==0.104.1 \
    uvicorn[standard]==0.24.0 \
    requests==2.31.0 \
    numpy==1.26.2 \
    sentence-transformers==2.7.0 \
    google-generativeai==0.8.3 \
    python-dotenv==1.0.0 \
    wikipedia==1.4.0 && \
    rm -rf /root/.cache/pip && \
    rm -rf /tmp/* && \
    find /usr/local/lib/python3.11 -type d -name "tests" -o -name "test" | xargs rm -rf

EXPOSE 8000

# Railway sets PORT env var - use it if available, default to 8000
CMD uvicorn api:app --host 0.0.0.0 --port ${PORT:-8000}