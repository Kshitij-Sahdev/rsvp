// RSVPEngine.kt
// Thin wrapper around the JNI bridge.
// All callbacks arrive here; we post to the main thread before touching UI.

package com.yourapp.rsvp

import android.os.Handler
import android.os.Looper

data class RsvpToken(
    val before: String,
    val orp: String,       // the red letter
    val after: String,
    val punct: String,
    val progress: Int,     // 0–1000
    val sentenceEnd: Boolean
)

enum class RsvpState { Idle, Playing, Paused, Done }

class RSVPEngine {
    // Set these before calling load()
    var onToken: ((RsvpToken) -> Unit)? = null
    var onState: ((RsvpState) -> Unit)? = null
    var onDone:  (() -> Unit)? = null

    private val main = Handler(Looper.getMainLooper())

    init {
        System.loadLibrary("rsvp")
        nativeInit()
    }

    fun load(text: String, wpm: Int = 300) = nativeLoad(text, wpm)
    fun play()                             = nativePlay()
    fun pause()                            = nativePause()
    fun toggle()                           = nativeToggle()
    fun seek(delta: Int)                   = nativeSeek(delta)
    fun setWpm(wpm: Int)                   = nativeSetWpm(wpm)
    fun getWpm(): Int                      = nativeGetWpm()
    fun getProgress(): Float               = nativeGetProgress()

    // Called from JNI on timer thread → post to main
    @Suppress("unused")
    private fun onToken(before: String, orp: String, after: String,
                        punct: String, progress: Int, sentenceEnd: Boolean) {
        val tok = RsvpToken(before, orp, after, punct, progress, sentenceEnd)
        main.post { onToken?.invoke(tok) }
    }

    @Suppress("unused")
    private fun onStateChange(stateInt: Int) {
        val s = RsvpState.values()[stateInt]
        main.post { onState?.invoke(s) }
    }

    @Suppress("unused")
    private fun onDone() {
        main.post { onDone?.invoke() }
    }

    // JNI declarations
    private external fun nativeInit()
    private external fun nativeLoad(text: String, wpm: Int)
    private external fun nativePlay()
    private external fun nativePause()
    private external fun nativeToggle()
    private external fun nativeSeek(delta: Int)
    private external fun nativeSetWpm(wpm: Int)
    private external fun nativeGetWpm(): Int
    private external fun nativeGetProgress(): Float
}
