# Pi-LLaMA Makefile

include .env
export

.PHONY: setup model client up down logs clean help test-install test test-health restart

help:
	@echo "Pi-LLaMA Commands:"
	@echo "  make setup        - First-time setup (download model + build client)"
	@echo "  make up           - Start all services"
	@echo "  make down         - Stop all services"
	@echo "  make restart      - Restart all services"
	@echo "  make logs         - View logs"
	@echo "  make clean        - Remove model and client build"
	@echo ""
	@echo "Testing:"
	@echo "  make test-install - Install test dependencies"
	@echo "  make test         - Run all integration tests"
	@echo "  make test-health  - Run health check tests only"

setup: model client
	@echo "Setup complete! Run 'make up' to start."

model:
	@mkdir -p models
	@if [ ! -f "models/$(MODEL_NAME)" ]; then \
		echo "Downloading $(MODEL_NAME)..."; \
		curl -L --progress-bar -o "models/$(MODEL_NAME)" "$(MODEL_URL)"; \
	else \
		echo "Model already exists: $(MODEL_NAME)"; \
	fi

client:
	@echo "Building React client..."
	@cd client && npm install && npm run build

up:
	docker compose up -d

down:
	docker compose down

restart:
	docker compose restart

logs:
	docker compose logs -f

clean:
	rm -rf models/*.gguf
	rm -rf client/.output

test-install:
	@if [ ! -d ".venv" ]; then \
		echo "Creating virtual environment..."; \
		python3 -m venv .venv; \
	fi
	.venv/bin/pip install -r tests/requirements.txt

test:
	.venv/bin/pytest tests/ -v --tb=short

test-health:
	.venv/bin/pytest tests/test_health.py -v
