import Foundation
import RSVPEngineCxx

@MainActor
final class RSVPEngine: ObservableObject {
    enum EngineState: Int32 {
        case idle = 0
        case playing = 1
        case paused = 2
        case done = 3
    }

    @Published var currentBefore: String = ""
    @Published var currentOrp: String = ""
    @Published var currentAfter: String = ""
    @Published var currentPunct: String = ""
    @Published var state: EngineState = .idle
    @Published var progress: Float = 0
    @Published var currentIdx: UInt32 = 0
    @Published var totalWords: UInt32 = 0

    private var enginePtr: UnsafeMutableRawPointer?

    init() {
        enginePtr = rsvp_create()
        registerCallbacks()
    }

    deinit {
        if let enginePtr {
            rsvp_set_on_token(enginePtr, nil, nil)
            rsvp_set_on_state(enginePtr, nil, nil)
            rsvp_set_on_done(enginePtr, nil, nil)
            rsvp_destroy(enginePtr)
        }
    }

    func load(text: String, wpm: Int = 300) {
        guard let enginePtr else { return }
        text.withCString { cstr in
            rsvp_load(enginePtr, cstr, Int32(wpm))
        }
    }

    func play() {
        guard let enginePtr else { return }
        rsvp_play(enginePtr)
    }

    func pause() {
        guard let enginePtr else { return }
        rsvp_pause(enginePtr)
    }

    func toggle() {
        guard let enginePtr else { return }
        rsvp_toggle(enginePtr)
    }

    func seek(delta: Int) {
        guard let enginePtr else { return }
        rsvp_seek(enginePtr, Int32(delta))
    }

    func setWpm(_ wpm: Int) {
        guard let enginePtr else { return }
        rsvp_set_wpm(enginePtr, Int32(wpm))
    }

    func getWpm() -> Int {
        guard let enginePtr else { return 300 }
        return Int(rsvp_get_wpm(enginePtr))
    }

    func getProgress() -> Float {
        guard let enginePtr else { return 0 }
        return rsvp_progress(enginePtr)
    }

    private func registerCallbacks() {
        guard let enginePtr else { return }
        let ctx = Unmanaged.passUnretained(self).toOpaque()

        rsvp_set_on_token(enginePtr, RSVPEngine.tokenCallback, ctx)
        rsvp_set_on_state(enginePtr, RSVPEngine.stateCallback, ctx)
        rsvp_set_on_done(enginePtr, RSVPEngine.doneCallback, ctx)
    }

    private static let tokenCallback: rsvp_token_cb = {
        ctx, before, orp, after, punct, idx, total, _, _ in
        guard let ctx else { return }
        let engine = Unmanaged<RSVPEngine>.fromOpaque(ctx).takeUnretainedValue()

        let b = before.map { String(cString: $0) } ?? ""
        let o = orp.map { String(cString: $0) } ?? ""
        let a = after.map { String(cString: $0) } ?? ""
        let p = punct.map { String(cString: $0) } ?? ""
        let prog: Float = total > 0 ? Float(idx) / Float(total) : 0

        DispatchQueue.main.async {
            engine.currentBefore = b
            engine.currentOrp = o
            engine.currentAfter = a
            engine.currentPunct = p
            engine.currentIdx = idx
            engine.totalWords = total
            engine.progress = prog
        }
    }

    private static let stateCallback: rsvp_state_cb = { ctx, state in
        guard let ctx else { return }
        let engine = Unmanaged<RSVPEngine>.fromOpaque(ctx).takeUnretainedValue()
        let next = EngineState(rawValue: state) ?? .idle
        DispatchQueue.main.async {
            engine.state = next
        }
    }

    private static let doneCallback: rsvp_done_cb = { ctx in
        guard let ctx else { return }
        let engine = Unmanaged<RSVPEngine>.fromOpaque(ctx).takeUnretainedValue()
        DispatchQueue.main.async {
            engine.state = .done
        }
    }
}
