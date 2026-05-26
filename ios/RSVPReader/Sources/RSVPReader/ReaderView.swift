import SwiftUI

private let bg = Color(red: 10.0 / 255.0, green: 10.0 / 255.0, blue: 10.0 / 255.0)
private let wordColor = Color(red: 232.0 / 255.0, green: 228.0 / 255.0, blue: 220.0 / 255.0)
private let orpColor = Color(red: 192.0 / 255.0, green: 57.0 / 255.0, blue: 43.0 / 255.0)
private let badgeColor = Color.white.opacity(0.22)
private let punctColor = Color.white.opacity(0.40)

struct ReaderView: View {
    @StateObject private var engine = RSVPEngine()
    @State private var showInput = true
    @State private var inputText = ""
    @State private var wpm = 300

    var body: some View {
        ZStack {
            if showInput {
                TextInputView(text: $inputText, onStart: startReading)
            } else {
                ReaderScreen(engine: engine, wpm: $wpm, onBack: backToInput)
            }
        }
        .preferredColorScheme(.dark)
        .statusBarHidden()
    }

    private func startReading() {
        engine.load(text: inputText, wpm: wpm)
        engine.play()
        showInput = false
    }

    private func backToInput() {
        engine.pause()
        showInput = true
    }
}

struct TextInputView: View {
    @Binding var text: String
    var onStart: () -> Void

    var body: some View {
        ZStack {
            bg.ignoresSafeArea()
            VStack(alignment: .leading, spacing: 16) {
                Text("RSVP Reader")
                    .font(.system(size: 32, weight: .semibold, design: .serif))
                    .foregroundColor(wordColor)

                TextEditor(text: $text)
                    .scrollContentBackground(.hidden)
                    .padding(12)
                    .frame(minHeight: 220)
                    .background(Color.white.opacity(0.08))
                    .foregroundColor(wordColor)
                    .font(.system(size: 16, design: .serif))

                Button(action: onStart) {
                    Text("Start Reading")
                        .font(.system(size: 16, weight: .bold, design: .monospaced))
                        .foregroundColor(wordColor)
                        .padding(.vertical, 10)
                        .frame(maxWidth: .infinity)
                }
                .background(orpColor)
                .cornerRadius(0)
            }
            .padding(24)
        }
    }
}

struct ReaderScreen: View {
    @ObservedObject var engine: RSVPEngine
    @Binding var wpm: Int
    var onBack: () -> Void

    var body: some View {
        ZStack {
            bg.ignoresSafeArea()
            CrosshairView()
            ORPWordView(
                before: engine.currentBefore,
                orp: engine.currentOrp,
                after: engine.currentAfter,
                punct: engine.currentPunct
            )

            VStack {
                Spacer()
                HStack {
                    ProgressViewBlock(current: engine.currentIdx, total: engine.totalWords)
                    Spacer()
                    Text("\(wpm) WPM")
                        .font(.system(size: 12, design: .monospaced))
                        .foregroundColor(badgeColor)
                }
                .padding(16)
            }
        }
        .onTapGesture { engine.toggle() }
        .onLongPressGesture(minimumDuration: 0.6) {
            onBack()
        }
        .gesture(
            DragGesture(minimumDistance: 20)
                .onEnded { value in
                    let dx = value.translation.width
                    let dy = value.translation.height
                    let minSwipe: CGFloat = 40

                    if abs(dx) > abs(dy) && abs(dx) > minSwipe {
                        if dx < 0 { engine.seek(delta: 8) }
                        if dx > 0 { engine.seek(delta: -8) }
                    } else if abs(dy) > minSwipe {
                        if dy < 0 {
                            wpm = min(wpm + 25, 1200)
                            engine.setWpm(wpm)
                        } else {
                            wpm = max(wpm - 25, 60)
                            engine.setWpm(wpm)
                        }
                    }
                }
        )
    }
}

struct ORPWordView: View {
    let before: String
    let orp: String
    let after: String
    let punct: String

    var body: some View {
        HStack(spacing: 0) {
            Text(before)
                .foregroundColor(wordColor)
            Text(orp)
                .foregroundColor(orpColor)
                .bold()
            Text(after)
                .foregroundColor(wordColor)
            if !punct.isEmpty {
                Text(punct)
                    .foregroundColor(punctColor)
            }
        }
        .font(.system(size: 48, design: .serif))
    }
}

struct CrosshairView: View {
    var body: some View {
        GeometryReader { geo in
            Path { path in
                let midX = geo.size.width / 2
                let midY = geo.size.height / 2
                path.move(to: CGPoint(x: midX, y: 0))
                path.addLine(to: CGPoint(x: midX, y: geo.size.height))
                path.move(to: CGPoint(x: 0, y: midY))
                path.addLine(to: CGPoint(x: geo.size.width, y: midY))
            }
            .stroke(Color.white.opacity(0.06), lineWidth: 1)
        }
    }
}

struct ProgressViewBlock: View {
    let current: UInt32
    let total: UInt32

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("\(min(current + 1, total))/\(total)")
                .font(.system(size: 12, design: .monospaced))
                .foregroundColor(badgeColor)

            GeometryReader { geo in
                let ratio = total > 0 ? CGFloat(current + 1) / CGFloat(total) : 0
                Rectangle()
                    .fill(badgeColor)
                    .frame(width: geo.size.width * ratio, height: 2)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            .frame(width: 140, height: 2)
        }
    }
}
