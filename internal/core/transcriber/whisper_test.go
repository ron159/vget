package transcriber

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestProgressWriterStreamsPartialLines(t *testing.T) {
	var stages []string
	writer := &progressWriter{onProgress: func(stage string) { stages = append(stages, stage) }}
	for _, part := range []string{"model log\nVGET_PROGRESS {\"stage\":\"loading_", "model\"}\nVGET_PROGRESS {\"stage\":\"transcribing\"}\n", "VGET_PROGRESS invalid\nVGET_PROGRESS {\"stage\":\"unknown\"}\n"} {
		if n, err := writer.Write([]byte(part)); err != nil || n != len(part) {
			t.Fatalf("write: %d, %v", n, err)
		}
	}
	if len(stages) != 2 || stages[0] != "loading_model" || stages[1] != "transcribing" {
		t.Fatalf("stages = %v", stages)
	}
}

func TestTranscribeAudioReportsBeforeProcessExit(t *testing.T) {
	dir := t.TempDir()
	ack := filepath.Join(dir, "ack")
	script := "#!/bin/sh\nprintf 'VGET_PROGRESS {\"stage\":\"transcribing\"}\\n'\nwhile [ ! -f '" + ack + "' ]; do sleep 0.01; done\n"
	if err := os.WriteFile(filepath.Join(dir, "python3"), []byte(script), 0755); err != nil {
		t.Fatal(err)
	}
	t.Setenv("PATH", dir+string(os.PathListSeparator)+os.Getenv("PATH"))
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	var stages []string
	err := TranscribeAudio(ctx, filepath.Join(dir, "speech.wav"), "txt", func(stage string) {
		stages = append(stages, stage)
		if err := os.WriteFile(ack, []byte("ack"), 0600); err != nil {
			t.Error(err)
		}
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(stages) != 1 || stages[0] != "transcribing" {
		t.Fatalf("stages = %v", stages)
	}
}
