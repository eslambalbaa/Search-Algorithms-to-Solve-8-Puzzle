#pragma once

#include <algorithm>
#include <array>
#include <cstddef>
#include <cstdint>
#include <string>
#include <unordered_map>
#include <vector>

constexpr uint16_t BOARD_SIZE = 3;

// proven maximum
constexpr int64_t MAX_DEPTH = 31;

struct State {
  std::array<std::array<uint16_t, BOARD_SIZE>, BOARD_SIZE> board;
  bool operator==(const State &other) const {
    for (uint16_t i = 0; i < BOARD_SIZE; ++i) {
      for (uint16_t j = 0; j < BOARD_SIZE; ++j) {
        if (this->board[i][j] != other.board[i][j]) {
          return false;
        }
      }
    }
    return true;
  }

  std::vector<std::pair<State, std::string>> neighbors() const {
    std::vector<std::pair<State, std::string>> generated_neighbors;

    uint16_t zero_row = 0;
    uint16_t zero_col = 0;
    bool found = false;

    for (uint16_t i = 0; i < BOARD_SIZE; ++i) {
      for (uint16_t j = 0; j < BOARD_SIZE; ++j) {
        if (this->board[i][j] == 0) {
          zero_row = i;
          zero_col = j;
          found = true;
          break;
        }
        if (found) {
          break;
        }
      }
    }

    // up
    if (zero_row > 0) {
      State up_state = *this;
      std::swap(up_state.board[zero_row][zero_col],
                up_state.board[zero_row - 1][zero_col]);
      generated_neighbors.push_back({up_state, "Up"});
    }

    // down
    if (zero_row < BOARD_SIZE - 1) {
      State down_state = *this;
      std::swap(down_state.board[zero_row][zero_col],
                down_state.board[zero_row + 1][zero_col]);
      generated_neighbors.push_back({down_state, "Down"});
    }

    // left
    if (zero_col > 0) {
      State left_state = *this;
      std::swap(left_state.board[zero_row][zero_col],
                left_state.board[zero_row][zero_col - 1]);
      generated_neighbors.push_back({left_state, "Left"});
    }

    // right
    if (zero_col < BOARD_SIZE - 1) {
      State right_state = *this;
      std::swap(right_state.board[zero_row][zero_col],
                right_state.board[zero_row][zero_col + 1]);
      generated_neighbors.push_back({right_state, "Right"});
    }

    return generated_neighbors;
  }

  static bool goal_test(const State &goal_state, const State &current) {
    return goal_state == current;
  }
};

struct StateHash {
  std::size_t operator()(const State &s) const {
    uint64_t hash = 0;
    for (uint16_t i = 0; i < BOARD_SIZE; ++i) {
      for (uint16_t j = 0; j < BOARD_SIZE; ++j) {
        hash = (hash << 4) | s.board[i][j];
      }
    }
    return static_cast<std::size_t>(hash);
  }
};

struct SearchResult {
  std::vector<std::string> path_to_goal;

  std::vector<State> state_path;

  uint64_t cost_of_path = 0;

  uint64_t nodes_expanded = 0;

  uint64_t search_depth = 0;

  static SearchResult reconstruct_path(
      State goal_node,
      const std::unordered_map<State, std::pair<State, std::string>, StateHash>
          &parent_map,
      SearchResult &result) {
    std::vector<State> path;
    State curr = goal_node;

    while (parent_map.find(curr) != parent_map.end()) {
      result.state_path.emplace_back(curr);
      auto parent_info = parent_map.at(curr);
      result.path_to_goal.emplace_back(parent_info.second);

      curr = parent_info.first;
    }
    // initial state
    result.state_path.emplace_back(curr);

    std::reverse(result.state_path.begin(), result.state_path.end());
    std::reverse(result.path_to_goal.begin(), result.path_to_goal.end());
    result.cost_of_path = result.state_path.size() - 1;
    result.search_depth = result.state_path.size() - 1;
    return result;
  }
};
