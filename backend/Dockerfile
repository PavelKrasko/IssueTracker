FROM golang:1.26-alpine AS builder
WORKDIR /src
RUN apk add --no-cache ca-certificates \
 && echo 'appuser:x:10001:10001::/nonexistent:/sbin/nologin' > /etc/passwd.app \
 && echo 'appgroup:x:10001:' > /etc/group.app \
 && mkdir -p /out/data/uploads /out/tmp \
 && chmod 1777 /out/tmp
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download
COPY . .
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux go build -trimpath -tags timetzdata \
      -ldflags="-s -w" -o /out/app ./cmd/api

FROM scratch
COPY --from=builder /etc/passwd.app /etc/passwd
COPY --from=builder /etc/group.app /etc/group
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder --chown=10001:10001 /out/data /data
COPY --from=builder /out/tmp /tmp
COPY --from=builder /out/app /app
ENV HTTP_ADDR=:8080 \
    STORAGE_DIR=/data/uploads
USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["/app"]