package server

import (
	"fmt"
	"net/http"
	"path"
	"path/filepath"
	"sort"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/guiyumin/vget/internal/core/config"
	"github.com/guiyumin/vget/internal/core/webdav"
)

// WebDAVRemoteInfo is the response for a single remote
type WebDAVRemoteInfo struct {
	Name    string `json:"name"`
	URL     string `json:"url"`
	HasAuth bool   `json:"hasAuth"`
}

// WebDAVFileInfo is the response for a single file/directory
type WebDAVFileInfo struct {
	Name  string `json:"name"`
	Path  string `json:"path"`
	Size  int64  `json:"size"`
	IsDir bool   `json:"isDir"`
}

// WebDAVDownloadRequest is the request body for POST /api/webdav/download
type WebDAVDownloadRequest struct {
	Remote string   `json:"remote" binding:"required"`
	Files  []string `json:"files" binding:"required"`
}

type WebDAVDeleteRequest struct {
	Remote string   `json:"remote" binding:"required"`
	Paths  []string `json:"paths" binding:"required"`
}

type WebDAVMkdirRequest struct {
	Remote string `json:"remote" binding:"required"`
	Path   string `json:"path"`
	Name   string `json:"name" binding:"required"`
}

// GET /api/webdav/remotes - List all configured WebDAV servers
func (s *Server) handleWebDAVRemotes(c *gin.Context) {
	cfg := config.LoadOrDefault()

	remotes := make([]WebDAVRemoteInfo, 0, len(cfg.WebDAVServers))
	for name, server := range cfg.WebDAVServers {
		remotes = append(remotes, WebDAVRemoteInfo{
			Name:    name,
			URL:     server.URL,
			HasAuth: server.Username != "",
		})
	}

	// Sort by name for consistent ordering
	sort.Slice(remotes, func(i, j int) bool {
		return remotes[i].Name < remotes[j].Name
	})

	c.JSON(http.StatusOK, Response{
		Code:    200,
		Data:    gin.H{"remotes": remotes},
		Message: "success",
	})
}

// GET /api/webdav/list?remote=xxx&path=/xxx - List directory contents
func (s *Server) handleWebDAVList(c *gin.Context) {
	remoteName := c.Query("remote")
	if remoteName == "" {
		c.JSON(http.StatusBadRequest, Response{
			Code:    400,
			Data:    nil,
			Message: "remote parameter is required",
		})
		return
	}

	path := c.Query("path")
	if path == "" {
		path = "/"
	}

	client, err := newWebDAVClientFromRemote(remoteName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Code:    500,
			Data:    nil,
			Message: err.Error(),
		})
		return
	}

	files, err := client.List(c.Request.Context(), path)
	if err != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Code:    500,
			Data:    nil,
			Message: "failed to list directory: " + err.Error(),
		})
		return
	}

	// Convert to response format
	result := make([]WebDAVFileInfo, len(files))
	for i, f := range files {
		result[i] = WebDAVFileInfo{
			Name:  f.Name,
			Path:  f.Path,
			Size:  f.Size,
			IsDir: f.IsDir,
		}
	}

	// Sort: directories first, then by name
	sort.Slice(result, func(i, j int) bool {
		if result[i].IsDir != result[j].IsDir {
			return result[i].IsDir
		}
		return result[i].Name < result[j].Name
	})

	c.JSON(http.StatusOK, Response{
		Code: 200,
		Data: gin.H{
			"remote": remoteName,
			"path":   path,
			"files":  result,
		},
		Message: "success",
	})
}

// POST /api/webdav/download - Queue download(s) from WebDAV
func (s *Server) handleWebDAVDownload(c *gin.Context) {
	var req WebDAVDownloadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, Response{
			Code:    400,
			Data:    nil,
			Message: "invalid request: " + err.Error(),
		})
		return
	}

	if len(req.Files) == 0 {
		c.JSON(http.StatusBadRequest, Response{
			Code:    400,
			Data:    nil,
			Message: "no files specified",
		})
		return
	}

	// Queue downloads for each file
	jobIDs := make([]string, 0, len(req.Files))
	for _, filePath := range req.Files {
		// Build the remote URL in the format the downloader expects
		url := req.Remote + ":" + filePath

		job, err := s.jobQueue.AddJob(url, "", false)
		if err != nil {
			c.JSON(http.StatusInternalServerError, Response{
				Code:    500,
				Data:    nil,
				Message: "failed to queue download: " + err.Error(),
			})
			return
		}
		jobIDs = append(jobIDs, job.ID)
	}

	c.JSON(http.StatusOK, Response{
		Code: 200,
		Data: gin.H{
			"jobIds": jobIDs,
			"count":  len(jobIDs),
		},
		Message: "downloads queued",
	})
}

