import os
import sys
import argparse
import time
import subprocess
import inspect
import re
from funasr import AutoModel
from funasr.utils.postprocess_utils import rich_transcription_postprocess


EMOJI_PATTERN = re.compile(
    "["
    "\U0001F300-\U0001F5FF"
    "\U0001F600-\U0001F64F"
    "\U0001F680-\U0001F6FF"
    "\U0001F700-\U0001F77F"
    "\U0001F780-\U0001F7FF"
    "\U0001F800-\U0001F8FF"
    "\U0001F900-\U0001F9FF"
    "\U0001FA00-\U0001FAFF"
    "\U00002700-\U000027BF"
    "\U00002600-\U000026FF"
    "\uFE0F"
    "]+",
    flags=re.UNICODE,
)
FUNASR_TAG_PATTERN = re.compile(r"<\s*\|[^<>]+?\|\s*>", flags=re.UNICODE)
FUNASR_NOISE_PATTERN = re.compile(
    r"\b(?:NEUTRAL|Speech|BGM|Applause|Laughter|Cry|Cough|Sneeze|Breath|with\s*i\s*tn|withitn)\b",
    flags=re.IGNORECASE,
)
SENTENCE_BOUNDARY_PATTERN = re.compile(r"(?<=[。！？!?；;…])")
CLAUSE_BOUNDARY_PATTERN = re.compile(r"(?<=[，、,:：])")
CHINESE_CHAR_PATTERN = re.compile(r"[\u3400-\u9FFF]")
TEXT_CONTENT_PATTERN = re.compile(r"[A-Za-z0-9\u3400-\u9FFF]")

def srt_timestamp(seconds: float) -> str:
    """Convert float seconds to SRT timestamp format (HH:MM:SS,mmm)."""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int(round((seconds - int(seconds)) * 1000))
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

def vtt_timestamp(seconds: float) -> str:
    """Convert float seconds to WebVTT timestamp format (HH:MM:SS.mmm)."""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int(round((seconds - int(seconds)) * 1000))
    return f"{h:02d}:{m:02d}:{s:02d}.{ms:03d}"

def normalize_output_format(output_format: str) -> str:
    output_format = (output_format or "txt").lower().strip()
    if output_format in {"txt", "srt", "vtt"}:
        return output_format
    return "txt"


def strip_emojis(text: str) -> str:
    return EMOJI_PATTERN.sub("", text or "")


def strip_funasr_tags(text: str) -> str:
    if not text:
        return ""
    text = FUNASR_TAG_PATTERN.sub(" ", text)
    text = FUNASR_NOISE_PATTERN.sub(" ", text)
    return text


def normalize_spacing(text: str) -> str:
    if not text:
        return ""

    text = re.sub(r"\s+", " ", text).strip()
    text = re.sub(r"\s+([，。！？；：、,.!?;:])", r"\1", text)
    text = re.sub(r"([（《“])\s+", r"\1", text)
    text = re.sub(r"\s+([）》”])", r"\1", text)
    text = re.sub(r"([，。！？；：、,.!?;:])\1+", r"\1", text)
    text = re.sub(r"…{2,}", "…", text)

    chars = []
    for ch in text:
        if ch == " ":
            if not chars:
                continue
            next_prev = chars[-1]
            if CHINESE_CHAR_PATTERN.match(next_prev):
                continue
            chars.append(ch)
            continue

        if chars and chars[-1] == " " and CHINESE_CHAR_PATTERN.match(ch):
            chars.pop()

        chars.append(ch)
        prev = ch

    return "".join(chars).strip()


def clean_transcription_text(raw_text: str) -> str:
    if not raw_text:
        return ""

    raw_text = strip_funasr_tags(raw_text)

    try:
        parameters = inspect.signature(rich_transcription_postprocess).parameters
        if "clean_emojis" in parameters:
            text = rich_transcription_postprocess(raw_text, clean_emojis=True)
        else:
            text = rich_transcription_postprocess(raw_text)
    except (TypeError, ValueError):
        text = rich_transcription_postprocess(raw_text)

    text = strip_funasr_tags(text)
    text = strip_emojis(text)
    return normalize_spacing(text)

