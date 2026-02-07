from datasets import load_dataset
import json

OUTPUT_FILE = "data.json"
MAX_ARTICLES = 2000

print("Streaming Wikipedia (this allows us to download only what we need)...")
ds = load_dataset("wikimedia/wikipedia", "20231101.en", split="train", streaming=True)

data = []
print("Fetching articles...")

for i, article in enumerate(ds):
    if len(data) >= MAX_ARTICLES:
        break

    if len(article['text']) < 500:
        continue
    abstract = article['text'][:400] + "..."

    data.append({
        "id": str(len(data)),
        "title": article['title'],
        "abstract": abstract,
        "url": article['url'],
        "date": "2024"
    })

    if len(data) % 100 == 0:
        print(f"Collected {len(data)} articles...")

with open(OUTPUT_FILE, "w") as f:
    json.dump(data, f, indent=2)

print(f"Success! Saved {len(data)} Wikipedia articles to {OUTPUT_FILE}")