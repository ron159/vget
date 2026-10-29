package webdav

import (
	"context"
	"io"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/guiyumin/vget/internal/core/config"
	dav "golang.org/x/net/webdav"
)

func TestConfiguredSubpathManagement(t *testing.T) {
	dir := t.TempDir()
	handler := &dav.Handler{Prefix: "/dav", FileSystem: dav.Dir(dir), LockSystem: dav.NewMemLS()}
	server := httptest.NewServer(handler)
	defer server.Close()
	client, err := NewClientFromConfig(&config.WebDAVServer{URL: server.URL + "/dav/"})
	if err != nil {
		t.Fatal(err)
	}
	ctx := context.Background()
	if err := client.MkdirAll(ctx, "/nested/child"); err != nil {
		t.Fatal(err)
	}
	if err := client.Upload(ctx, "/nested/child/audio.txt", strings.NewReader("speech")); err != nil {
		t.Fatal(err)
	}
	files, err := client.List(ctx, "/nested/child")
	if err != nil || len(files) != 1 {
		t.Fatalf("list: %v, %v", files, err)
	}
	reader, _, err := client.Open(ctx, files[0].Path)
	if err != nil {
		t.Fatal(err)
	}
	data, err := io.ReadAll(reader)
	reader.Close()
	if err != nil || string(data) != "speech" {
		t.Fatalf("read: %q, %v", data, err)
	}
	if err := client.Remove(ctx, "/nested"); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(dir + "/nested"); !os.IsNotExist(err) {
		t.Fatalf("directory not removed: %v", err)
	}
}
