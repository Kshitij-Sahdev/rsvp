// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "RSVPReader",
    platforms: [.iOS(.v17), .macOS(.v14)],
    targets: [
        .target(
            name: "RSVPEngineCxx",
            path: "Sources/RSVPEngineCxx",
            sources: ["rsvp_bridge.cpp", "dummy.cpp"],
            publicHeadersPath: "include",
            cxxSettings: [
                .headerSearchPath("include"),
            ]
        ),
        .target(
            name: "RSVPReader",
            dependencies: ["RSVPEngineCxx"],
            path: "Sources/RSVPReader",
            swiftSettings: [
                .interoperabilityMode(.Cxx)
            ]
        ),
    ],
    cxxLanguageStandard: .cxx17
)
