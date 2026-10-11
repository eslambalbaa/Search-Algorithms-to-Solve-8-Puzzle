CXX = g++
CXXFLAGS = -Wall -Wextra -g3 -O3
SRCS = $(wildcard *.cpp)
OUT_DIR = output

ifeq ($(OS),Windows_NT)
	TARGET = $(OUT_DIR)\main.exe
	MKDIR = @if not exist $(OUT_DIR) mkdir $(OUT_DIR)
	RM = @if exist $(OUT_DIR) rmdir /s /q $(OUT_DIR)
	RUN = $(TARGET)
else
	TARGET = $(OUT_DIR)/main
	MKDIR = @mkdir -p $(OUT_DIR)
	RM = @rm -rf $(OUT_DIR)
	RUN = ./$(TARGET)
endif

all: $(TARGET)

$(TARGET): $(SRCS)
	$(MKDIR)
	$(CXX) $(CXXFLAGS) $(SRCS) -o $(TARGET)

run: $(TARGET)
	$(RUN)

clean:
	$(RM)

.PHONY: all run clean
