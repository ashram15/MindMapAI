"""FastAPI backend that embeds user queries, 
retrieves matching Wikipedia records from the C++ vector 
engine, and falls back to Gemini-generated nodes when retrieval 
confidence is low."""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import urllib.parse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import json
import wikipedia
import requests
import base64
import numpy as np
from sentence_transformers import SentenceTransformer
import google.generativeai as genai
import os

# Get C++ engine URL from environment
# For Render: CPP_ENGINE_HOST will be the full service URL (e.g., https://mindmap-cpp-engine.onrender.com)
# For local/Docker: CPP_SERVER_URL can be set directly
CPP_ENGINE_HOST = os.getenv("CPP_ENGINE_HOST", "")
CPP_SERVER_URL = os.getenv("CPP_SERVER_URL", "")

if CPP_ENGINE_HOST and not CPP_SERVER_URL:
    # Construct full URL from host (add /search endpoint)
    CPP_SERVER_URL = f"{CPP_ENGINE_HOST}/search"
elif not CPP_SERVER_URL:
    # Fallback to localhost for development
    CPP_SERVER_URL = "http://localhost:8080/search"

DATA_FILE = "data.json"
MODEL_NAME = "all-MiniLM-L6-v2"

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
DEV_MODE = os.getenv("DEV_MODE", "false").lower() == "true"

if not GEMINI_API_KEY:
    print("Warning: GEMINI_API_KEY not found in environment variables.")

genai.configure(api_key=GEMINI_API_KEY)

gemini_model = genai.GenerativeModel(
    'gemini-3-flash-preview'
)


class SearchRequest(BaseModel):
    text: str
    k: int = 5
    persona: str = "general"  # Options: 'optimist', 'critic', 'historian'


class ImageRequest(BaseModel):
    image_base64: str


metadata = {}
model = None


def fetch_wiki_thumbnail(title):
    url = "https://en.wikipedia.org/w/api.php"
    params = {
        "action": "query",
        "format": "json",
        "prop": "pageimages",
        "titles": title,
        "pithumbsize": 500,
        "redirects": 1
    }
    headers = {"User-Agent": "MindMapAI/1.0"}
    try:
        response = requests.get(url, params=params, headers=headers, timeout=5)
        data = response.json()
        pages = data.get("query", {}).get("pages", {})
        for _, page_data in pages.items():
            if "thumbnail" in page_data:
                return page_data["thumbnail"]["source"]
    except:
        pass
    return None


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting API server...")
    global metadata
    # Load metadata immediately (fast)
    with open(DATA_FILE, "r") as f:
        raw_data = json.load(f)
        metadata = {item["id"]: item for item in raw_data}
    print("Metadata loaded!")

    # Load model in background thread to avoid blocking Railway health check
    import threading
    thread = threading.Thread(target=load_model_sync, daemon=True)
    thread.start()

    print("Server ready to accept requests!")

    yield
    print("Shutting down...")


def load_model_sync():
    """Load model in background thread"""
    global model
    print("Loading Embedding Model in background...")
    model = SentenceTransformer(MODEL_NAME)
    print("System Ready! Model loaded.")


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check endpoints
@app.get("/")
async def root():
    return {"status": "ok", "service": "python-api", "ready": model is not None}


@app.get("/health")
async def health():
    import os
    print(
        f"Health check called. Model loaded: {model is not None}. Port: {os.getenv('PORT', '8000')}")
    return {"status": "healthy"}


