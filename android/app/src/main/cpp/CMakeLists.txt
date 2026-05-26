cmake_minimum_required(VERSION 3.22)
project(rsvp_android)

# shared .so that Kotlin loads via System.loadLibrary("rsvp")
add_library(rsvp SHARED android_bridge.cpp)

# core is header-only — just point at it
target_include_directories(rsvp PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_CURRENT_SOURCE_DIR}/../../../../../core   # rsvp_engine.hpp
)

target_compile_features(rsvp PRIVATE cxx_std_17)
target_link_libraries(rsvp android log)