def prepare_runtime_dirs() -> None:
    xdg_cache_home = os.environ.get("XDG_CACHE_HOME")
    if not xdg_cache_home:
        xdg_cache_home = os.path.join(os.path.expanduser("~"), ".cache")
        os.environ["XDG_CACHE_HOME"] = xdg_cache_home

    cache_dir = os.environ.get("VGET_CACHE_DIR") or os.path.join(xdg_cache_home, "vget")
    modelscope_cache = os.environ.get("MODELSCOPE_CACHE") or os.path.join(xdg_cache_home, "modelscope")
    huggingface_cache = os.environ.get("HF_HOME") or os.path.join(xdg_cache_home, "huggingface")
    torch_cache = os.environ.get("TORCH_HOME") or os.path.join(xdg_cache_home, "torch")

    for path in (cache_dir, modelscope_cache, huggingface_cache, torch_cache):
        os.makedirs(path, exist_ok=True)

    os.environ.setdefault("VGET_CACHE_DIR", cache_dir)
    os.environ.setdefault("TMPDIR", cache_dir)
    os.environ.setdefault("JIEBA_CACHE_DIR", cache_dir)
    os.environ.setdefault("MODELSCOPE_CACHE", modelscope_cache)
    os.environ.setdefault("HF_HOME", huggingface_cache)
    os.environ.setdefault("TORCH_HOME", torch_cache)

    try:
        import jieba

        jieba.dt.tmp_dir = cache_dir
        jieba.dt.cache_file = os.path.join(cache_dir, "jieba.cache")
    except Exception:
        # Jieba is optional here; transcription can still proceed without this tweak.
        pass

def extract_time_range_ms(item):
    start_ms = item.get("start")
    end_ms = item.get("end")

    if isinstance(start_ms, (int, float)) and isinstance(end_ms, (int, float)) and end_ms > start_ms:
        return float(start_ms), float(end_ms)

    timestamps = item.get("timestamp") or []
    if timestamps and isinstance(timestamps, list):
        first = timestamps[0]
        last = timestamps[-1]
        if (
            isinstance(first, (list, tuple)) and len(first) >= 2 and
            isinstance(last, (list, tuple)) and len(last) >= 2
        ):
            return float(first[0]), float(last[1])

    return None, None

def media_duration_seconds(audio_file: str):
    try:
        result = subprocess.run(
            [
                "ffprobe",
                "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                audio_file,
            ],
            check=True,
            capture_output=True,
            text=True,
        )
        return max(float(result.stdout.strip()), 0.0)
    except Exception:
        return None


def split_subtitle_text(text: str, max_chars: int = 28):
    text = normalize_spacing(text)
    if not text:
        return []

    parts = []
    for sentence in SENTENCE_BOUNDARY_PATTERN.split(text):
        sentence = sentence.strip()
        if not sentence:
            continue

        if len(sentence) <= max_chars:
            parts.append(sentence)
            continue

        for clause in CLAUSE_BOUNDARY_PATTERN.split(sentence):
            clause = clause.strip()
            if not clause:
                continue

            if len(clause) <= max_chars:
                parts.append(clause)
                continue

            start = 0
            while start < len(clause):
                parts.append(clause[start:start + max_chars].strip())
                start += max_chars

    return [part for part in parts if part and TEXT_CONTENT_PATTERN.search(part)]


def estimate_subtitle_entries(text: str, start_ms: float, end_ms: float):
    parts = split_subtitle_text(text)
    if not parts:
        return []

    effective_end_ms = max(end_ms, start_ms + float(len(parts) * 800))
    total_ms = max(effective_end_ms - start_ms, float(len(parts) * 800))
    weights = [max(len(part.replace(" ", "")), 1) for part in parts]
    weight_sum = sum(weights) or len(parts)

    entries = []
    cursor = start_ms
    for index, part in enumerate(parts):
        if index == len(parts) - 1:
            next_cursor = effective_end_ms
        else:
            duration = max(total_ms * weights[index] / weight_sum, 800.0)
            next_cursor = min(effective_end_ms, cursor + duration)
        entries.append((cursor / 1000.0, next_cursor / 1000.0, part))
        cursor = next_cursor

    return entries

def build_subtitle_entries(clean_text: str, data: dict, audio_file: str):
    entries = []
    for sentence in data.get("sentence_info") or []:
        raw_sentence = sentence.get("text", "")
        sentence_text = clean_transcription_text(raw_sentence)
        if not sentence_text:
            continue

        start_ms, end_ms = extract_time_range_ms(sentence)
        if start_ms is None or end_ms is None or end_ms <= start_ms:
            continue

        entries.append((start_ms / 1000.0, end_ms / 1000.0, sentence_text))

    if len(entries) > 1:
        return entries

    if len(entries) == 1:
        only_start_ms = entries[0][0] * 1000.0
        only_end_ms = entries[0][1] * 1000.0
        estimated = estimate_subtitle_entries(clean_text or entries[0][2], only_start_ms, only_end_ms)
        if len(estimated) > 1:
            return estimated
        return entries

    fallback_text = clean_text.strip()
    if not fallback_text:
        return []

    start_ms, end_ms = extract_time_range_ms(data)
    if start_ms is None or end_ms is None or end_ms <= start_ms:
        duration = media_duration_seconds(audio_file)
        start_ms = 0.0
        end_ms = (duration * 1000.0) if duration and duration > 0 else 1000.0

    estimated = estimate_subtitle_entries(fallback_text, start_ms, end_ms)
    if estimated:
        return estimated

    return [(start_ms / 1000.0, end_ms / 1000.0, fallback_text)]

