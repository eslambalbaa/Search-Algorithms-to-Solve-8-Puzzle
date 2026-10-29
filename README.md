# 8-Puzzle Solver & Visualizer

A fast 8-Puzzle solver written in C++ paired with an interactive web-based visualizer. It implements both uninformed (BFS, DFS, IDDFS) and informed (A* with Manhattan and Euclidean heuristics) search algorithms to compute and animate the path to the goal state.

## Prerequisites

- **C++ Compiler:** `g++` or `clang++` supporting C++17.
- **Python:** Python 3.8+ (to run the local HTTP server).
- **Web Browser:** Any modern browser.

## Usage

To run the project and use the interactive web visualizer, follow these steps:

### 1. Compile the C++ Solver

Compile the core solver with optimization flags for the best performance:

**On Linux / macOS:**

```bash
g++ -O3 -std=c++17 solver.cpp -o solver
```

**On Windows:**

```bash
g++ -O3 -std=c++17 solver.cpp -o solver.exe
```

### 2. Start the Web Server

Run the Python HTTP server, which acts as a bridge between the C++ executable and the frontend interface:

```bash
python server.py
```

### 3. Open the Visualizer

Navigate to http://localhost:8000 in your web browser.

From the webpage, you can enter your initial puzzle state (using 0 for the blank tile), select your desired search algorithm, and click Solve to watch a step-by-step animation of the solution!
