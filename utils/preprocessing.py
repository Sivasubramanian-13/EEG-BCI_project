import numpy as np

def normalize(eeg):
    # 🔥 TEMP TEST — REMOVE NORMALIZATION
    eeg = eeg.astype(np.float32)
    return eeg


def pad_to_200(chunk):
    if chunk.shape[1] < 200:
        pad = np.zeros((chunk.shape[0], 200 - chunk.shape[1], 1))
        chunk = np.concatenate([chunk, pad], axis=1)
    return chunk