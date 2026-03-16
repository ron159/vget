import os
import sys
import argparse
import time
from funasr import AutoModel
from funasr.utils.postprocess_utils import rich_transcription_postprocess

def srt_timestamp(seconds: float) -> str:
    """Convert float seconds to SRT timestamp format (HH:MM:SS,mmm)."""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int(round((seconds - int(seconds)) * 1000))
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

def main():
    parser = argparse.ArgumentParser(description="FunASR offline transcriber")
    parser.add_argument("audio", help="Path to input audio/video file")
    parser.add_argument("--device", default="cpu", help="Device to run on (e.g., 'cpu', 'cuda:0')")
    parser.add_argument("--output_dir", required=True, help="Directory to save the transcripts")
    parser.add_argument("--output_format", choices=["txt", "srt"], default="txt", help="Output transcript format")
    
    args = parser.parse_args()

    audio_file = args.audio
    output_dir = args.output_dir
    output_format = args.output_format

    if not os.path.exists(audio_file):
        print(f"Error: Input file {audio_file} does not exist.", file=sys.stderr)
        sys.exit(1)

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
        device=args.device,
        disable_update=True
    )

    print(f"Transcribing {audio_file}...")
    start_time = time.time()
    
    # We specify language="auto" to auto-detect, or you can force it if needed.
    # use_itn=True for text normalisation (like Whisper's normalization).
    res = model.generate(
        input=audio_file, 
        cache={}, 
        language="auto",  
        use_itn=True, 
        batch_size_s=60,
        sentence_timestamp=True
    )

    if not res or not len(res):
        print("Error: Empty response from model.", file=sys.stderr)
        sys.exit(1)

    # Note: SenseVoice returns text with emotions and lang tags. We use postprocess to clean it up.
    # format is typically: [{'key': 'filename', 'text': '<|zh|><|NEUTRAL|><|Speech|><|wo|>xxx', 'timestamp': [[start, end], [start, end]]}]
    data = res[0]
    raw_text = data.get("text", "")
    
    # Clean up the emojis and tags
    clean_text = rich_transcription_postprocess(raw_text, clean_emojis=True)
    
    if output_format == "txt":
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(clean_text)
            
    elif output_format == "srt":
        sentences = data.get("sentence_info", [])
        
        with open(out_path, "w", encoding="utf-8") as f:
            if not sentences:
                # Fallback if no detailed timestamps are generated
                f.write("1\n")
                f.write("00:00:00,000 --> 00:59:59,999\n")
                f.write(clean_text + "\n")
            else:
                srt_index = 1
                for sentence in sentences:
                    # Clean the individual sentence text from emojis and tags
                    raw_sent = sentence.get("text", "")
                    sent_text = rich_transcription_postprocess(raw_sent, clean_emojis=True).strip()
                    
                    if not sent_text:
                        continue
                        
                    start_ms = sentence.get("start", 0)
                    end_ms = sentence.get("end", 0)
                    
                    # Fallback to token array if 'start' and 'end' keys aren't readily available
                    if start_ms == 0 and end_ms == 0 and "timestamp" in sentence and len(sentence["timestamp"]) > 0:
                        start_ms = sentence["timestamp"][0][0]
                        end_ms = sentence["timestamp"][-1][1]
                    
                    start_sec = start_ms / 1000.0
                    end_sec = end_ms / 1000.0
                    
                    f.write(f"{srt_index}\n")
                    f.write(f"{srt_timestamp(start_sec)} --> {srt_timestamp(end_sec)}\n")
                    f.write(sent_text + "\n\n")
                    
                    srt_index += 1

    elapsed = time.time() - start_time
    print(f"Transcription finished in {elapsed:.2f} seconds. Output saved to {out_path}")

if __name__ == "__main__":
    main()
