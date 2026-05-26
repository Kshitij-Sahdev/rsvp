package com.yourapp.rsvp

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.gestures.awaitTouchSlopOrCancellation
import androidx.compose.foundation.gestures.waitForUpOrCancellation
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.RectangleShape
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.math.abs

class ReaderActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent { RsvpApp() }
    }
}

private val Bg = Color(0xFF0A0A0A)
private val WordColor = Color(0xFFE8E4DC)
private val OrpColor = Color(0xFFC0392B)
private val Guide = Color.White.copy(alpha = 0.06f)
private val Badge = Color.White.copy(alpha = 0.22f)
private val Punct = Color.White.copy(alpha = 0.40f)
private val InputBg = Color(0xFF111111)

@Composable
fun RsvpApp() {
    var inputText by rememberSaveable { mutableStateOf("") }
    var showReader by rememberSaveable { mutableStateOf(false) }

    if (showReader) {
        ReaderScreen(text = inputText, onBack = { showReader = false })
    } else {
        TextInputScreen(
            text = inputText,
            onTextChange = { inputText = it },
            onStart = { showReader = true }
        )
    }
}

@Composable
fun TextInputScreen(
    text: String,
    onTextChange: (String) -> Unit,
    onStart: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Bg)
            .padding(24.dp)
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Text(
                text = "Paste or type your text, then tap START",
                color = Badge,
                fontFamily = FontFamily.Monospace,
                fontSize = 14.sp
            )
            BasicTextField(
                value = text,
                onValueChange = onTextChange,
                textStyle = androidx.compose.ui.text.TextStyle(
                    color = WordColor,
                    fontSize = 16.sp
                ),
                cursorBrush = androidx.compose.ui.graphics.SolidColor(OrpColor),
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 220.dp)
                    .background(InputBg)
                    .padding(16.dp)
            )
            Button(
                onClick = onStart,
                shape = RectangleShape,
                colors = ButtonDefaults.buttonColors(containerColor = OrpColor)
            ) {
                Text(
                    text = "START",
                    fontFamily = FontFamily.Monospace,
                    color = WordColor
                )
            }
        }
    }
}

@Composable
fun ReaderScreen(text: String, onBack: () -> Unit) {
    val engine = remember { RSVPEngine() }
    var token by remember { mutableStateOf<RsvpToken?>(null) }
    var wpm by remember { mutableStateOf(300) }

    LaunchedEffect(engine) {
        engine.onToken = { token = it }
        engine.onState = { }
        engine.onDone = { }
    }

    LaunchedEffect(text) {
        engine.load(text, wpm)
        engine.play()
    }

    val display = token

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Bg)
            .pointerInput(Unit) {
                awaitEachGesture {
                    val down = awaitFirstDown()
                    var longPressed = false
                    val longPressJob = launch {
                        delay(600)
                        longPressed = true
                        engine.pause()
                        onBack()
                    }

                    val drag = awaitTouchSlopOrCancellation(down.id) { change, _ ->
                        change.consume()
                    }

                    if (drag == null) {
                        longPressJob.cancel()
                        val up = waitForUpOrCancellation()
                        if (up != null && !longPressed) {
                            engine.toggle()
                        }
                    } else {
                        longPressJob.cancel()
                        var delta = drag.position - down.position
                        var last = drag.position
                        val pointerId = drag.id

                        while (true) {
                            val event = awaitPointerEvent()
                            val change = event.changes.firstOrNull { it.id == pointerId }
                                ?: break
                            if (change.pressed) {
                                delta += change.position - last
                                last = change.position
                                change.consume()
                            } else {
                                break
                            }
                        }

                        val dx = delta.x
                        val dy = delta.y
                        val minSwipe = viewConfiguration.touchSlop * 4

                        if (abs(dx) > abs(dy) && abs(dx) > minSwipe) {
                            if (dx < 0) engine.seek(8) else engine.seek(-8)
                        } else if (abs(dy) > minSwipe) {
                            if (dy < 0) {
                                wpm = (wpm + 25).coerceAtMost(1200)
                                engine.setWpm(wpm)
                            } else {
                                wpm = (wpm - 25).coerceAtLeast(60)
                                engine.setWpm(wpm)
                            }
                        }
                    }
                }
            }
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val midX = size.width / 2f
            val midY = size.height / 2f
            drawLine(Guide, Offset(0f, midY), Offset(size.width, midY), 1f)
            drawLine(Guide, Offset(midX, 0f), Offset(midX, size.height), 1f)
        }

        val wordText = buildAnnotatedString {
            val before = display?.before ?: ""
            val orp = display?.orp ?: ""
            val after = display?.after ?: ""
            val punct = display?.punct ?: ""

            withStyle(SpanStyle(color = WordColor)) { append(before) }
            withStyle(SpanStyle(color = OrpColor, fontWeight = FontWeight.Bold)) {
                append(orp)
            }
            withStyle(SpanStyle(color = WordColor)) { append(after) }
            if (punct.isNotEmpty()) {
                withStyle(SpanStyle(color = Punct)) { append(punct) }
            }
        }

        Text(
            text = wordText,
            fontSize = 42.sp,
            fontFamily = FontFamily.Serif,
            color = WordColor,
            modifier = Modifier.align(Alignment.Center)
        )

        Row(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(16.dp)
        ) {
            val prog = display?.progress ?: 0
            Text(
                text = "$prog/1000",
                fontFamily = FontFamily.Monospace,
                fontSize = 12.sp,
                color = Badge
            )
        }

        Row(
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(16.dp)
        ) {
            Text(
                text = "$wpm WPM",
                fontFamily = FontFamily.Monospace,
                fontSize = 12.sp,
                color = Badge
            )
        }
    }
}
