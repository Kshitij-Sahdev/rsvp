cmake_minimum_required(VERSION 3.16)
project(RSVPReader VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_AUTOMOC ON)

find_package(Qt6 REQUIRED COMPONENTS Core Widgets)
qt_standard_project_setup()

qt_add_executable(RSVPReader main.cpp)

set_target_properties(RSVPReader PROPERTIES
    WIN32_EXECUTABLE ON
    MACOSX_BUNDLE ON
)

target_include_directories(RSVPReader PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/../core)
target_link_libraries(RSVPReader PRIVATE Qt6::Core Qt6::Widgets)
