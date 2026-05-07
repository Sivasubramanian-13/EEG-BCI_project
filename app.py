from flask import Flask, render_template, request, jsonify, redirect, url_for
import time, math, random, os
import numpy as np
from scipy.io import loadmat
import tensorflow as tf
import utils.preprocessing as preproc

app = Flask(__name__)

# =========================
# 🔹 LOAD REAL MODELS
# =========================
intent_model = tf.keras.models.load_model(
    "models/intent_model.h5",
    compile=False
)

pain_model = tf.keras.models.load_model(
    "models/pain_model_final.h5",
    compile=False
)

emotion_model = tf.keras.models.load_model(
    "models/emotion_model_final.h5",
    compile=False
)

# =========================
# 🔹 LABELS
# =========================
INTENT_LABELS = [
    "Yes",
    "No",
    "Food",
    "Help",
    "Afraid"
]

PAIN_LABELS = [
    "No Pain",
    "Low Pain",
    "High Pain"
]

EMOTION_LABELS = [
    "Calm",
    "Distressed",
    "Anxious"
]

# =========================
# 🔹 GLOBALS
# =========================
EEG_DATA = None

CURRENT_STREAM_IDX = 0
CURRENT_WAVE_IDX = 0

CURRENT_FILENAME = ""

FILE_CYCLE_IDX = 0

# 🔥 rolling emotion memory
EMOTION_HISTORY = []

# =========================
# ROUTES (UNCHANGED)
# =========================
@app.route("/")
def home():
    return redirect(url_for('login'))

@app.route("/dashboard")
def dashboard():
    return render_template("dashboard.html")

@app.route("/login")
def login():
    return render_template("login.html")

@app.route("/signup")
def signup():
    return render_template("signup.html")

@app.route("/intake")
def intake():
    return render_template("intake.html")

@app.route("/journey")
def journey():
    return render_template("journey.html")

@app.route("/report")
def report():
    return render_template("report.html")

@app.route("/history")
def history():
    return render_template("history.html")

@app.route("/settings")
def settings():
    return render_template("settings.html")

# =========================
# 🔹 FUSION LOGIC
# =========================
def apply_fusion(intent, pain, emotion):

    # emotion primary
    if emotion["label"] == "Anxious":
        intent["label"] = "Afraid"
        pain["value"] = "No Pain"

    elif emotion["label"] == "Distressed":
        intent["label"] = "Help"
        pain["value"] = "Low Pain"

    # intent primary
    elif intent["label"] == "Help":
        emotion["label"] = "Distressed"
        pain["value"] = "Low Pain"

    elif intent["label"] == "Afraid":
        emotion["label"] = "Anxious"
        pain["value"] = "No Pain"

    # pain primary
    elif pain["value"] == "Low Pain":
        emotion["label"] = "Distressed"
        intent["label"] = "Help"

    elif pain["value"] == "High Pain":
        emotion["label"] = "Distressed"
        intent["label"] = "Help"

    return intent, pain, emotion

# =========================
# 🔹 UPLOAD
# =========================
@app.route("/upload", methods=["POST"])
def upload():

    global EEG_DATA
    global CURRENT_FILENAME
    global CURRENT_STREAM_IDX
    global CURRENT_WAVE_IDX
    global EMOTION_HISTORY

    file = request.files["file"]

    CURRENT_FILENAME = file.filename

    os.makedirs("data_inputs", exist_ok=True)

    filepath = os.path.join(
        "data_inputs",
        "uploaded.mat"
    )

    file.save(filepath)

    mat = loadmat(filepath)

    if "data" not in mat:
        return jsonify({
            "error": "'data' missing"
        }), 400

    eeg = mat["data"]

    # remove extra dim
    if eeg.ndim == 4:
        eeg = eeg[:, :, :, 0]

    # normalize
    if eeg.ndim == 3:
        EEG_DATA = preproc.normalize(eeg)

    # 🔥 IMPORTANT RESET
    CURRENT_STREAM_IDX = 0
    CURRENT_WAVE_IDX = 0

    # reset emotion voting
    EMOTION_HISTORY = []

    print("✅ Uploaded:", CURRENT_FILENAME)
    print("Shape:", EEG_DATA.shape)

    return jsonify({
        "status": "ok"
    })

