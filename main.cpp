#include "A_star.hpp"
#include "BFS.hpp"
#include "DFS.hpp"
#include "Iterative_DFS.hpp"
#include "State.hpp"
#include <cstdint>
#include <future>
#include <iostream>
#include <vector>

enum class Algorithm {
  BFS = 1,
  DFS = 2,
  Iterative_DFS = 3,
  A_star_Manhattan = 4,
  A_star_Euclidean = 5
};

State initalize_goal() {
  State goal;
  uint16_t k = 0;
  for (uint16_t i = 0; i < BOARD_SIZE; ++i) {
    for (uint16_t j = 0; j < BOARD_SIZE; ++j) {
      goal.board[i][j] = k++;
    }
  }

  return goal;
}

Algorithm get_algorithm() {
  int choice;
  std::cout << "Choose algorithm:\n"
            << static_cast<int>(Algorithm::BFS) << " - BFS\n"
            << static_cast<int>(Algorithm::DFS) << " - DFS\n"
            << static_cast<int>(Algorithm::Iterative_DFS)
            << " - Iterative DFS\n"
            << static_cast<int>(Algorithm::A_star_Manhattan)
            << " - A* (Manhattan)\n"
            << static_cast<int>(Algorithm::A_star_Euclidean)
            << " - A* (Euclidean)\n"
            << "Choice: ";
  std::cin >> choice;
  return static_cast<Algorithm>(choice);
}

State get_initial_state() {
  State initial_state;
  std::cout << "Enter the initial state:\n";
  for (uint16_t i = 0; i < BOARD_SIZE; ++i) {
    for (uint16_t j = 0; j < BOARD_SIZE; ++j) {
      std::cin >> initial_state.board[i][j];
    }
  }
  std::cout << '\n';
  return initial_state;
}

void visualize_path(const std::vector<State> &path) {
  uint32_t n = path.size();
  if (n == 0)
    return;

  for (uint32_t st_idx = 0; st_idx < n; ++st_idx) {
    std::cout << "+---+---+---+\n";

    for (uint16_t i = 0; i < BOARD_SIZE; ++i) {
      std::cout << "| ";
      for (uint16_t j = 0; j < BOARD_SIZE; ++j) {

        if (path[st_idx].board[i][j] == 0) {
          std::cout << "  | ";
        } else {
          std::cout << path[st_idx].board[i][j] << " | ";
        }
      }
      std::cout << "\n+---+---+---+\n";
    }

    if (st_idx != n - 1) {
      std::cout << "      |\n";
      std::cout << "      V\n\n";
    }
  }
}

void launch_algorthm(Algorithm choice, State initial_state, State goal_state) {
  SearchResult result;
  auto start_time = std::chrono::high_resolution_clock::now();

  switch (choice) {
  case Algorithm::BFS:
    result = BFS::bfs(initial_state, goal_state);
    break;
  case Algorithm::DFS:
    result = DFS::dfs(initial_state, goal_state);
    break;
  case Algorithm::Iterative_DFS:
    result = Iterative_DFS::iterative_dfs(initial_state, goal_state);
    break;
  case Algorithm::A_star_Euclidean:
    result = A_star::a_star(initial_state, goal_state, Heuristic::EUCLIDEAN);
    break;
  case Algorithm::A_star_Manhattan:
    result = A_star::a_star(initial_state, goal_state, Heuristic::MANHATTAN);
    break;
  default:
    break;
  }

  auto end_time = std::chrono::high_resolution_clock::now();
  std::chrono::duration<double> running_time = end_time - start_time;

  visualize_path(result.state_path);

  std::cout << "\n--- Search Results ---\n";

  if (!result.path_to_goal.size()) {
    std::cout << "No solution found\n";
  }

  std::cout << "path to goal: [";
  for (size_t i = 0; i < result.path_to_goal.size(); ++i) {
    std::cout << "'" << result.path_to_goal[i] << "'";
    if (i < result.path_to_goal.size() - 1)
      std::cout << ", ";
  }
  std::cout << "]\n";

  std::cout << "cost of path: " << result.cost_of_path << "\n";
  std::cout << "nodes expanded: " << result.nodes_expanded << "\n";
  std::cout << "search depth: " << result.search_depth << "\n";
  std::printf("running time: %.8f seconds\n", running_time.count());
}

int main() {

  State goal_state = initalize_goal();

  Algorithm choice = get_algorithm();

  State initial_state = get_initial_state();

  launch_algorthm(choice, initial_state, goal_state);
}