def write_subtitles(out_path: str, output_format: str, entries) -> None:
    with open(out_path, "w", encoding="utf-8") as f:
        if output_format == "vtt":
            f.write("WEBVTT\n\n")

        for index, (start_sec, end_sec, text) in enumerate(entries, start=1):
            if output_format == "srt":
                f.write(f"{index}\n")
                f.write(f"{srt_timestamp(start_sec)} --> {srt_timestamp(end_sec)}\n")
            else:
                f.write(f"{vtt_timestamp(start_sec)} --> {vtt_timestamp(end_sec)}\n")
            f.write(text + "\n\n")

def generate_transcription(model, audio_file: str, want_sentence_timestamps: bool):
    kwargs = {
        "input": audio_file,
        "cache": {},
        "language": "auto",
        "use_itn": True,
        "batch_size_s": 60,
        "sentence_timestamp": want_sentence_timestamps,
    }

    try:
        return model.generate(**kwargs)
    except KeyError as exc:
        if want_sentence_timestamps and exc.args and exc.args[0] == "timestamp":
            print(
                "Warning: sentence timestamps unavailable for this file, retrying without timestamps.",
                file=sys.stderr,
            )
            kwargs["sentence_timestamp"] = False
            return model.generate(**kwargs)
        raise

def main():
    parser = argparse.ArgumentParser(description="FunASR offline transcriber")
    parser.add_argument("audio", help="Path to input audio/video file")
    parser.add_argument("--device", default="cpu", help="Device to run on (e.g., 'cpu', 'cuda:0')")
    parser.add_argument("--output_dir", required=True, help="Directory to save the transcripts")
    parser.add_argument("--output_format", choices=["txt", "srt", "vtt"], default="txt", help="Output transcript format")
    
    args = parser.parse_args()

    audio_file = args.audio
    output_dir = args.output_dir
    output_format = normalize_output_format(args.output_format)

    if not os.path.exists(audio_file):
        print(f"Error: Input file {audio_file} does not exist.", file=sys.stderr)
        sys.exit(1)

    prepare_runtime_dirs()
    os.makedirs(output_dir, exist_ok=True)
    base_name = os.path.splitext(os.path.basename(audio_file))[0]
    out_path = os.path.join(output_dir, f"{base_name}.{output_format}")

    print(f"Loading SenseVoiceSmall model on {args.device}...")
    
    # Load SenseVoiceSmall, standard parameters for local inference
    model_dir = "iic/SenseVoiceSmall"
    model = AutoModel(
        model=model_dir,
        vad_model="fsmn-vad",
        vad_kwargs={"max_single_segment_time": 30000},
        punc_model="ct-punc",
        device=args.device,
        disable_update=True
    )

    print(f"Transcribing {audio_file}...")
    start_time = time.time()
    
    want_sentence_timestamps = output_format in {"srt", "vtt"}
    res = generate_transcription(model, audio_file, want_sentence_timestamps)

    if not res or not len(res):
        print("Error: Empty response from model.", file=sys.stderr)
        sys.exit(1)

    # Note: SenseVoice returns text with emotions and lang tags. We use postprocess to clean it up.
    # format is typically: [{'key': 'filename', 'text': '<|zh|><|NEUTRAL|><|Speech|><|wo|>xxx', 'timestamp': [[start, end], [start, end]]}]
    data = res[0]
    raw_text = data.get("text", "")
    
    # Clean up the emojis and tags
    clean_text = clean_transcription_text(raw_text)
    
    if output_format == "txt":
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(clean_text)
    else:
        subtitle_entries = build_subtitle_entries(clean_text, data, audio_file)
        write_subtitles(out_path, output_format, subtitle_entries)

    elapsed = time.time() - start_time
    print(f"Transcription finished in {elapsed:.2f} seconds. Output saved to {out_path}")

if __name__ == "__main__":
    main()
