package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"issuetracker/internal/config"
	"issuetracker/internal/database"
	"issuetracker/internal/database/db"
	"issuetracker/internal/httpapi"
	"issuetracker/internal/storage"
)

func main() {
	log := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	if err := run(log); err != nil {
		log.Error("fatal", "error", err)
		os.Exit(1)
	}
}

func run(log *slog.Logger) error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	pool, err := database.Connect(ctx, cfg.DatabaseURL, log)
	if err != nil {
		return err
	}
	defer pool.Close()

	if cfg.MigrateOnStart {
		if err := database.Migrate(ctx, pool, log); err != nil {
			return err
		}
	}

	var store storage.Storage
	if cfg.StorageDriver == "s3" {
		store, err = storage.NewS3(ctx, storage.S3Config{
			Endpoint: cfg.S3Endpoint, AccessKey: cfg.S3AccessKey, SecretKey: cfg.S3SecretKey,
			Bucket: cfg.S3Bucket, Region: cfg.S3Region, UseSSL: cfg.S3UseSSL,
		}, log)
	} else {
		store, err = storage.NewLocal(cfg.StorageDir)
	}
	if err != nil {
		return err
	}
	log.Info("хранилище файлов", "driver", cfg.StorageDriver)
	if cfg.TelegramToken == "" {
		log.Info("Telegram-уведомления выключены (TELEGRAM_BOT_TOKEN не задан)")
	}

	api := httpapi.NewServer(cfg, pool, store, log)
	go api.RunTelegram(ctx)

	srv := &http.Server{
		Addr:              cfg.HTTPAddr,
		Handler:           api.Routes(),
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       2 * time.Minute,
		WriteTimeout:      2 * time.Minute,
		IdleTimeout:       2 * time.Minute,
	}

	go func() {
		t := time.NewTicker(time.Hour)
		defer t.Stop()
		q := db.New(pool)
		for {
			select {
			case <-ctx.Done():
				return
			case <-t.C:
				if err := q.DeleteExpiredSessions(ctx); err != nil {
					log.Warn("cleanup sessions", "error", err)
				}
				if err := q.DeleteOldNotifications(ctx); err != nil {
					log.Warn("cleanup notifications", "error", err)
				}
			}
		}
	}()

	errCh := make(chan error, 1)
	go func() {
		log.Info("API запущен", "addr", cfg.HTTPAddr, "google", cfg.Google.Enabled(), "github", cfg.GitHub.Enabled())
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
		}
	}()

	select {
	case err := <-errCh:
		return err
	case <-ctx.Done():
	}
	log.Info("остановка…")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	return srv.Shutdown(shutdownCtx)
}
