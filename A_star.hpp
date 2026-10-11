#pragma once

#include "State.hpp"
#include <cmath>
#include <cstdint>
#include <queue>
#include <sys/stat.h>
#include <unordered_map>
#include <utility>
#include <vector>

enum class Heuristic { MANHATTAN, EUCLIDEAN };

struct AStarCompare {
  bool operator()(const std::pair<double, State> &a,
                  const std::pair<double, State> &b) const {
    return a.first > b.first;
  }
};

class A_star {
public:
  static SearchResult a_star(const State &initial_state,
                             const State &goal_state,
                             Heuristic heuristic_type) {

    SearchResult result;

    if (State::goal_test(goal_state, initial_state)) {
      result.state_path = {initial_state};
      return result;
    }

    using PQElement = std::pair<double, State>;
    std::priority_queue<PQElement, std::vector<PQElement>, AStarCompare>
        frontier;
    std::unordered_map<State, int, StateHash> g_score;
    std::unordered_map<State, std::pair<State, std::string>, StateHash>
        parent_map;

    g_score[initial_state] = 0;
    double initial_h = calculate_heuristic(initial_state, heuristic_type);
    frontier.push({initial_h, initial_state});

    while (!frontier.empty()) {
      State curr = frontier.top().second;
      frontier.pop();
      result.nodes_expanded++;

      if (State::goal_test(goal_state, curr)) {
        SearchResult::reconstruct_path(curr, parent_map, result);
        return result;
      }

      int curr_g = g_score[curr];

      for (const auto &[neighbor, action] : curr.neighbors()) {
        int test_g = curr_g + 1;

        if (g_score.find(neighbor) == g_score.end() or
            test_g < g_score[neighbor]) {

          parent_map[neighbor] = {curr, action};
          g_score[neighbor] = test_g;

          double f_score =
              test_g + calculate_heuristic(neighbor, heuristic_type);
          frontier.push({f_score, neighbor});
        }
      }
    }

    return result;
  }

private:
  static double calculate_heuristic(const State &state, Heuristic type) {
    double h = 0.0;
    for (uint16_t i = 0; i < BOARD_SIZE; ++i) {
      for (uint16_t j = 0; j < BOARD_SIZE; ++j) {
        uint16_t val = state.board[i][j];

        if (val != 0) {
          int goal_i = val / BOARD_SIZE;
          int goal_j = val % BOARD_SIZE;

          if (type == Heuristic::MANHATTAN) {
            h += std::abs(i - goal_i) + std::abs(j - goal_j);
          } else if (type == Heuristic::EUCLIDEAN) {
            h += std::sqrt(std::pow(i - goal_i, 2) + std::pow(j - goal_j, 2));
          }
        }
      }
    }
    return h;
  }
};