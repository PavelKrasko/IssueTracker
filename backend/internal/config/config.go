package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

type OAuthClient struct {
	ClientID     string
	ClientSecret string
}

func (c OAuthClient) Enabled() bool { return c.ClientID != "" && c.ClientSecret != "" }

type Config struct {
	HTTPAddr       string
	DatabaseURL    string
	MigrateOnStart bool

	JWTSecret    string
	AccessTTL    time.Duration
	RefreshTTL   time.Duration
	CookieSecure bool

	AppURL string

	APIPublicURL   string
	AllowedOrigins []string

	StorageDriver string
	StorageDir    string

	S3Endpoint  string
	S3AccessKey string
	S3SecretKey string
	S3Bucket    string
	S3Region    string
	S3UseSSL    bool

	Google OAuthClient
	GitHub OAuthClient

	TelegramToken       string
	TelegramBotUsername string
	TelegramAPIURL      string
}

func Load() (*Config, error) {
	c := &Config{
		HTTPAddr:       env("HTTP_ADDR", ":8080"),
		DatabaseURL:    env("DATABASE_URL", "postgres://issuetracker:issuetracker@localhost:5432/issuetracker?sslmode=disable"),
		MigrateOnStart: envBool("MIGRATE_ON_START", true),
		JWTSecret:      os.Getenv("JWT_SECRET"),
		AccessTTL:      envDuration("ACCESS_TOKEN_TTL", 15*time.Minute),
		RefreshTTL:     envDuration("REFRESH_TOKEN_TTL", 30*24*time.Hour),
		CookieSecure:   envBool("COOKIE_SECURE", false),
		AppURL:         strings.TrimRight(env("APP_URL", "http://localhost:5173"), "/"),
		APIPublicURL:   strings.TrimRight(env("API_PUBLIC_URL", "http://localhost:5173/api"), "/"),
		StorageDriver:  env("STORAGE_DRIVER", "local"),
		StorageDir:     env("STORAGE_DIR", "./uploads"),
		S3Endpoint:     env("S3_ENDPOINT", "localhost:9000"),
		S3AccessKey:    env("S3_ACCESS_KEY", "minioadmin"),
		S3SecretKey:    env("S3_SECRET_KEY", "minioadmin"),
		S3Bucket:       env("S3_BUCKET", "issuetracker"),
		S3Region:       env("S3_REGION", "us-east-1"),
		S3UseSSL:       envBool("S3_USE_SSL", false),
		Google:         OAuthClient{os.Getenv("GOOGLE_CLIENT_ID"), os.Getenv("GOOGLE_CLIENT_SECRET")},
		GitHub:         OAuthClient{os.Getenv("GITHUB_CLIENT_ID"), os.Getenv("GITHUB_CLIENT_SECRET")},

		TelegramToken:       strings.TrimSpace(os.Getenv("TELEGRAM_BOT_TOKEN")),
		TelegramBotUsername: strings.TrimSpace(os.Getenv("TELEGRAM_BOT_USERNAME")),
		TelegramAPIURL:      env("TELEGRAM_API_URL", "https://api.telegram.org"),
	}
	for _, o := range strings.Split(env("ALLOWED_ORIGINS", c.AppURL), ",") {
		if o = strings.TrimSpace(strings.TrimRight(o, "/")); o != "" {
			c.AllowedOrigins = append(c.AllowedOrigins, o)
		}
	}
	if c.StorageDriver != "local" && c.StorageDriver != "s3" {
		return nil, fmt.Errorf("STORAGE_DRIVER: local или s3, получено %q", c.StorageDriver)
	}
	if len(c.JWTSecret) < 32 {
		return nil, fmt.Errorf("JWT_SECRET должен быть не короче 32 символов (сгенерируйте: openssl rand -hex 32)")
	}
	return c, nil
}

func env(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func envBool(key string, def bool) bool {
	if v, err := strconv.ParseBool(os.Getenv(key)); err == nil {
		return v
	}
	return def
}

func envDuration(key string, def time.Duration) time.Duration {
	if v, err := time.ParseDuration(os.Getenv(key)); err == nil {
		return v
	}
	return def
}