// POST /api/webdav/upload - Upload local files to current WebDAV directory
func (s *Server) handleWebDAVUpload(c *gin.Context) {
	remoteName := strings.TrimSpace(c.PostForm("remote"))
	if remoteName == "" {
		c.JSON(http.StatusBadRequest, Response{
			Code:    400,
			Data:    nil,
			Message: "remote is required",
		})
		return
	}

	currentPath := normalizeWebDAVPath(c.DefaultPostForm("path", "/"))
	client, err := newWebDAVClientFromRemote(remoteName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Code:    500,
			Data:    nil,
			Message: err.Error(),
		})
		return
	}

	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(http.StatusBadRequest, Response{
			Code:    400,
			Data:    nil,
			Message: "invalid multipart form",
		})
		return
	}

	files := form.File["files"]
	if len(files) == 0 {
		c.JSON(http.StatusBadRequest, Response{
			Code:    400,
			Data:    nil,
			Message: "no files uploaded",
		})
		return
	}

	uploaded := make([]string, 0, len(files))
	for _, fileHeader := range files {
		filename, err := sanitizeWebDAVName(filepath.Base(fileHeader.Filename))
		if err != nil {
			c.JSON(http.StatusBadRequest, Response{
				Code:    400,
				Data:    nil,
				Message: fmt.Sprintf("invalid filename %q: %v", fileHeader.Filename, err),
			})
			return
		}

		src, err := fileHeader.Open()
		if err != nil {
			c.JSON(http.StatusInternalServerError, Response{
				Code:    500,
				Data:    nil,
				Message: fmt.Sprintf("failed to open uploaded file: %v", err),
			})
			return
		}

		targetPath := joinWebDAVPath(currentPath, filename)
		uploadErr := client.Upload(c.Request.Context(), targetPath, src)
		src.Close()
		if uploadErr != nil {
			c.JSON(http.StatusInternalServerError, Response{
				Code:    500,
				Data:    nil,
				Message: fmt.Sprintf("failed to upload %s: %v", filename, uploadErr),
			})
			return
		}

		uploaded = append(uploaded, targetPath)
	}

	c.JSON(http.StatusOK, Response{
		Code: 200,
		Data: gin.H{
			"uploaded": uploaded,
			"count":    len(uploaded),
		},
		Message: "upload completed",
	})
}

// DELETE /api/webdav/files - Delete file(s) or folder(s)
func (s *Server) handleWebDAVDelete(c *gin.Context) {
	var req WebDAVDeleteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, Response{
			Code:    400,
			Data:    nil,
			Message: "invalid request: " + err.Error(),
		})
		return
	}

	if len(req.Paths) == 0 {
		c.JSON(http.StatusBadRequest, Response{
			Code:    400,
			Data:    nil,
			Message: "no paths specified",
		})
		return
	}

	client, err := newWebDAVClientFromRemote(req.Remote)
	if err != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Code:    500,
			Data:    nil,
			Message: err.Error(),
		})
		return
	}

	for _, filePath := range req.Paths {
		if err := client.Remove(c.Request.Context(), normalizeWebDAVPath(filePath)); err != nil {
			c.JSON(http.StatusInternalServerError, Response{
				Code:    500,
				Data:    nil,
				Message: fmt.Sprintf("failed to delete %s: %v", filePath, err),
			})
			return
		}
	}

	c.JSON(http.StatusOK, Response{
		Code: 200,
		Data: gin.H{
			"deleted": req.Paths,
			"count":   len(req.Paths),
		},
		Message: "delete completed",
	})
}

// POST /api/webdav/mkdir - Create directory
func (s *Server) handleWebDAVMkdir(c *gin.Context) {
	var req WebDAVMkdirRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, Response{
			Code:    400,
			Data:    nil,
			Message: "invalid request: " + err.Error(),
		})
		return
	}

	dirName, err := sanitizeWebDAVName(req.Name)
	if err != nil {
		c.JSON(http.StatusBadRequest, Response{
			Code:    400,
			Data:    nil,
			Message: "invalid directory name: " + err.Error(),
		})
		return
	}

	client, err := newWebDAVClientFromRemote(req.Remote)
	if err != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Code:    500,
			Data:    nil,
			Message: err.Error(),
		})
		return
	}

	targetPath := joinWebDAVPath(normalizeWebDAVPath(req.Path), dirName)
	if err := client.Mkdir(c.Request.Context(), targetPath); err != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Code:    500,
			Data:    nil,
			Message: fmt.Sprintf("failed to create directory: %v", err),
		})
		return
	}

	c.JSON(http.StatusOK, Response{
		Code: 200,
		Data: gin.H{
			"path": targetPath,
			"name": dirName,
		},
		Message: "directory created",
	})
}

func newWebDAVClientFromRemote(remoteName string) (*webdav.Client, error) {
	cfg := config.LoadOrDefault()
	server := cfg.GetWebDAVServer(remoteName)
	if server == nil {
		return nil, fmt.Errorf("remote not found: %s", remoteName)
	}

	client, err := webdav.NewClientFromConfig(server)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to WebDAV server: %w", err)
	}
	return client, nil
}

func normalizeWebDAVPath(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" || raw == "/" {
		return "/"
	}

	cleaned := path.Clean("/" + strings.TrimPrefix(raw, "/"))
	if cleaned == "." {
		return "/"
	}
	return cleaned
}

func joinWebDAVPath(parentPath, name string) string {
	parentPath = normalizeWebDAVPath(parentPath)
	if parentPath == "/" {
		return "/" + name
	}
	return path.Join(parentPath, name)
}

func sanitizeWebDAVName(name string) (string, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return "", fmt.Errorf("name is required")
	}
	if name == "." || name == ".." {
		return "", fmt.Errorf("name is not allowed")
	}
	if strings.ContainsAny(name, `/\`) {
		return "", fmt.Errorf("path separators are not allowed")
	}
	return name, nil
}
