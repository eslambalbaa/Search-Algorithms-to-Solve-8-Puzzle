#pragma once

#include "State.hpp"
#include <queue>
#include <unordered_map>
#include <unordered_set>
#include <vector>

class BFS {
public:
  static SearchResult bfs(const State &initial_state, const State &goal_state) {

    SearchResult result;

    if (State::goal_test(goal_state, initial_state)) {
      result.state_path = {initial_state};
      return result;
    }

    std::queue<State> frontier;
    std::unordered_set<State, StateHash> frontier_and_explored;
    std::unordered_map<State, std::pair<State, std::string>, StateHash>
        parent_map;

    frontier.push(initial_state);
    frontier_and_explored.insert(initial_state);

    while (!frontier.empty()) {
      State curr = frontier.front();
      frontier.pop();
      result.nodes_expanded++;

      for (const auto &[neighbor, action] : curr.neighbors()) {

        if (!frontier_and_explored.count(neighbor)) {

          parent_map[neighbor] = {curr, action};

          if (State::goal_test(goal_state, neighbor)) {
            SearchResult::reconstruct_path(neighbor, parent_map, result);
            return result;
          }

          frontier.push(neighbor);
          frontier_and_explored.insert(neighbor);
        }
      }
    }

    return result;
  }
};