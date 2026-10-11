#pragma once

#include "State.hpp"
#include <cstdint>
#include <stack>
#include <sys/stat.h>
#include <unordered_map>
#include <utility>
#include <vector>

class DFS {
public:
  static SearchResult dfs(const State &initial_state, const State &goal_state,
                          int64_t depth_limit = -1) {

    SearchResult result;

    if (State::goal_test(goal_state, initial_state)) {
      result.state_path = {initial_state};
      return result;
    }

    std::stack<std::pair<State, int>> frontier;
    std::unordered_map<State, int, StateHash> explored_depth;
    std::unordered_map<State, std::pair<State, std::string>, StateHash>
        parent_map;

    frontier.push({initial_state, 0});
    explored_depth[initial_state] = 0;

    while (!frontier.empty()) {
      auto [curr, curr_depth] = frontier.top();
      frontier.pop();
      result.nodes_expanded++;

      if (State::goal_test(goal_state, curr)) {
        SearchResult::reconstruct_path(curr, parent_map, result);
        return result;
      }

      if (depth_limit != -1 and curr_depth >= depth_limit) {
        continue;
      }

      for (const auto &[neighbor, action] : curr.neighbors()) {
        int next_depth = curr_depth + 1;

        if (!explored_depth.count(neighbor) or
            next_depth < explored_depth[neighbor]) {

          parent_map[neighbor] = {curr, action};
          explored_depth[neighbor] = next_depth;
          frontier.push({neighbor, curr_depth + 1});
        }
      }
    }

    return result;
  }
};