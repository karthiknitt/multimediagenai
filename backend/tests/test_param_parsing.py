"""Parameter parsing/clamping for each Modal app (user input is untrusted)."""

import importlib.util
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent


def load(app_dir: str):
    spec = importlib.util.spec_from_file_location(f"{app_dir}_params", ROOT / app_dir / "main.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


@pytest.fixture(scope="module")
def image():
    return load("image-gen")


@pytest.fixture(scope="module")
def video():
    return load("video-gen")


@pytest.fixture(scope="module")
def audio():
    return load("audio-gen")


@pytest.fixture(scope="module")
def tts():
    return load("tts-gen")


class TestImage:
    def test_defaults(self, image):
        assert image.parse_image_params({}) == {
            "width": 1024,
            "height": 1024,
            "steps": 9,
            "seed": None,
        }

    def test_clamps_and_snaps_to_16(self, image):
        p = image.parse_image_params({"width": 5000, "height": 1000, "steps": 99})
        assert p["width"] == 2048 and p["height"] == 992 and p["steps"] == 12
        assert image.parse_image_params({"width": 10, "steps": 0})["width"] == 256
        assert image.parse_image_params({"steps": 0})["steps"] == 1

    def test_garbage_falls_back(self, image):
        p = image.parse_image_params({"width": "abc", "steps": None, "seed": "x"})
        assert p == {"width": 1024, "height": 1024, "steps": 9, "seed": None}

    def test_seed_kept(self, image):
        assert image.parse_image_params({"seed": 42})["seed"] == 42


class TestVideo:
    def test_t2v_defaults(self, video):
        p = video.parse_video_params({}, i2v=False)
        assert (p["width"], p["height"], p["num_frames"], p["steps"], p["fps"]) == (
            832,
            480,
            81,
            40,
            16,
        )
        assert p["cfg"] == 4.0 and p["cfg2"] == 3.0
        assert p["negative_prompt"] == video.NEGATIVE_PROMPT

    def test_i2v_defaults(self, video):
        p = video.parse_video_params({}, i2v=True)
        assert p["cfg"] == 3.5 and p["cfg2"] is None

    def test_frames_snap_to_4k_plus_1_and_clamp(self, video):
        assert video.parse_video_params({"num_frames": 80}, False)["num_frames"] == 77
        assert video.parse_video_params({"num_frames": 500}, False)["num_frames"] == 121
        assert video.parse_video_params({"num_frames": 1}, False)["num_frames"] == 5

    def test_size_fps_clamp(self, video):
        p = video.parse_video_params({"width": 9999, "height": 100, "fps": 100}, False)
        assert p["width"] == 1280 and p["height"] == 256 and p["fps"] == 30

    def test_custom_negative_prompt_and_cfg2(self, video):
        p = video.parse_video_params({"negative_prompt": "blur", "cfg_scale_2": 2.5}, True)
        assert p["negative_prompt"] == "blur" and p["cfg2"] == 2.5

    def test_blank_negative_prompt_uses_default(self, video):
        p = video.parse_video_params({"negative_prompt": "   "}, False)
        assert p["negative_prompt"] == video.NEGATIVE_PROMPT


class TestMusic:
    def test_defaults(self, audio):
        p = audio.parse_music_params({})
        assert p["duration"] == 30.0 and p["instrumental"] is True and p["lyrics"] == ""
        assert p["vocal_language"] == "unknown" and p["bpm"] is None
        assert p["keyscale"] == "" and p["timesignature"] == ""
        assert p["lm_temperature"] == 0.85 and p["lm_top_p"] == 0.9 and p["thinking"] is True

    def test_lyrics_make_it_vocal_unless_forced_instrumental(self, audio):
        assert audio.parse_music_params({"lyrics": "la la"})["instrumental"] is False
        assert audio.parse_music_params({"lyrics": "la", "instrumental": True})["instrumental"]

    def test_validation_of_enums(self, audio):
        p = audio.parse_music_params(
            {
                "vocal_language": "klingon",
                "keyscale": "H# major",
                "time_signature": "5",
                "infer_method": "foo",
            }
        )
        assert p["vocal_language"] == "unknown" and p["keyscale"] == ""
        assert p["timesignature"] == "" and p["infer_method"] == "ode"
        ok = audio.parse_music_params(
            {"vocal_language": "ta", "keyscale": "C# minor", "time_signature": "6"}
        )
        assert ok["vocal_language"] == "ta" and ok["keyscale"] == "C# minor"
        assert ok["timesignature"] == "6"

    def test_clamps(self, audio):
        p = audio.parse_music_params(
            {
                "duration": 9999,
                "bpm": 1000,
                "shift": 99,
                "lm_temperature": 9,
                "fade_in_duration": 99,
            }
        )
        assert p["duration"] == 240.0 and p["bpm"] == 300 and p["shift"] == 5.0
        assert p["lm_temperature"] == 2.0 and p["fade_in_duration"] <= 10.0
        assert audio.parse_music_params({"duration": 1})["duration"] == 10.0

    def test_fades_never_exceed_half_duration(self, audio):
        p = audio.parse_music_params(
            {"duration": 10, "fade_in_duration": 10, "fade_out_duration": 10}
        )
        assert p["fade_in_duration"] + p["fade_out_duration"] <= 10.0


class TestTTS:
    def test_defaults(self, tts):
        p = tts.parse_tts_params({})
        assert p == {
            "temperature": 0.9,
            "top_k": 50,
            "top_p": 1.0,
            "repetition_penalty": 1.05,
            "subtalker_temperature": 0.9,
            "seed": None,
            "instruct": "",
            "reference_text": "",
        }

    def test_clamps(self, tts):
        p = tts.parse_tts_params(
            {"temperature": 9, "top_k": -5, "top_p": 5, "repetition_penalty": 0.1}
        )
        assert p["temperature"] == 1.5 and p["top_k"] == 0 and p["top_p"] == 1.0
        assert p["repetition_penalty"] == 1.0

    def test_text_fields_trimmed_and_capped(self, tts):
        p = tts.parse_tts_params({"instruct": "  warm  ", "reference_text": "x" * 900})
        assert p["instruct"] == "warm" and len(p["reference_text"]) == 500


def test_run_cost_usd_scales_with_runtime_and_gpu():
    video = load("video-gen")
    tts = load("tts-gen")
    assert video.run_cost_usd(0) == 0
    assert video.run_cost_usd(60_000) == pytest.approx(
        60 * (0.001097 + 0.125 * 0.0000131 + 96 * 0.00000222), rel=1e-3
    )
    assert video.run_cost_usd(120_000) == pytest.approx(2 * video.run_cost_usd(60_000), rel=1e-3)
    assert tts.run_cost_usd(10_000) < video.run_cost_usd(10_000)
