import requests
import json
import time

# 1. Create a fake query vector with 384 zeros (matching your model)
dummy_vector = [0.0] * 384 

url = "http://localhost:8080/search"
payload = {
    "k": 5,
    "vector": dummy_vector
}

print(f"Sending request to {url}...")
try:
    start = time.time()
    response = requests.post(url, json=payload)
    end = time.time()

    print(f"Status Code: {response.status_code}")
    print(f"Time Taken: {(end-start)*1000:.2f} ms")
    print("Response from C++ Engine:")
    print(json.dumps(response.json(), indent=2))
    
except Exception as e:
    print(f"Error: {e}")
    print("Is the server running in a separate terminal?")