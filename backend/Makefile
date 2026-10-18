.PHONY: run build tidy sqlc infra infra-down psql test

ifneq (,$(wildcard .env))
include .env
export
endif

run:
	go run ./cmd/api

build:
	CGO_ENABLED=0 go build -o bin/api ./cmd/api

tidy:
	go mod tidy

sqlc:
	sqlc generate

infra:
	docker compose -f ../docker-compose.yml up -d postgres

infra-down:
	docker compose -f ../docker-compose.yml stop postgres

psql:
	docker compose -f ../docker-compose.yml exec postgres psql -U issuetracker

test:
	go vet ./... && go test ./...
