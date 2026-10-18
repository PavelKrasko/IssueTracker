FROM golang:1.23-alpine AS build
WORKDIR /app
COPY go.mod go.sum* ./
RUN go mod download
COPY . .
RUN go mod tidy && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/app ./cmd/api

FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata \
 && addgroup -S myuser && adduser -S -G myuser myuser \
 && mkdir -p /data/uploads && chown myuser:myuser /data/uploads
WORKDIR /app
COPY --from=build --chown=myuser:myuser /out/app /app/app
ENV STORAGE_DIR=/data/uploads
USER myuser
EXPOSE 8080
ENTRYPOINT ["/app/app"]
