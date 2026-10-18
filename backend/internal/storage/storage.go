package storage

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

type Object struct {
	Body        io.ReadCloser
	Size        int64
	ContentType string
}

type Storage interface {
	Put(ctx context.Context, key string, r io.Reader, size int64, contentType string) error
	Get(ctx context.Context, key string) (*Object, error)
	Delete(ctx context.Context, key string) error
}

var ErrNotFound = errors.New("object not found")

type S3 struct {
	client *minio.Client
	bucket string
}

type S3Config struct {
	Endpoint, AccessKey, SecretKey, Bucket, Region string
	UseSSL                                         bool
}

func NewS3(ctx context.Context, cfg S3Config, log *slog.Logger) (*S3, error) {
	client, err := minio.New(cfg.Endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.AccessKey, cfg.SecretKey, ""),
		Secure: cfg.UseSSL,
		Region: cfg.Region,
	})
	if err != nil {
		return nil, err
	}
	for attempt := 1; ; attempt++ {
		exists, err := client.BucketExists(ctx, cfg.Bucket)
		if err == nil {
			if !exists {
				if err := client.MakeBucket(ctx, cfg.Bucket, minio.MakeBucketOptions{Region: cfg.Region}); err != nil {
					return nil, fmt.Errorf("создание бакета: %w", err)
				}
				log.Info("создан бакет", "bucket", cfg.Bucket)
			}
			return &S3{client: client, bucket: cfg.Bucket}, nil
		}
		if attempt >= 15 {
			return nil, fmt.Errorf("хранилище недоступно: %w", err)
		}
		log.Info("ждём S3/MinIO…", "attempt", attempt, "error", err)
		time.Sleep(2 * time.Second)
	}
}

func (s *S3) Put(ctx context.Context, key string, r io.Reader, size int64, contentType string) error {
	_, err := s.client.PutObject(ctx, s.bucket, key, r, size, minio.PutObjectOptions{ContentType: contentType})
	return err
}

func (s *S3) Get(ctx context.Context, key string) (*Object, error) {
	obj, err := s.client.GetObject(ctx, s.bucket, key, minio.GetObjectOptions{})
	if err != nil {
		return nil, err
	}
	info, err := obj.Stat()
	if err != nil {
		obj.Close()
		if minio.ToErrorResponse(err).Code == "NoSuchKey" {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &Object{Body: obj, Size: info.Size, ContentType: info.ContentType}, nil
}

func (s *S3) Delete(ctx context.Context, key string) error {
	return s.client.RemoveObject(ctx, s.bucket, key, minio.RemoveObjectOptions{})
}
