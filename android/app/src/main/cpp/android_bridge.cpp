// android_bridge.cpp
// JNI glue between the C++ engine and Kotlin.
// No reading logic here — just type conversion and thread marshalling.

#include <jni.h>
#include <android/log.h>
#include "rsvp_engine.hpp"

#define LOG(...) __android_log_print(ANDROID_LOG_INFO, "RSVPEngine", __VA_ARGS__)

static rsvp::Engine g_engine;

extern "C" {

// RSVPEngine.kt calls this once from init {}
JNIEXPORT void JNICALL
Java_com_yourapp_rsvp_RSVPEngine_nativeInit(JNIEnv* env, jobject thiz)
{
    jobject   global   = env->NewGlobalRef(thiz);
    jclass    cls      = env->GetObjectClass(thiz);
    jmethodID onToken  = env->GetMethodID(cls, "onToken",
        "(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;IZ)V");
    jmethodID onState  = env->GetMethodID(cls, "onStateChange", "(I)V");
    jmethodID onDone   = env->GetMethodID(cls, "onDone", "()V");

    JavaVM* jvm = nullptr;
    env->GetJavaVM(&jvm);

    // on_token fires on the timer thread — attach JVM, call back, detach
    g_engine.on_token = [jvm, global, onToken]
        (const rsvp::Token& t, size_t idx, size_t total)
    {
        JNIEnv* e;
        jvm->AttachCurrentThread(&e, nullptr);

        jstring before = e->NewStringUTF(t.before.c_str());
        jstring orp    = e->NewStringUTF(t.orp.c_str());
        jstring after  = e->NewStringUTF(t.after.c_str());
        jstring punct  = e->NewStringUTF(t.punct.c_str());

        // progress as 0–1000 integer (avoids JNI float headaches)
        jint prog = (jint)(idx * 1000 / total);

        e->CallVoidMethod(global, onToken, before, orp, after, punct, prog,
                          (jboolean)t.sentence_end);

        e->DeleteLocalRef(before);
        e->DeleteLocalRef(orp);
        e->DeleteLocalRef(after);
        e->DeleteLocalRef(punct);
        jvm->DetachCurrentThread();
    };

    g_engine.on_state = [jvm, global, onState](rsvp::State s) {
        JNIEnv* e;
        jvm->AttachCurrentThread(&e, nullptr);
        e->CallVoidMethod(global, onState, (jint)s);
        jvm->DetachCurrentThread();
    };

    g_engine.on_done = [jvm, global, onDone]() {
        JNIEnv* e;
        jvm->AttachCurrentThread(&e, nullptr);
        e->CallVoidMethod(global, onDone);
        jvm->DetachCurrentThread();
    };

    LOG("init ok");
}

JNIEXPORT void JNICALL
Java_com_yourapp_rsvp_RSVPEngine_nativeLoad(JNIEnv* env, jobject, jstring text, jint wpm)
{
    const char* s = env->GetStringUTFChars(text, nullptr);
    g_engine.load(s, (int)wpm);
    env->ReleaseStringUTFChars(text, s);
}

JNIEXPORT void JNICALL
Java_com_yourapp_rsvp_RSVPEngine_nativePlay(JNIEnv*, jobject) { g_engine.play(); }

JNIEXPORT void JNICALL
Java_com_yourapp_rsvp_RSVPEngine_nativePause(JNIEnv*, jobject) { g_engine.pause(); }

JNIEXPORT void JNICALL
Java_com_yourapp_rsvp_RSVPEngine_nativeToggle(JNIEnv*, jobject) { g_engine.toggle(); }

JNIEXPORT void JNICALL
Java_com_yourapp_rsvp_RSVPEngine_nativeSeek(JNIEnv*, jobject, jint delta)
{ g_engine.seek((int)delta); }

JNIEXPORT void JNICALL
Java_com_yourapp_rsvp_RSVPEngine_nativeSetWpm(JNIEnv*, jobject, jint wpm)
{ g_engine.set_wpm((int)wpm); }

JNIEXPORT jint JNICALL
Java_com_yourapp_rsvp_RSVPEngine_nativeGetWpm(JNIEnv*, jobject)
{ return (jint)g_engine.wpm(); }

JNIEXPORT jfloat JNICALL
Java_com_yourapp_rsvp_RSVPEngine_nativeGetProgress(JNIEnv*, jobject)
{ return (jfloat)g_engine.progress(); }

} // extern "C"
