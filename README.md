# 🧠 MindMapAI
https://github.com/user-attachments/assets/81557363-25f6-46ec-9361-b6fa669a538f


> **An AI-powered 3D knowledge graph visualization system that transforms Wikipedia data into an immersive, interactive learning experience**

MindMapAI is a full-stack application that combines high-performance vector search, AI research agents, and 3D visualizations to create a unique knowledge exploration platform. Built with a microservices architecture featuring a C++ vector engine, Python AI backend, and Next.js frontend.

<p align="center">
  <img src="https://img.shields.io/badge/C++-00599C?style=for-the-badge&logo=c%2B%2B&logoColor=white" />
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=three.js&logoColor=white" />

</p>

## Motivation 
Deep research sessions often end the same way: dozens of open tabs, no clear 
sense of how ideas connect, and the original question buried somewhere in the 
middle. MindMapAI replaces that chaos with a navigable 3D knowledge graph, where 
instead of jumping between tabs, you explore relationships between ideas 
visually, in one place.

## Features 
### **Multi-Agent Research System**
- **Three Research Personas**:
  - 🟢 **Optimist**: Highlights opportunities, benefits, and positive aspects
  - 🔴 **Critic**: Identifies risks, challenges, and potential issues
  - 🟡 **Historian**: Provides historical context and evolutionary perspective

### **High-Performance Vector Search**
- **C++ Vector Engine** performs cosine similarity search using dot product calculations between text query (vectorized and normalized) and wikipedia data (vectorized and normalized)
- **Sentence Transformers** from HuggingFace to create the text embeddings and transform the text query and wikipedia text into dimensional vectors

### **Image Analysis**
- Upload images to extract concepts and generate related knowledge graphs


## Usage 

### 1. Standard Knowledge Search 
Type any topic into the text search bar and MindMapAI generates a 3D graph of the most semantically related Wikipedia articles, ranked by cosine similarity (dot product calculation).
![alt text](usage_assets/image.png)

### 2. Out-of-database Topics (Google Gemini Fallback)
If a query isn't well-represented in the vector database, MindMapAI automatically queries Gemini to surface relevant information and related topic nodes before falling back to vector search — so results stay relevant even for niche or recent topics.
![alt text](usage_assets/image-1.png)

### 3. Multi-Agent Research Mode 
Activate Optimist, Critic, and Historian agents to explore a topic from three perspectives simultaneously. Each agent runs its own Gemini-prompted analysis and surfaces its own top-5 related nodes, letting you see a topic's opportunities, risks, and historical context side-by-side on the graph.
![alt text](usage_assets/image3.png)

### 4. Image-Based Exploration 
Upload an image and MindMapAI extracts key concepts using Gemini, then runs a vector search for each concept to find related articles. Results are deduplicated, ranked, and rendered directly into the graph.
![alt text](usage_assets/image4.png)

## Architecture Overview 
```text
User → Next.js Frontend → Python API (FastAPI)
                              ├─→ C++ Vector Engine (similarity search)
                              ├─→ Gemini API (research agent personas + fallback)
                              ├─→ HuggingFace - Sentence Transformers (embeddings)
                              └─→ Wikipedia API (data source)
```


## Technology Stack

### **Frontend**
| Technology | Purpose |
|------------|---------|
| **Next.js** | React framework with server-side rendering |
| **React** | UI component library |
| **Three.js** | 3D rendering engine |
| **react-force-graph-3d** | Force-directed 3D graph visualization |
| **three-spritetext** | 3D text labels |
| **TailwindCSS** | Utility-first CSS framework |
| **TypeScript** | Type-safe JavaScript |

### **Backend (Python API)**
| Technology | Purpose |
|------------|---------|
| **FastAPI** | High-performance async web framework |
| **Sentence Transformers** | Text embedding generation |
| **Google Generative AI** | Gemini 3 Flash Preview integration |
| **NumPy** | Numerical Operations |
| **Wikipedia** | Wikipedia API wrapper |

### **Vector Engine (C++)**
| Technology | Purpose |
|------------|---------|
| **C++17** | High-performance vector operations |
| **cpp-httplib** | HTTP server library |
| **nlohmann/json** | JSON parsing |

### **Infrastructure**
| Technology | Purpose |
|------------|---------|
| **Docker** | Containerization |
| **Docker Compose** | Multi-container orchestration |


## Sequence Diagram - How it works   

