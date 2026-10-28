"""Parameter parsing for the indic-speech and image-to-3d Modal apps."""

import importlib.util
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent


def load(app_dir: str):
    spec = importlib.util.spec_from_file_location(f"{app_dir}_mod", ROOT / app_dir / "main.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


@pytest.fixture(scope="module")
def indic():
    return load("indic-speech")


@pytest.fixture(scope="module")
def td():
    return load("image-to-3d")


class TestIndicTTS:
    def test_defaults(self, indic):
        assert indic.parse_tts_params("hi", None, {}) == {
            "language": "hi",
            "voice": "Ahana",
            "normalize": True,
        }

    def test_language_is_case_insensitive(self, indic):
        assert indic.parse_tts_params(" TA ", "Ritvik", {})["language"] == "ta"

    @pytest.mark.parametrize("lang", ["", "xx", "fr", None])
    def test_rejects_unknown_language(self, indic, lang):
        with pytest.raises(ValueError):
            indic.parse_tts_params(lang, None, {})

    @pytest.mark.parametrize("voice", ["", "a", "../etc", "Ahana; drop", "x" * 40, 5])
    def test_junk_voice_falls_back(self, indic, voice):
        assert indic.parse_tts_params("hi", voice, {})["voice"] == "Ahana"

    def test_normalize_must_be_bool(self, indic):
        assert indic.parse_tts_params("hi", None, {"normalize": "no"})["normalize"] is True
        assert indic.parse_tts_params("hi", None, {"normalize": False})["normalize"] is False


class TestIndicSTT:
    def test_defaults(self, indic):
        assert indic.parse_stt_params("hi", {}) == {"language": "hi", "decoding": "ctc"}

    def test_stt_has_22_languages_and_tts_subset(self, indic):
        assert len(indic.STT_LANGUAGES) == 22
        assert set(indic.TTS_LANGUAGES) - {"en"} <= set(indic.STT_LANGUAGES)

    def test_english_not_supported_for_stt(self, indic):
        with pytest.raises(ValueError):
            indic.parse_stt_params("en", {})

    def test_decoding(self, indic):
        assert indic.parse_stt_params("ta", {"decoding": "rnnt"})["decoding"] == "rnnt"
        assert indic.parse_stt_params("ta", {"decoding": "bogus"})["decoding"] == "ctc"


class TestImageTo3D:
    def test_defaults(self, td):
        assert td.parse_3d_params({}) == {
            "resolution": 1024,
            "refine_steps": 25,
            "coarse_steps": 30,
            "guidance_scale": 5.0,
            "seed": 0,
            "refine": True,
            "remove_background": True,
        }

    @pytest.mark.parametrize("res", [256, 1536, "1024", True, None, 1.5])
    def test_resolution_limited_to_supported(self, td, res):
        assert td.parse_3d_params({"resolution": res})["resolution"] == 1024

    def test_resolution_512(self, td):
        assert td.parse_3d_params({"resolution": 512})["resolution"] == 512

    def test_clamps(self, td):
        p = td.parse_3d_params({"refine_steps": 999, "coarse_steps": 1, "guidance_scale": 99})
        assert (p["refine_steps"], p["coarse_steps"], p["guidance_scale"]) == (50, 10, 10.0)

    def test_junk_and_nan(self, td):
        p = td.parse_3d_params({"refine_steps": "x", "guidance_scale": float("nan"), "seed": -3})
        assert (p["refine_steps"], p["guidance_scale"], p["seed"]) == (25, 5.0, 0)

    def test_flags_must_be_bool(self, td):
        p = td.parse_3d_params({"refine": "false", "remove_background": 0})
        assert p["refine"] is True and p["remove_background"] is True
        assert td.parse_3d_params({"refine": False})["refine"] is False


def test_costs_positive(indic, td):
    assert indic.run_cost_usd(10_000, "A10G", 16) > indic.run_cost_usd(10_000, "T4", 8) > 0
    assert td.run_cost_usd(60_000) > 0


@pytest.fixture(params=["indic-speech", "image-to-3d", "video-gen", "tts-gen"])
def keymod(request, monkeypatch):
    monkeypatch.setenv("R2_PUBLIC_URL", "https://acct.r2.cloudflarestorage.com/my-bucket")
    monkeypatch.setenv("R2_BUCKET_NAME", "my-bucket")
    return load(request.param)


class TestUploadKey:
    base = "https://acct.r2.cloudflarestorage.com"

    def test_accepts_uploads_with_and_without_bucket_prefix(self, keymod):
        assert keymod.r2_key_from_url(f"{self.base}/my-bucket/uploads/u1/2026-10-28/a.png") == (
            "uploads/u1/2026-10-28/a.png"
        )
        assert keymod.r2_key_from_url(f"{self.base}/uploads/u1/d/a.png") == "uploads/u1/d/a.png"

    @pytest.mark.parametrize(
        "path",
        [
            "/my-bucket/audio/2026-10-28/other-users-output.wav",
            "/my-bucket/uploads/../audio/x.wav",
            "/my-bucket/uploads/%2e%2e/audio/x.wav",
            "/my-bucket/",
        ],
    )
    def test_rejects_non_upload_keys(self, keymod, path):
        with pytest.raises(ValueError):
            keymod.r2_key_from_url(self.base + path)

    def test_rejects_other_origin(self, keymod):
        with pytest.raises(ValueError):
            keymod.r2_key_from_url("https://evil.com/my-bucket/uploads/u/d/a.png")

    def test_size_cap_checked_before_read(self, keymod):
        class Client:
            def get_object(self, **_):
                return {"ContentLength": 10**9, "Body": None}

        with pytest.raises(ValueError):
            keymod.fetch_r2_bytes(Client(), "my-bucket", f"{self.base}/uploads/u/d/a.png")
