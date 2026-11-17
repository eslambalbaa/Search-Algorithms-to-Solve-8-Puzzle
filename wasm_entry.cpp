#include "algorithms/A_star.hpp"
#include "algorithms/BFS.hpp"
#include "algorithms/DFS.hpp"
#include "algorithms/Iterative_DFS.hpp"
#include "algorithms/State.hpp"

#include <chrono>
#include <cstdint>
#include <iomanip>
#include <sstream>
#include <string>

#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#else
#define EMSCRIPTEN_KEEPALIVE
#endif

namespace {

enum class Algorithm {
  BFS = 1,
  DFS = 2,
  Iterative_DFS = 3,
  A_star_Manhattan = 4,
  A_star_Euclidean = 5
};

State initialize_goal() {
  State goal;
  uint16_t k = 0;
  for (uint16_t i = 0; i < BOARD_SIZE; ++i) {
    for (uint16_t j = 0; j < BOARD_SIZE; ++j) {
      goal.board[i][j] = k++;
    }
  }
  return goal;
}

bool parse_board(const char *board_str, State &initial_state) {
  if (!board_str) {
    return false;
  }

  std::string normalized(board_str);
  for (char &ch : normalized) {
    if (ch == ',') {
      ch = ' ';
    }
  }

  std::istringstream iss(normalized);
  for (uint16_t i = 0; i < BOARD_SIZE; ++i) {
    for (uint16_t j = 0; j < BOARD_SIZE; ++j) {
      uint16_t val = 0;
      if (!(iss >> val)) {
        return false;
      }
      initial_state.board[i][j] = val;
    }
  }
  return true;
}

std::string serialize_json(const SearchResult &res, const State &initial_state,
                           double running_time) {
  std::ostringstream out;
  out << "{\n";
  out << "  \"initial_board\": [";
  for (uint16_t i = 0; i < BOARD_SIZE * BOARD_SIZE; ++i) {
    out << initial_state.board[i / BOARD_SIZE][i % BOARD_SIZE]
        << (i < (BOARD_SIZE * BOARD_SIZE) - 1 ? ", " : "");
  }
  out << "],\n";

  out << "  \"path\": [";
  for (size_t i = 0; i < res.path_to_goal.size(); ++i) {
    out << "\"" << res.path_to_goal[i] << "\""
        << (i < res.path_to_goal.size() - 1 ? ", " : "");
  }
  out << "],\n";

  out << "  \"cost\": " << res.cost_of_path << ",\n";
  out << "  \"nodes_expanded\": " << res.nodes_expanded << ",\n";
  out << "  \"search_depth\": " << res.search_depth << ",\n";
  out << "  \"running_time\": " << std::fixed << std::setprecision(8)
      << running_time << "\n";
  out << "}\n";
  return out.str();
}

} // namespace

extern "C" {

EMSCRIPTEN_KEEPALIVE
const char *solve_puzzle(int algo, const char *board_str) {
  static std::string json_output;

  State initial_state{};
  if (!parse_board(board_str, initial_state)) {
    json_output = "{\"error\":\"Invalid board input\"}";
    return json_output.c_str();
  }

  State goal_state = initialize_goal();
  SearchResult result;

  auto start_time = std::chrono::steady_clock::now();

  switch (static_cast<Algorithm>(algo)) {
  case Algorithm::BFS:
    result = BFS::bfs(initial_state, goal_state);
    break;
  case Algorithm::DFS:
    result = DFS::dfs(initial_state, goal_state);
    break;
  case Algorithm::Iterative_DFS:
    result = Iterative_DFS::iterative_dfs(initial_state, goal_state);
    break;
  case Algorithm::A_star_Manhattan:
    result = A_star::a_star(initial_state, goal_state, Heuristic::MANHATTAN);
    break;
  case Algorithm::A_star_Euclidean:
    result = A_star::a_star(initial_state, goal_state, Heuristic::EUCLIDEAN);
    break;
  default:
    json_output = "{\"error\":\"Unknown algorithm\"}";
    return json_output.c_str();
  }

  auto end_time = std::chrono::steady_clock::now();
  std::chrono::duration<double> running_time = end_time - start_time;

  json_output = serialize_json(result, initial_state, running_time.count());
  return json_output.c_str();
}

} // extern "C"