```mermaid
sequenceDiagram
   actor User
   participant Frontend
   participant PythonAPI as Python-API
   participant Embedder
   participant VectorEngine as Vector-Engine
   participant VectorFile as Vector-File
   participant Metadata

    User->>Frontend: Enter search query
   Frontend->>PythonAPI: POST /search { text, k }
    
   PythonAPI->>Embedder: Encode text
   Embedder-->>PythonAPI: 384-dim vector (normalized)
    
   PythonAPI->>VectorEngine: POST /search { query_vector }
   VectorEngine->>VectorFile: Load vectors
   VectorFile-->>VectorEngine: Vector array
    
    loop For each vector
      VectorEngine->>VectorEngine: Calculate dot product
    end
    
   VectorEngine->>VectorEngine: Sort by similarity
   VectorEngine-->>PythonAPI: Top-K results [ID, score]
    
    loop For each result
      PythonAPI->>Metadata: Get article by ID
      Metadata-->>PythonAPI: {title, abstract, url}
    end
    
   PythonAPI-->>Frontend: JSON results with metadata
    Frontend->>Frontend: Render 3D nodes
    Frontend-->>User: Display knowledge graph
```

## Challenges and Learnings  
### Cross-Container Networking with Docker Compose
Docker networking behaves differently depending on *where* the request 
originates. Server-to-server calls (Python API → C++ engine) use Docker's 
internal Domain Name Service (DNS), so the Python API reaches the C++ engine via 
`http://cpp_engine:8080`, the service name defined in `docker-compose.yml`, and
resolves automatically within the Docker network.

However, frontend API calls (client side Next.js code) use `localhost:8000` because they are made from the browser and 
execute outside the Docker network entirely.
Instead, these requests go through the host machine, which reaches the Docker container via the 
exposed port mapping. This distinction between browser-originated and 
server-originated requests was a key debugging insight when connections 
weren't resolving as expected.

### Choosing Deployment Environments
Deploying three microservices meant no single platform could host everything. 
Vercel was ideal for the Next.js frontend (optimized for server side rendering (SSR)), but 
couldn't host the Python API or C++ engine, as they required general-purpose backend infrastructure. 
The backend was deployed on Render after testing Railway, with the main constraint being free tier file 
size limits.
The `vectors.bin` file for the C++ engine had to be reduced to 
fit within platform limits, which meant limiting the size of the vector 
database. 
To stay within these limits, the vector file was intentionally restricted: 
the app streams the Wikimedia dataset, caps at 2,000 articles, skips 
short pages, and stores only each article's title plus the first 400 
characters as the abstract. Embeddings are stored as float32 in a compact 
binary format (`vectors.bin`), resulting in a 2,000 × 384 matrix (~3MB total), well within bounds of free tier file size limits. 
`vectors.bin` is also treated as a generated artifact in `.gitignore` and reproduced from `data.json` at build time rather than shipped in the repo.

### Optimizing API Calls
To avoid hitting Gemini API rate limits during development, a dev mode flag 
was implemented to return mock data instead of making real API calls. This 
significantly sped up debugging cycles for the multi-agent research flow.

### C++ and Python API Integration
The main integration challenge was JSON formatting mismatches between the 
C++ HTTP server responses and what the FastAPI backend expected. Aligning 
serialization formats across both services required careful debugging of 
request/response payloads.

### Concurrency and the Need for C++
Python's Global Interpreter Lock (GIL) prevents true parallelism for 
CPU-intensive work, making it a poor fit for looping dot product calculations 
over thousands of vectors. Offloading the similarity search to a separate C++ 
microservice eliminated this bottleneck, enabling native parallelism and lower 
latency at search time.


## How to run the app locally

### Prerequisites

- **Docker** & **Docker Compose**
- OR manually install:
  - Python 3.9+
  - Node.js 18+
  - C++ compiler (g++/clang)
  - Make

### Using Docker 

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/MindMapAI.git
   cd MindMapAI
   ```

2. **Set up environment variables**
   ```bash
   cd python-api
   cp .env.example .env
   # Edit .env and add your GEMINI_API_KEY
   nano .env
   ```

3. **Build and run with Docker Compose**
   ```bash
   cd ..
   docker-compose up --build
   ```

4. **Access the application**
   - Frontend: [http://localhost:3000](http://localhost:3000)
   - Python API: [http://localhost:8000](http://localhost:8000)
   - C++ Engine: [http://localhost:8080](http://localhost:8080)


