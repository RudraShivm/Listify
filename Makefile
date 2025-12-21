

# =====================
# Listify Project Makefile
# =====================

.PHONY: help dev frontend-dev backend-dev build up down logs clean prune backend-build backend-clean frontend-build frontend-clean test lint

## Run both frontend and backend locally with hot reload (in parallel)
dev:
	@echo "Starting both frontend and backend in development mode..."
	@echo "Frontend: http://localhost:5173"
	@echo "Backend: http://localhost:4000"
	@echo "Run 'make frontend-dev' and 'make backend-dev' in separate terminals for better control"
	@make frontend-dev &
	@make backend-dev &
	@wait

## Show help
help:
	@echo "Available commands:"
	@echo ""
	@echo "Development (Local Hot Reload):"
	@echo "  make dev             Run both frontend and backend locally with hot reload"
	@echo "  make frontend-dev    Run frontend locally with hot reload (Vite)"
	@echo "  make backend-dev     Run backend locally with hot reload (nodemon)"
	@echo ""
	@echo "Docker Development:"
	@echo "  make build           Build all Docker services (frontend & backend)"
	@echo "  make up              Run all Docker services (frontend & backend)"
	@echo "  make down            Stop all Docker services"
	@echo "  make logs            View logs for all Docker services"
	@echo ""
	@echo "Build & Clean:"
	@echo "  make backend-build   Build backend TypeScript (output to dist/)"
	@echo "  make backend-clean   Remove backend dist/ and node_modules"
	@echo "  make frontend-build  Build frontend (Vite)"
	@echo "  make frontend-clean  Remove frontend dist/ and node_modules"
	@echo "  make clean           Remove dist, node_modules, and Docker artifacts (frontend & backend)"
	@echo "  make prune           Remove all stopped containers, unused networks, images, and cache"
	@echo ""
	@echo "Testing & Quality:"
	@echo "  make test            Run frontend tests (Vitest)"
	@echo "  make lint            Run frontend linter (ESLint)"

# Build all services (frontend and backend)
build:
	docker-compose build

# Run all services (frontend and backend)
up:
	docker-compose up

# Stop all services
down:
	docker-compose down

# View logs for all services
logs:
	docker-compose logs -f

# Remove dist, node_modules, and Docker artifacts (frontend & backend)
clean:
	rm -rf dist node_modules
	rm -rf backend/dist backend/node_modules
	docker-compose down -v --remove-orphans
	docker system prune -f

# Remove all stopped containers, unused networks, images, and cache
prune:
	docker system prune -af --volumes

# Run frontend locally (hot reload with Vite)
frontend-dev:
	npm install && npm run dev

# Run backend locally (from backend/)
backend-dev:
	cd backend && npm install && npm run dev

# Build backend TypeScript (output to dist/)
backend-build:
	cd backend && npm install && npm run build

# Remove backend dist/ and node_modules
backend-clean:
	rm -rf backend/dist backend/node_modules

# Build frontend (Vite)
frontend-build:
	npm install && npm run build

# Remove frontend dist/ and node_modules
frontend-clean:
	rm -rf dist node_modules

# Run frontend tests (Vitest)
test:
	npm run test

# Run frontend linter (ESLint)
lint:
	npm run lint
