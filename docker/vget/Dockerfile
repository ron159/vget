# vget Docker Image

ARG BASE_IMAGE=model-base

# Build stage for UI
FROM node:22-slim AS ui-builder
WORKDIR /app/ui
COPY ui/package*.json ./
RUN npm ci
COPY ui/ ./
RUN npm run build

# Go builder stage
FROM golang:1.25-bookworm AS go-builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
COPY --from=ui-builder /app/ui/dist ./internal/server/dist

RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /vget-server ./cmd/vget-server

# Runtime base stage
FROM debian:bookworm-slim AS runtime-base

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    chromium \
    fonts-noto-cjk \
    fonts-noto-color-emoji \
    python3 \
    python3-pip \
    python3-venv \
    ffmpeg \
    nodejs \
    gosu \
    curl \
    bzip2 \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install --no-cache-dir --break-system-packages \
    yt-dlp \
    youtube-dl \
    funasr \
    modelscope \
    torchaudio

ENV ROD_BROWSER=/usr/bin/chromium \
    XDG_CACHE_HOME=/home/vget/.cache \
    VGET_CACHE_DIR=/home/vget/.cache/vget \
    JIEBA_CACHE_DIR=/home/vget/.cache/vget \
    MODELSCOPE_CACHE=/home/vget/.cache/modelscope \
    HF_HOME=/home/vget/.cache/huggingface \
    TORCH_HOME=/home/vget/.cache/torch

RUN (getent group 1000 >/dev/null || groupadd -g 1000 vget) && \
    (id -u 1000 >/dev/null 2>&1 || useradd -u 1000 -g 1000 -m -d /home/vget vget) && \
    mkdir -p /home/vget/downloads /home/vget/.config/vget /home/vget/.cache/vget /home/vget/.cache/modelscope /home/vget/.cache/huggingface /home/vget/.cache/torch && \
    chown -R 1000:1000 /home/vget

# Model cache stage
FROM runtime-base AS model-cache

# Pre-download FunASR SenseVoiceSmall, VAD and Punc models into the runtime cache path.
RUN gosu 1000:1000 python3 -c "from funasr import AutoModel; AutoModel(model='iic/SenseVoiceSmall', vad_model='fsmn-vad', vad_kwargs={'max_single_segment_time': 30000}, punc_model='ct-punc', disable_update=True)"

# Stable base image stage
FROM runtime-base AS model-base
COPY --from=model-cache --chown=1000:1000 /home/vget/.cache /home/vget/.cache
COPY docker/vget/entrypoint.sh /usr/local/bin/
COPY docker/vget/funasr_transcriber.py /usr/local/bin/
RUN chmod +x /usr/local/bin/entrypoint.sh

WORKDIR /home/vget
EXPOSE 8080
VOLUME ["/home/vget/downloads", "/home/vget/.config/vget"]

ENTRYPOINT ["entrypoint.sh"]
CMD []

# Runtime stage
FROM ${BASE_IMAGE}

COPY --from=go-builder /vget-server /usr/local/bin/vget-server