@app.post("/search")
def search(query: dict):
    user_text = query.get("text", "")
    top_k = query.get("k", 5)

    if DEV_MODE:
        return get_mock_response(user_text)

    # Wait for model to load if not ready yet
    if model is None:
        raise HTTPException(
            status_code=503, detail="Model still loading, please try again in a few seconds")

    if not user_text:
        raise HTTPException(status_code=400, detail="Text is required")

    print(f"Query: {user_text}")

    vector = model.encode(user_text)
    vector = vector / np.linalg.norm(vector)  # normalize vector

    cpp_results = []
    try:
        response = requests.post(CPP_SERVER_URL, json={
                                 "vector": vector.tolist(), "k": top_k})
        cpp_results = response.json()
    except:
        print("C++ Engine Offline")

    best_score = cpp_results[0]['score'] if cpp_results else 0.0

    if best_score > 0.35:
        print(f"Database Hit (Score: {best_score})")
        final_results = []
        for item in cpp_results:
            doc = metadata.get(str(item["id"]))
            if doc:
                final_results.append({
                    "id": item["id"],
                    "title": doc["title"],
                    "abstract": doc["abstract"],
                    "url": doc["url"],
                    "group": "Database"
                })
        return final_results

    else:
        print("Database Miss. Attempting Gemini Web Search...")

        prompt = f"""
        User Query: "{user_text}"
        Generate 5 distinct "Nodes" (related topics) for a Knowledge Graph.
        RETURN JSON ONLY: [ {{ "title": "...", "abstract": "...", "url": "..." }} ]
        """

        try:
            try:
                response = gemini_model.generate_content(prompt)
                text = response.text
                generated_nodes = json.loads(text)
                print("Plan A (Web Search) Successful!")

            except Exception as e:
                print(f"Plan A Failed ({e}). Switching to Plan B (Pure AI)...")

                fallback_model = genai.GenerativeModel(
                    'gemini-3-flash-preview')
                response = fallback_model.generate_content(prompt)

                text = response.text.replace(
                    "```json", "").replace("```", "").strip()
                generated_nodes = json.loads(text)
                print("Plan B (Pure AI) Successful!")

        except Exception as e:
            print(f"Plan B Failed ({e}). deploying Emergency Mock Data.")
            generated_nodes = [
                {
                    "title": f"About {user_text}",
                    "abstract": f"We couldn't reach the AI, but {user_text} is a fascinating topic.",
                    "url": "https://google.com"
                },
                {
                    "title": "Related Concept A",
                    "abstract": "This is a placeholder node to keep your demo alive.",
                    "url": "https://google.com"
                },
                {
                    "title": "Related Concept B",
                    "abstract": "This ensures the graph always expands.",
                    "url": "https://google.com"
                }
            ]

        for i, node in enumerate(generated_nodes):
            node["id"] = f"gen_{hash(user_text)}_{i}"
            node["group"] = "Gemini"
            if "url" not in node or not node["url"]:
                node["url"] = f"https://www.google.com/search?q={node['title']}"

        return generated_nodes


@app.post("/analyze-image")
def analyze_image(request: ImageRequest):
    """
    Takes a Base64 image, asks Gemini what's inside, and returns Graph Nodes.
    """
    print("Analyzing Image...")
    if DEV_MODE:
        return get_mock_response(request.image_base64)
    try:
        if "," in request.image_base64:
            clean_base64 = request.image_base64.split(",")[1]
        else:
            clean_base64 = request.image_base64

        image_data = {'mime_type': 'image/jpeg', 'data': clean_base64}

        prompt = """
        Analyze this image. 
        1. Identify the MAIN SUBJECT of the image. This will be the first item.
        2. Identify 5 related sub-concepts or hidden details found in the image.
        
        CRITICAL: Return ONLY valid JSON with NO additional text or markdown.
        Do NOT wrap in ```json or ``` blocks.
        For the first item (the Main Subject), the 'title' MUST be a specific, descriptive name of what is in the image (e.g., "Golden Retriever", "Eiffel Tower", "Sushi Platter"). Do NOT use generic names like "Image", "Photo", or "Main Topic".

        Format:
        [
            {"id": "main_topic", "title": "Descriptive Name", "abstract": "Description of the image", "group": "Gemini"},
            {"id": "sub_1", "title": "Related Concept", "abstract": "Brief description", "group": "Gemini"}
        ]
        """

        analyze_model = genai.GenerativeModel('gemini-3-flash-preview')
        response = analyze_model.generate_content([prompt, image_data])

        text_response = response.text.replace(
            "```json", "").replace("```", "").strip()

        # Try to extract JSON array
        import re
        array_match = re.search(r'\[[\s\S]*\]', text_response)
        if array_match:
            text_response = array_match.group(0)

        try:
            nodes = json.loads(text_response)
        except json.JSONDecodeError as e:
            print(f"❌ Image Analysis JSON Parse Error: {e}")
            print(f"[DEBUG] Response: {response.text[:500]}")
            # Return fallback
            return [{
                "id": "parse-error",
                "title": "Image Analysis Error",
                "abstract": "Could not parse AI response for image analysis",
                "group": "Gemini",
                "val": 15
            }]

        for i, node in enumerate(nodes):
            if i == 0:
                node['id'] = f"img_main_{hash(node['title'])}"
            else:
                node['id'] = f"img_sub_{i}_{hash(node['title'])}"

            node['url'] = f"https://www.google.com/search?q={node['title']}"

        return nodes

    except Exception as e:
        print(f"Vision Error: {e}")
        return [{
            "id": "error",
            "title": "Image Error",
            "abstract": "Could not analyze image. Try a clearer photo.",
            "group": "Gemini",
            "color": "red"
        }]


