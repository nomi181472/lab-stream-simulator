PYTHON ?= backend/.venv/Scripts/python.exe
WSL ?= wsl

.PHONY: help install dev-backend dev-frontend test-backend test-python test-node test-golang test-dart test-dotnet test-kotlin test-all docker-up docker-down

help:
	@echo "=========================================================================="
	@echo "StreamLab - Multi-Protocol IP Camera Simulator & Interoperability Lab"
	@echo "=========================================================================="
	@echo "Available Targets:"
	@echo "  make dev-backend   - Start FastAPI server, MediaMTX engine, & WS-Discovery"
	@echo "  make dev-frontend  - Start Next.js App Router UI on http://localhost:3000"
	@echo "  make test-backend  - Run backend unit and live media pipeline tests"
	@echo "  make test-python   - Run Python client test suite"
	@echo "  make test-node     - Run Node.js client test suite"
	@echo "  make test-golang   - Run Go client test suite"
	@echo "  make test-dart     - Run Dart client test suite"
	@echo "  make test-dotnet   - Run C# / .NET client test suite"
	@echo "  make test-kotlin   - Run Kotlin JVM client test suite"
	@echo "  make test-all      - Execute all 6 client test suites sequentially"
	@echo "  make docker-up     - Launch containerized StreamLab via docker compose"
	@echo "  make docker-down   - Stop and cleanup Docker containers"
	@echo "=========================================================================="

dev-backend:
	$(PYTHON) -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000

dev-frontend:
	$(WSL) bash -c "cd /mnt/c/projects/lab-stream-simulator/frontend && npm run dev"

test-backend:
	$(PYTHON) -m pytest backend/tests -v

test-python:
	$(PYTHON) clients/python/runner.py

test-node:
	$(WSL) bash -c "cd /mnt/c/projects/lab-stream-simulator/clients/node && node dist/runner.js"

test-golang:
	$(WSL) bash -c "cd /mnt/c/projects/lab-stream-simulator/clients/golang && go run main.go"

test-dart:
	$(WSL) bash -c "cd /mnt/c/projects/lab-stream-simulator/clients/dart && dart bin/runner.dart"

test-dotnet:
	$(WSL) bash -c "cd /mnt/c/projects/lab-stream-simulator/clients/dotnet && dotnet run"

test-kotlin:
	$(WSL) bash -c "cd /mnt/c/projects/lab-stream-simulator/clients/kotlin && java -cp Runner.jar streamlab.client.KotlinClientRunner"

test-all: test-python test-node test-golang test-dart test-dotnet test-kotlin
	@echo "\n=========================================================================="
	@echo "All 6 client suites finished. View reports in integration-tests/reports/"
	@echo "=========================================================================="

docker-up:
	docker compose up --build -d

docker-down:
	docker compose down -v
