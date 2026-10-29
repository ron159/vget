package server

import (
	"context"
	"encoding/json"
	"github.com/gin-gonic/gin"
	"net/http/httptest"
	"testing"
)

func TestTranscriptionStartsAtZeroAfterDownload(t *testing.T) {
	jq := NewJobQueue(1, t.TempDir(), nil)
	jq.jobs["test"] = &Job{ID: "test", Status: JobStatusDownloading, Progress: 100}
	jq.updateJobStatus("test", JobStatusTranscribing, 0, "")
	job := jq.GetJob("test")
	if job.Progress != 0 || job.TranscriptionStartedAt == nil || job.TranscriptionStage != "loading_model" {
		t.Fatalf("transcription state: %+v", job)
	}
}

func TestCancelTranscriptionIgnoresLateProgress(t *testing.T) {
	jq := NewJobQueue(1, t.TempDir(), nil)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	jq.jobs["test"] = &Job{ID: "test", Status: JobStatusTranscribing, ctx: ctx, cancel: cancel}
	if !jq.CancelJob("test") {
		t.Fatal("transcription could not be cancelled")
	}
	jq.updateTranscriptionStage("test", "writing")
	jq.updateJobStatus("test", JobStatusFailed, 0, "process killed")
	job := jq.GetJob("test")
	if job.Status != JobStatusCancelled || job.TranscriptionStage != "" || ctx.Err() != context.Canceled {
		t.Fatalf("cancelled state: %+v", job)
	}
}

func TestJobsAPIIncludesTranscriptionState(t *testing.T) {
	jq := NewJobQueue(1, t.TempDir(), nil)
	jq.jobs["test"] = &Job{ID: "test", URL: "https://example.com/podcast.mp3", Status: JobStatusDownloading, Progress: 100, Transcribe: true}
	jq.updateJobStatus("test", JobStatusTranscribing, 0, "")
	jq.updateTranscriptionStage("test", "writing")
	s := &Server{jobQueue: jq}
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	s.handleGetJobs(c)
	var response struct {
		Data struct {
			Jobs []Job `json:"jobs"`
		} `json:"data"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatal(err)
	}
	if len(response.Data.Jobs) != 1 {
		t.Fatalf("response: %s", recorder.Body.String())
	}
	job := response.Data.Jobs[0]
	if !job.Transcribe || job.TranscriptionStage != "writing" || job.TranscriptionStartedAt == nil || job.Progress != 0 {
		t.Fatalf("API transcription state: %+v", job)
	}
}