def get_mock_response(topic):
    """Returns free, fake data for testing UI mechanics."""
    print(f"⚠️ DEV MODE: Returning mock data for '{topic}'")
    return [
        {"id": "mock-1", "title": f"{topic} (Mock 1)", "abstract": "This is a fake node to save API credits.",
         "group": "Gemini", "url": "https://google.com"},
        {"id": "mock-2", "title": f"{topic} (Mock 2)", "abstract": "Another fake node for testing.",
         "group": "Gemini", "url": "https://google.com"},
        {"id": "mock-3", "title": f"{topic} (Mock 3)", "abstract": "Testing the 3D graph layout.",
         "group": "Gemini", "url": "https://google.com"},
        {"id": "mock-4", "title": f"{topic} (Mock 4)", "abstract": "Save your credits for the demo!",
         "group": "Gemini", "url": "https://google.com"},
        {"id": "mock-5", "title": f"{topic} (Mock 5)", "abstract": "UI looks good though.",
         "group": "Gemini", "url": "https://google.com"},
    ]


@app.post("/research-agent")
def research_agent(request: SearchRequest):
    """
    Marathon Agent Mode: 
    1. Analyzes the complexity of the request.
    2. Formulates a multi-step plan.
    3. Executes the plan using C++ retrieval.
    4. Returns the 'Thought Process' + 'Final Graph'.
    """

    # 1. DEV MODE
    if DEV_MODE:
        return {
            "thoughts": [
                "🤔 Analyzing complexity of request...",
                "🔍 Detected conflict in physics theories.",
                "📚 retrieving 'Hawking Radiation' from Vector DB...",
                "💡 Synthesizing 3D structure..."
            ],
            "nodes": get_mock_response(request.text)
        }

    print(f"Agent ({request.persona}) activated for: {request.text}")

    try:
        # Define Persona Instructions
        persona_guide = ""
        if request.persona == "optimist":
            persona_guide = "ROLE: You are an OPTIMIST FUTURIST. Focus ONLY on the potential, benefits, and future applications. Ignore downsides. COLOR: Blue."
        elif request.persona == "critic":
            persona_guide = "ROLE: You are a CRITICAL SKEPTIC. Focus ONLY on risks, ethical dilemmas, failure modes, and limitations. Ignore hype. COLOR: Red."
        elif request.persona == "historian":
            persona_guide = "ROLE: You are a HISTORIAN. Focus ONLY on the origins, key figures, and past milestones. Ignore current hype. COLOR: Gold."
        else:
            persona_guide = "ROLE: General Researcher."

        prompt = f"""
        You are an Autonomous Research Agent. The user wants to map: "{request.text}".
        {persona_guide}
        
        Task:
        1. Identify 5 distinct key sub-concepts related to the topic FROM YOUR SPECIFIC PERSPECTIVE.
        2. Assign them a 'group' name corresponding to your persona ('Optimist', 'Critic', 'Historian').
        
        CRITICAL: Return ONLY valid JSON with NO additional text, explanations, or markdown.
        Do NOT wrap in ```json or ``` blocks.
        Format:
        {{
            "thoughts": [
                "1. Analyzing '{request.text}' through {request.persona} lens...", 
                "2. Identifying key angles..."
            ],
            "nodes": [
                {{"id": "node1", "title": "Concept 1", "abstract": "Brief description", "group": "{request.persona.capitalize()}", "val": 15}},
                {{"id": "node2", "title": "Concept 2", "abstract": "Brief description", "group": "{request.persona.capitalize()}", "val": 15}}
            ]
        }}
        """

        # 3. CALL GEMINI
        research_model = genai.GenerativeModel('gemini-3-flash-preview')
        response = research_model.generate_content(prompt)

        # 4. CLEAN & PARSE with robust JSON extraction
        raw_text = response.text.strip()
        print(
            f"[DEBUG] Raw Gemini response (first 200 chars): {raw_text[:200]}")

        # Strategy 1: Remove markdown code blocks
        clean_text = raw_text.replace("```json", "").replace("```", "").strip()

        # Strategy 2: Try to extract JSON object using multiple patterns
        import re

        # Try to find outermost JSON object
        json_match = re.search(
            r'\{(?:[^{}]|(?:\{[^{}]*\}))*\}', clean_text, re.DOTALL)
        if json_match:
            clean_text = json_match.group(0)
        else:
            # Fallback: find anything between first { and last }
            start = clean_text.find('{')
            end = clean_text.rfind('}')
            if start != -1 and end != -1 and end > start:
                clean_text = clean_text[start:end+1]

        print(f"[DEBUG] Cleaned JSON (first 200 chars): {clean_text[:200]}")

        try:
            data = json.loads(clean_text)
        except json.JSONDecodeError as e:
            print(f"❌ JSON Parse Error: {e}")
            print(f"[DEBUG] Full raw response:\n{raw_text}")
            # Return a valid fallback structure
            return {
                "thoughts": ["⚠️ Could not parse AI response", f"Error: {str(e)}"],
                "nodes": [{
                    "id": "parse-error",
                    "title": f"Parsing Error for {request.text}",
                    "abstract": "The AI response could not be parsed. Using fallback data.",
                    "group": request.persona.capitalize(),
                    "val": 15
                }]
            }

        # 5. POST-PROCESS (The Fix: Force Unique IDs)
        if "nodes" in data:
            for i, node in enumerate(data["nodes"]):
                # FIX 1: Generate a unique ID from the title (removes spaces, lowers case)
                # e.g. "Neural Networks" -> "neural-networks"
                safe_id = node.get(
                    'title', 'unknown').lower().replace(" ", "-")
                # Add index to ensure uniqueness even if titles are similar
                node['id'] = f"{safe_id}-{i}"

                # FIX 2: Smart URLs (Scholar)
                safe_title = urllib.parse.quote(node.get('title', ''))
                node['url'] = f"https://scholar.google.com/scholar?q={safe_title}"

        return data

    except Exception as e:
        print(f"❌ Agent Error: {e}")
        # Return a "Error Graph" so the frontend doesn't crash with NULL
        return {
            "thoughts": ["❌ Error parsing AI response", "⚠️ Reverting to fallback mode"],
            "nodes": [{
                "id": "error",
                "title": "Agent Error",
                "abstract": "The Agent could not process this request. Check the backend logs.",
                "color": "red",
                "val": 20
            }]
        }


@app.post("/get-node-image")
def get_node_image(request: SearchRequest):
    """
    Fetches ONLY the most relevant image for a topic.
    Priority:
    1. Wikipedia API Thumbnail (Best quality, converted to PNG)
    2. Wikipedia Page Images (Fallback, filtering SVGs if possible)
    3. None
    """
    if DEV_MODE:
        return {"image": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Image_created_with_a_mobile_phone.png/640px-Image_created_with_a_mobile_phone.png"}

    # Plan A: Get official thumbnail via API (Best quality)
    thumb = fetch_wiki_thumbnail(request.text)
    if thumb:
        return {"image": thumb}

    try:
        # Plan B: Fallback to scraping images list
        page = wikipedia.page(request.text, auto_suggest=False)

        if page.images:
            # Try to find a non-svg if possible
            valid_images = [
                img for img in page.images if not img.lower().endswith('.svg')]

            if valid_images:
                return {"image": valid_images[0]}

            # If only SVGs exist, return the first one
            return {"image": page.images[0]}
        else:
            return {"image": None}

    except:
        return {"image": None}
