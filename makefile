CXX = g++
CXXFLAGS = -Wall -Wextra -g3 -O3

SRCS = $(wildcard *.cpp)

OUT_DIR = output
TARGET = $(OUT_DIR)/main.exe

all: $(TARGET)

$(TARGET): $(SRCS)
	@mkdir $(OUT_DIR)
	$(CXX) $(CXXFLAGS) $(SRCS) -o $(TARGET)

run: $(TARGET)
	./$(TARGET)

clean:
	rm -rf $(OUT_DIR)

.PHONY: all run clean