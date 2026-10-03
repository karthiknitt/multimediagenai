"""R2-only URL guard used by video-gen (image_url) and tts-gen (voice_reference_url)."""

import importlib.util
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent


def load(app_dir: str):
    spec = importlib.util.spec_from_file_location(f"{app_dir}_main", ROOT / app_dir / "main.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


@pytest.fixture(params=["video-gen", "tts-gen"])
def mod(request, monkeypatch):
    monkeypatch.setenv("R2_PUBLIC_URL", "https://pub-abc123.r2.dev")
    return load(request.param)


@pytest.mark.parametrize(
    "url",
    [
        "https://pub-abc123.r2.dev/images/x.png",
        "https://pub-abc123.r2.dev/a/b/c.wav",
    ],
)
def test_allows_r2_origin(mod, url):
    mod.assert_r2_url(url)


@pytest.mark.parametrize(
    "url",
    [
        "https://evil.com/?.r2.dev",
        "https://pub-abc123.r2.dev.evil.com/x.png",
        "https://pub-abc123.r2.dev@evil.com/x.png",
        "http://pub-abc123.r2.dev/x.png",
        "https://pub-abc123.r2.dev:8443/x.png",
        "http://169.254.169.254/latest/meta-data/",
        "file:///etc/passwd",
        "not a url",
        "",
    ],
)
def test_rejects_other_origins(mod, url):
    with pytest.raises(ValueError):
        mod.assert_r2_url(url)


def test_falls_back_to_account_origin(mod, monkeypatch):
    monkeypatch.delenv("R2_PUBLIC_URL")
    monkeypatch.setenv("R2_ACCOUNT_ID", "acct")
    mod.assert_r2_url("https://pub-acct.r2.dev/x.png")
    with pytest.raises(ValueError):
        mod.assert_r2_url("https://pub-abc123.r2.dev/x.png")
