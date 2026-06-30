# 🧠 MindMapAI
https://github.com/user-attachments/assets/81557363-25f6-46ec-9361-b6fa669a538f


> **An AI-powered 3D knowledge graph visualization system that transforms Wikipedia data into an immersive, interactive learning experience**

MindMapAI is a full-stack application that combines high-performance vector search, AI research agents, and stunning 3D visualizations to create a unique knowledge exploration platform. Built with a microservices architecture featuring a C++ vector engine, Python AI backend, and Next.js frontend.

<p align="center">
  <img src="https://img.shields.io/badge/C++-00599C?style=for-the-badge&logo=c%2B%2B&logoColor=white" />
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=three.js&logoColor=white" />

</p>

## Goal
Have you ever been so deep into research where you forget the main question you started with? When building and designing MindMapAI, I thought about
a way to solve this issue. What if all my research wasn't just multiple open tabs on my laptop, but instead a MindMap of related nodes, where I could jump through
topics and visualize their relations all at once, without having to search through tabs.

Solving this problem was the main motivation behind MindMapAI.

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
### **Auto-Pilot Mode**
- Autonomous deep exploration of related topics

## Usage 
<!-- Upload a photo of a real useful output of MindMap AI - examine use cases etc. 
Image upload flow 
Text query  -->

## Technology Stack

### **Frontend**
| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 16.1.5 | React framework with server-side rendering |
| **React** | 19.2.3 | UI component library |
| **Three.js** | 0.182.0 | 3D rendering engine |
| **react-force-graph-3d** | 1.29.0 | Force-directed 3D graph visualization |
| **three-spritetext** | 1.10.0 | 3D text labels |
| **TailwindCSS** | 4.x | Utility-first CSS framework |
| **TypeScript** | 5.x | Type-safe JavaScript |

### **Backend (Python API)**
| Technology | Version | Purpose |
|------------|---------|---------|
| **FastAPI** | Latest | High-performance async web framework |
| **Sentence Transformers** | Latest | Text embedding generation |
| **Google Generative AI** | Latest | Gemini 3.0 Flash integration |
| **NumPy** | Latest | Numerical operations |
| **Wikipedia** | Latest | Wikipedia API wrapper |
| **python-dotenv** | Latest | Environment variable management |
| **Pydantic** | Latest | Data validation |

### **Vector Engine (C++)**
| Technology | Purpose |
|------------|---------|
| **C++17** | High-performance vector operations |
| **cpp-httplib** | HTTP server library |
| **nlohmann/json** | JSON parsing |
| **STL** | Vector and algorithm implementations |

### **Infrastructure**
| Technology | Purpose |
|------------|---------|
| **Docker** | Containerization |
| **Docker Compose** | Multi-container orchestration |

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

