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
	
	log.Printf("Starting Faster Whisper (ctranslate2) transcription for: %s", filePath)
	
	// Create transcription command using the small model on CPU with int8 quantization.
	// whisper-ctranslate2 is a drop-in replacement CLI for openai-whisper.
	cmd := exec.CommandContext(ctx, "whisper-ctranslate2",
		filePath,
		"--model", "small", // Small model balances speed and accuracy for N100/N300 CPUs
		"--device", "cpu",     // Docker runs on CPU by default
		"--compute_type", "int8", // Use int8 quantization to cut memory usage in half
		"--output_dir", outputDir,
		"--output_format", format,
	)

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
