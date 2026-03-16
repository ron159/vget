package transcriber

import (
	"bytes"
	"context"
	"fmt"
	"log"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
)

var ansiEscapePattern = regexp.MustCompile(`\x1b\[[0-9;]*[A-Za-z]`)

func normalizeTranscribeFormat(format string) string {
	switch strings.ToLower(strings.TrimSpace(format)) {
	case "srt", "vtt", "txt":
		return strings.ToLower(strings.TrimSpace(format))
	default:
		return "txt"
	}
}

func summarizeTranscriberOutput(stderr, stdout string) string {
	output := strings.TrimSpace(stderr)
	if output == "" {
		output = strings.TrimSpace(stdout)
	}
	if output == "" {
		return "transcriber exited without output"
	}

	output = strings.ReplaceAll(output, "\r", "\n")
	output = ansiEscapePattern.ReplaceAllString(output, "")

	lines := make([]string, 0, 8)
	for _, line := range strings.Split(output, "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		lines = append(lines, line)
	}

	if len(lines) == 0 {
		return "transcriber exited without readable output"
	}
	if len(lines) > 8 {
		lines = lines[len(lines)-8:]
	}

	return strings.Join(lines, " | ")
}

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
		"--output_format", normalizeTranscribeFormat(format),
		"--device", "cpu", 
	}

	cmd := exec.CommandContext(ctx, pythonCmd, args...)

	// Capture output so job errors remain concise.
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("funasr transcription failed for %s: %s (error: %w)", filePath, summarizeTranscriberOutput(stderr.String(), stdout.String()), err)
	}

	log.Printf("FunASR transcription completed for: %s", filePath)
	return nil
}
