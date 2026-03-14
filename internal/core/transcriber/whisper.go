package transcriber

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

// TranscribeAudio calls the whisper CLI tool to transcribe the given file.
// It uses the best available model (large-v3) if possible, but defaults to what's available or set.
func TranscribeAudio(ctx context.Context, filePath string) error {
	// Check if whisper is installed
	_, err := exec.LookPath("whisper")
	if err != nil {
		log.Printf("Whisper CLI not found, skipping transcription for %s", filePath)
		return nil // Not an error if whisper isn't installed
	}

	// Only process audio and video files
	ext := strings.ToLower(filepath.Ext(filePath))
	if !(ext == ".mp3" || ext == ".m4a" || ext == ".wav" || ext == ".mp4" || ext == ".mkv" || ext == ".webm" || ext == ".ts") {
		return nil
	}

	outputDir := filepath.Dir(filePath)
	
	log.Printf("Starting Whisper transcription for: %s", filePath)
	
	// Create transcription command using the large-v3 model on CPU.
	// You can change output_format to srt, vtt, txt, etc.
	cmd := exec.CommandContext(ctx, "whisper",
		filePath,
		"--model", "large-v3", // User requested the best model
		"--device", "cpu",     // Docker runs on CPU by default
		"--output_dir", outputDir,
		"--output_format", "srt",
	)

	// Capture output for debugging (optional)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("whisper transcription failed for %s: %w", filePath, err)
	}

	log.Printf("Whisper transcription completed for: %s", filePath)
	return nil
}
