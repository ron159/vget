import contextlib
import importlib.util
import io
import json
from pathlib import Path
import sys
import tempfile
import types
import unittest
from unittest.mock import patch


# Keep these wrapper tests independent of model downloads and GPU libraries.
with patch.dict(sys.modules, {
    "funasr": types.SimpleNamespace(AutoModel=None),
    "funasr.utils": types.ModuleType("funasr.utils"),
    "funasr.utils.postprocess_utils": types.SimpleNamespace(rich_transcription_postprocess=lambda text: text),
}):
    spec = importlib.util.spec_from_file_location("transcriber", Path(__file__).with_name("funasr_transcriber.py"))
    transcriber = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(transcriber)


class WrapperTests(unittest.TestCase):
    def test_main_reports_stages_and_preserves_text_output(self):
        class Model:
            def generate(self, **kwargs):
                return [{"text": "<|zh|>你好。"}]

        with tempfile.TemporaryDirectory() as directory:
            audio = Path(directory, "speech.wav")
            audio.touch()
            output = io.StringIO()
            with patch.object(transcriber, "AutoModel", return_value=Model()), \
                 patch.object(transcriber, "prepare_runtime_dirs"), \
                 patch.object(sys, "argv", ["transcriber", str(audio), "--output_dir", directory]), \
                 contextlib.redirect_stdout(output):
                transcriber.main()
            events = [json.loads(line.removeprefix("VGET_PROGRESS "))["stage"]
                      for line in output.getvalue().splitlines() if line.startswith("VGET_PROGRESS ")]
            self.assertEqual(events, ["loading_model", "transcribing", "writing"])
            self.assertEqual(Path(directory, "speech.txt").read_text(), "你好。")

    def test_legacy_timestamp_fallback_still_works(self):
        class Model:
            def generate(self, **kwargs):
                if kwargs["sentence_timestamp"]:
                    raise KeyError("timestamp")
                return [{"text": "speech"}]

        result = transcriber.generate_transcription(Model(), "speech.wav", True)
        self.assertEqual(result, [{"text": "speech"}])


if __name__ == "__main__":
    unittest.main()
