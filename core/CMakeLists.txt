cmake_minimum_required(VERSION 3.22)
project(rsvp_core)

# header-only interface target — everything just links this
add_library(rsvp_core INTERFACE)
target_include_directories(rsvp_core INTERFACE ${CMAKE_CURRENT_SOURCE_DIR})
target_compile_features(rsvp_core INTERFACE cxx_std_17)
