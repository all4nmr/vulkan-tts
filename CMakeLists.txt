cmake_minimum_required(VERSION 3.20)
project(vulkan-tts VERSION 1.0.0 LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Add qwentts.cpp as a subdirectory
add_subdirectory(qwentts.cpp)

# Installation rules
install(TARGETS qwen-tts qwen-codec tts-server quantize
    RUNTIME DESTINATION bin
    LIBRARY DESTINATION bin
)

# Windows: copy GGML DLLs alongside executables
if(WIN32)
    # ggml shared libs are already linked; install them too
    install(FILES
        $<TARGET_FILE_DIR:ggml>/*.dll
        DESTINATION bin
        OPTIONAL
    )
endif()