# =========================
# 🔹 STREAM
# =========================
@app.route("/stream")
def stream():

    global EEG_DATA
    global CURRENT_STREAM_IDX
    global CURRENT_FILENAME
    global FILE_CYCLE_IDX
    global EMOTION_HISTORY

    # placeholders
    intent = {
        "label": "---",
        "conf": "--%"
    }

    pain = {
        "value": "No Pain",
        "conf": "--%"
    }

    emotion = {
        "label": "Calm",
        "conf": "--%"
    }

    # =========================
    # AUTO LOAD RANDOM FILE
    # =========================
    if EEG_DATA is None:

        try:

            files = [
                f for f in os.listdir("data_inputs")
                if f.endswith(".mat")
            ]

            if files:

                fname = random.choice(files)

                CURRENT_FILENAME = fname

                mat = loadmat(
                    os.path.join("data_inputs", fname)
                )

                if "data" in mat:

                    eeg = mat["data"]

                    if eeg.ndim == 4:
                        eeg = eeg[:, :, :, 0]

                    EEG_DATA = preproc.normalize(eeg)

        except:
            pass

    # no data
    if EEG_DATA is None:

        return jsonify({
            "intent": intent,
            "pain": pain,
            "emotion": emotion,
            "filename": CURRENT_FILENAME
        })

    # =========================
    # PREP INPUT
    # =========================
    X = EEG_DATA[..., np.newaxis]

    ch = X.shape[1]

    CURRENT_STREAM_IDX = (
        CURRENT_STREAM_IDX + 1
    ) % X.shape[0]

    X_single = X[
        CURRENT_STREAM_IDX:
        CURRENT_STREAM_IDX + 1
    ]

    # =========================
    # 🔹 INTENT (UNCHANGED)
    # =========================
    if ch >= 69:

        pred = intent_model.predict(
            X_single[:, :69],
            verbose=0
        )

        idx = np.argmax(pred)

        intent = {
            "label": INTENT_LABELS[idx],
            "conf": f"{np.max(pred)*100:.1f}%"
        }

    # =========================
    # 🔹 PAIN (UNCHANGED)
    # =========================
    if ch >= 11:

        pred = pain_model.predict(
            X_single[:, :11],
            verbose=0
        )

        idx = np.argmax(pred)

        pain = {
            "value": PAIN_LABELS[idx],
            "conf": f"{np.max(pred)*100:.1f}%"
        }

    # =========================
    # 🔹 EMOTION (NEW FIX)
    # =========================
    if ch >= 62:

        pred = emotion_model.predict(
            X_single[:, :62],
            verbose=0
        )

        idx = np.argmax(pred)

        current_conf = np.max(pred) * 100

        # STORE STREAM RESULT
        EMOTION_HISTORY.append(idx)

        # keep only recent predictions
        if len(EMOTION_HISTORY) > 15:
            EMOTION_HISTORY.pop(0)

        #  MAJORITY VOTE
        final = np.bincount(
            EMOTION_HISTORY
        ).argmax()

        emotion = {
            "label": EMOTION_LABELS[final],
            "conf": f"{current_conf:.1f}%"
        }

    # =========================
    # 🔹 APPLY FUSION
    # =========================
    intent, pain, emotion = apply_fusion(
        intent,
        pain,
        emotion
    )

    # =========================
    # RESPONSE
    # =========================
    return jsonify({

        "intent": intent,

        "pain": pain,

        "emotion": emotion,

        "filename": CURRENT_FILENAME
    })

# =========================
# 🔹 WAVES (UNCHANGED)
# =========================
@app.route("/stream_waves")
def stream_waves():

    global EEG_DATA
    global CURRENT_WAVE_IDX
    global CURRENT_STREAM_IDX

    num_channels = 16
    points = 50

    data = []

    if EEG_DATA is not None:

        # 
        CURRENT_WAVE_IDX = (
            CURRENT_WAVE_IDX + 2
        ) % (
            EEG_DATA.shape[2] - points
        )

        for ch in range(
            min(num_channels, EEG_DATA.shape[1])
        ):

            raw = EEG_DATA[
                CURRENT_STREAM_IDX,
                ch,
                CURRENT_WAVE_IDX:
                CURRENT_WAVE_IDX + points
            ]

            mean = np.mean(raw)

            std = np.std(raw)

            if std < 1e-6:
                std = 1

            channel = [
                ((v - mean) / std) * 2
                for v in raw
            ]

            data.append(channel)

    return jsonify({
        "data": data
    })

# =========================
# RUN
# =========================
if __name__ == "__main__":
    app.run(debug=True)