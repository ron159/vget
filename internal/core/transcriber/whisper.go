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
	// Check if the wrapper script exists in the Docker container
	pythonCmd := "python3"
	if _, err := exec.LookPath(pythonCmd); err != nil {
		log.Printf("Python3 not found, failing transcription for %s", filePath)
		return fmt.Errorf("python3 not found in PATH")
	}

	// Only process audio and video files
	ext := strings.ToLower(filepath.Ext(filePath))
	if !(ext == ".mp3" || ext == ".m4a" || ext == ".wav" || ext == ".mp4" || ext == ".mkv" || ext == ".webm" || ext == ".ts") {
		return nil
	}

	outputDir := filepath.Dir(filePath)
	
	log.Printf("Starting FunASR (SenseVoiceSmall) transcription for: %s", filePath)
	
	// Delegate to our python wrapper
	args := []string{
		"/usr/local/bin/funasr_transcriber.py",
		filePath,
		"--output_dir", outputDir,
		"--output_format", format,
		"--device", "cpu", 
	}

	cmd := exec.CommandContext(ctx, pythonCmd, args...)

	// Capture output for debugging
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	cmd.Stdout = os.Stdout

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("funasr transcription failed for %s: %s (error: %w)", filePath, stderr.String(), err)
	}

	log.Printf("FunASR transcription completed for: %s", filePath)
	return nil
}
