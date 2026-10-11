#pragma once

#include "DFS.hpp"
#include "State.hpp"
#include <cstdint>

class Iterative_DFS {
public:
  static SearchResult iterative_dfs(const State &initial_state,
                                    const State &goal_state) {

    SearchResult final_result;

    uint64_t total_nodes_expanded = 0;
    int64_t depth = 0;

    while (true) {
      SearchResult current_result = DFS::dfs(initial_state, goal_state, depth);

      total_nodes_expanded += current_result.nodes_expanded;

      if (!current_result.state_path.empty()) {
        final_result = current_result;
        final_result.nodes_expanded = total_nodes_expanded;
        break;
      }

      depth++;
    }

    return final_result;
  }
};
