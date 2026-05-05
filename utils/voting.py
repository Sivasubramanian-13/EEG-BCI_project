import numpy as np

def majority_vote(buffer):
    if len(buffer) == 0:
        return None
    return int(np.bincount(buffer).argmax())


def confidence(buffer, cls):
    if len(buffer) == 0:
        return 0.0
    return (buffer.count(cls) / len(buffer)) * 100