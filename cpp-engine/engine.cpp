/* Standalone engine file for local testing.
Contains tests that loads `vectors.bin`, runs a sample similarity query,
and prints search timing plus top matches. */

#include <algorithm>
#include <chrono>
#include <cmath>
#include <cstdio>
#include <iostream>
#include <vector>

using namespace std;

struct VectorDatabase
{
  int num_vectors;
  int vector_dim;
  vector<float> data;

  bool load(const char *filename)
  {
    FILE *f = fopen(filename, "rb");
    if (!f)
    {
      cerr << "Error: Could not open " << filename << endl;
      return false;
    }

    fread(&num_vectors, sizeof(int), 1, f);
    fread(&vector_dim, sizeof(int), 1, f);

    cout << "Loading " << num_vectors << " vectors with dimension "
         << vector_dim << "..." << endl;

    data.resize(num_vectors * vector_dim);

    fread(data.data(), sizeof(float), data.size(), f);
    fclose(f);
    return true;
  }

  const float *get_vector(int i) const { return &data[i * vector_dim]; }

  // search logic
  vector<pair<float, int>> search(const float *query_vec, int k)
  {
    vector<pair<float, int>> results;
    results.reserve(num_vectors);

    for (int i = 0; i < num_vectors; ++i)
    {
      const float *target_vec = get_vector(i);
      float score = 0.0f;

      // dot product score of the normalized vectors
      for (int j = 0; j < vector_dim; ++j)
      {
        score += query_vec[j] * target_vec[j];
      }

      results.push_back({score, i});
    }

    // sort the dot product scores in descending order
    sort(results.begin(), results.end(),
         [](const auto &a, const auto &b)
         { return a.first > b.first; });

    // we need top k values, so restrict size to k
    if (results.size() > k)
    {
      results.resize(k);
    }

    return results;
  }
};

int main()
{
  VectorDatabase db;

  if (!db.load("vectors.bin"))
  {
    cerr << "Failed to load vectors.bin" << endl;
    return 1;
  }

  cout << "Engine ready. Loaded " << db.num_vectors << " vectors." << endl;

  std::cout << "\nRunning Test Search (Query = Vector #0)..." << std::endl;

  auto start = std::chrono::high_resolution_clock::now();

  auto results = db.search(db.get_vector(0), 5);

  auto end = std::chrono::high_resolution_clock::now();
  std::chrono::duration<double, std::milli> elapsed = end - start;

  for (int i = 0; i < results.size(); ++i)
  {
    std::cout << "Rank " << i + 1 << ": ID " << results[i].second
              << " | Score: " << results[i].first << std::endl;
  }

  std::cout << "\nSearch Time: " << elapsed.count() << " ms" << std::endl;

  return 0;
}
