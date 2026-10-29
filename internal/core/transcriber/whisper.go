package transcriber

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
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

// TranscribeAudio runs the FunASR wrapper and forwards live stage events.
func TranscribeAudio(ctx context.Context, filePath string, format string, onProgress func(string)) error {
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
		"-u",
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
	cmd.Stdout = io.MultiWriter(&stdout, &progressWriter{onProgress: onProgress})
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("funasr transcription failed for %s: %s (error: %w)", filePath, summarizeTranscriberOutput(stderr.String(), stdout.String()), err)
	}

	log.Printf("FunASR transcription completed for: %s", filePath)
	return nil
}

// progressWriter forwards flushed stage events while preserving ordinary model logs.
type progressWriter struct {
	pending    []byte
	onProgress func(string)
}

func (w *progressWriter) Write(data []byte) (int, error) {
	for _, b := range data {
		if b != '\n' {
			if len(w.pending) < 65536 {
				w.pending = append(w.pending, b)
			}
			continue
		}
		line := strings.TrimSpace(string(w.pending))
		w.pending = w.pending[:0]
		if !strings.HasPrefix(line, "VGET_PROGRESS ") {
			continue
		}
		var event struct {
			Stage string `json:"stage"`
		}
		if json.Unmarshal([]byte(strings.TrimPrefix(line, "VGET_PROGRESS ")), &event) != nil {
			continue
		}
		switch event.Stage {
		case "loading_model", "transcribing", "writing":
			if w.onProgress != nil {
				w.onProgress(event.Stage)
			}
		}
	}
	return len(data), nil
}
