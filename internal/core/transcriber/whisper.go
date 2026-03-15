package transcriber

import (
	"bytes"
	"context"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

// TranscribeAudio calls the whisper CLI tool to transcribe the given file.
// It uses the 'small' model to balance accuracy and CPU performance on lower-end devices.
func TranscribeAudio(ctx context.Context, filePath string, format string) error {
	// Check if whisper-ctranslate2 is installed
	_, err := exec.LookPath("whisper-ctranslate2")
	if err != nil {
		log.Printf("Faster Whisper CLI not found, failing transcription for %s", filePath)
		return fmt.Errorf("whisper-ctranslate2 CLI not found in PATH")
	}

	// Only process audio and video files
	ext := strings.ToLower(filepath.Ext(filePath))
	if !(ext == ".mp3" || ext == ".m4a" || ext == ".wav" || ext == ".mp4" || ext == ".mkv" || ext == ".webm" || ext == ".ts") {
		return nil
	}

	outputDir := filepath.Dir(filePath)
	
	log.Printf("Probing Faster Whisper to detect language for: %s", filePath)

	// First pass: Detect language without full transcription (probe)
	// whisper-ctranslate2 has a small overhead for this. A robust way in CLI is to look at output
	// or rely on a wrapper script. Since whisper-ctranslate2 outputs `Detected language: ...`, we can parse it.
	probeCmd := exec.CommandContext(ctx, "whisper-ctranslate2",
		filePath,
		"--model", "small", // Use same model to avoid loading multiple
		"--device", "cpu",
		"--compute_type", "int8",
	)

	var probeOut bytes.Buffer
	probeCmd.Stdout = &probeOut
	probeCmd.Stderr = &probeOut
	// Let it run in the background just long enough to output language or read stderr
	_ = probeCmd.Run()

	outStr := probeOut.String()
	isChinese := strings.Contains(outStr, "Detected language: Chinese") || strings.Contains(outStr, "language 'zh'") || strings.Contains(outStr, "[zh]")

	log.Printf("Starting Faster Whisper (ctranslate2) transcription for: %s", filePath)
	
	// Create transcription command
	args := []string{
		filePath,
		"--model", "small", // Small model balances speed and accuracy for N100/N300 CPUs
		"--device", "cpu",     // Docker runs on CPU by default
		"--compute_type", "int8", // Use int8 quantization to cut memory usage in half
		"--output_dir", outputDir,
		"--output_format", format,
	}

	if isChinese {
		args = append(args, "--initial_prompt", "以下是普通话的句子，这是一段简体中文的语音记录。")
	}

	cmd := exec.CommandContext(ctx, "whisper-ctranslate2", args...)

	// Capture output for debugging
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	cmd.Stdout = os.Stdout

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("faster-whisper transcription failed for %s: %s (error: %w)", filePath, stderr.String(), err)
	}

	log.Printf("Faster Whisper transcription completed for: %s", filePath)
	return nil
}
