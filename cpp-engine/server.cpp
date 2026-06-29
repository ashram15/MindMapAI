#include "httplib.h"
/* HTTP vector-search server that loads the binary embedding store, scores query vectors,
and returns the top-K nearest Wikipedia document IDs. Real HTTP service version of engine.cpp
with exposed endpoints like /search and /health*/

#include "json.hpp"
#include <algorithm>
#include <cmath>
#include <cstdio>
#include <iostream>
#include <vector>

using json = nlohmann::json;

struct VectorDatabase
{
  int num_vectors;
  int vector_dim;
  std::vector<float> data;

  bool load(const char *filename)
  {
    FILE *f = fopen(filename, "rb");
    if (!f)
      return false;
    fread(&num_vectors, sizeof(int), 1, f);
    fread(&vector_dim, sizeof(int), 1, f);
    data.resize(num_vectors * vector_dim);
    fread(data.data(), sizeof(float), data.size(), f);
    fclose(f);
    return true;
  }

  const float *get_vector(int i) const { return &data[i * vector_dim]; }

  std::vector<std::pair<float, int>> search(const std::vector<float> &query_vec,
                                            int k)
  {
    std::vector<std::pair<float, int>> results;

    if (query_vec.size() != vector_dim)
      return results;

    results.reserve(num_vectors);

    for (int i = 0; i < num_vectors; ++i)
    {
      const float *target_vec = get_vector(i);
      float score = 0.0f;
      for (int j = 0; j < vector_dim; ++j)
      {
        score += query_vec[j] * target_vec[j];
      }
      results.push_back({score, i});
    }

    std::sort(results.begin(), results.end(),
              [](const auto &a, const auto &b)
              { return a.first > b.first; });

    if (results.size() > k)
      results.resize(k);
    return results;
  }
};

int main()
{
  std::cout << "Initializing Engine..." << std::endl;
  VectorDatabase db;
  if (!db.load("vectors.bin"))
  {
    std::cerr << "Error: vectors.bin not found!" << std::endl;
    return 1;
  }
  std::cout << "Engine Loaded: " << db.num_vectors << " items." << std::endl;

  httplib::Server svr;

  // Health check endpoints
  svr.Get("/", [](const httplib::Request &req, httplib::Response &res)
          { res.set_content("{\"status\":\"ok\",\"service\":\"cpp-engine\"}", "application/json"); });

  svr.Get("/health", [](const httplib::Request &req, httplib::Response &res)
          { res.set_content("{\"status\":\"healthy\"}", "application/json"); });

  svr.Post("/search", [&](const httplib::Request &req, httplib::Response &res)
           {
    try {
      auto input = json::parse(req.body);
      std::vector<float> query = input["vector"];
      int k = input.value("k", 5);
      auto results = db.search(query, k);

      json output = json::array();
      for (const auto &pair : results) {
        output.push_back({{"id", pair.second}, {"score", pair.first}});
      }

      res.set_content(output.dump(), "application/json");

    } catch (...) {
      res.status = 400;
      res.set_content("{\"error\":\"Invalid JSON\"}", "application/json");
    } });

  std::cout << "Server listening on http://localhost:8080" << std::endl;
  svr.listen("0.0.0.0", 8080);

  return 0;
}