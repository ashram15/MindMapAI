# This script flattens the 2d matrix of numbers into a 1d binary stream so that the 
# C++ code can load it in one single fread command which makes this extremely fast. 

import json
import numpy as np
import struct
from sentence_transformers import SentenceTransformer

INPUT_FILE = "data.json"
OUTPUT_BIN = "vectors.bin"
MODEL_NAME = "all-MiniLM-L6-v2" # Creates 384-dimensional vectors

print("1. Loading Model...")
model = SentenceTransformer(MODEL_NAME)

print(f"2. Loading Data from {INPUT_FILE}...")
with open(INPUT_FILE, 'r') as f:
    data = json.load(f)

texts = [f"{item['title']}. {item['abstract']}" for item in data]
ids = [item['id'] for item in data]

print(f"3. Generating Vectors for {len(texts)} items (this may take a moment)...")
embeddings = model.encode(texts, show_progress_bar=True)

embeddings = embeddings / np.linalg.norm(embeddings, axis=1, keepdims=True)

print(f"4. Saving to {OUTPUT_BIN}...")
num_vectors, vector_dim = embeddings.shape

with open(OUTPUT_BIN, "wb") as f:
    f.write(struct.pack('i', num_vectors))
    f.write(struct.pack('i', vector_dim))
    
    embeddings.astype('float32').tofile(f)

print("Done!")
print(f"  - Vectors: {num_vectors}")
print(f"  - Dimensions: {vector_dim}")
print(f"  - File size: {len(embeddings.tobytes()) / 1024 / 1024:.2f} MB")