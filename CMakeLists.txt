cmake_minimum_required(VERSION 3.20)
project(vulkan-tts VERSION 1.0.0 LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Build qwentts.cpp as the top-level project to ensure correct include paths
add_subdirectory(qwentts.cpp)
