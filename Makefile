.PHONY: dev stop build logs db-migrate db-seed db-studio test clean \
        backend-shell postgres-shell redis-cli lint format help

# ==================== COLORS ====================
GREEN  := $(shell tput -Txterm setaf 2)
YELLOW := $(shell tput -Txterm setaf 3)
CYAN   := $(shell tput -Txterm setaf 6)
RESET  := $(shell tput -Txterm sgr0)

# ==================== DEFAULT TARGET ====================
.DEFAULT_GOAL := help

# ==================== DEVELOPMENT ====================

dev: ## Start all services in development mode
	@echo "$(GREEN)Starting VOXO development environment...$(RESET)"
	docker compose up -d
	@echo "$(GREEN)Services started! Access:$(RESET)"
	@echo "  $(CYAN)API:$(RESET)        http://localhost:3000"
	@echo "  $(CYAN)Admin:$(RESET)      http://localhost:3001"
	@echo "  $(CYAN)Swagger:$(RESET)    http://localhost:3000/api/docs"
	@echo "  $(CYAN)MinIO:$(RESET)      http://localhost:9001"
	@echo "  $(CYAN)PostgreSQL:$(RESET) localhost:5432"
	@echo "  $(CYAN)Redis:$(RESET)      localhost:6379"

dev-attach: ## Start services and attach to logs
	@echo "$(GREEN)Starting VOXO with attached logs...$(RESET)"
	docker compose up

stop: ## Stop all services
	@echo "$(YELLOW)Stopping all VOXO services...$(RESET)"
	docker compose down

restart: ## Restart all services
	@echo "$(YELLOW)Restarting all services...$(RESET)"
	docker compose restart

# ==================== BUILD ====================

build: ## Build all Docker images
	@echo "$(GREEN)Building all Docker images...$(RESET)"
	docker compose build --no-cache

build-backend: ## Build only the backend image
	@echo "$(GREEN)Building backend image...$(RESET)"
	docker compose build --no-cache voxo-backend

build-admin: ## Build only the admin image
	@echo "$(GREEN)Building admin image...$(RESET)"
	docker compose build --no-cache voxo-admin

build-prod: ## Build production Docker images
	@echo "$(GREEN)Building production images...$(RESET)"
	docker compose -f docker-compose.prod.yml build --no-cache

# ==================== LOGS ====================

logs: ## Tail logs from all services
	docker compose logs -f --tail=100

logs-backend: ## Tail backend logs
	docker compose logs -f --tail=100 voxo-backend

logs-admin: ## Tail admin logs
	docker compose logs -f --tail=100 voxo-admin

logs-nginx: ## Tail nginx logs
	docker compose logs -f --tail=100 nginx

logs-postgres: ## Tail postgres logs
	docker compose logs -f --tail=100 postgres

# ==================== DATABASE ====================

db-migrate: ## Run Prisma migrations
	@echo "$(GREEN)Running database migrations...$(RESET)"
	docker compose exec voxo-backend npx prisma migrate dev

db-migrate-prod: ## Deploy Prisma migrations (production)
	@echo "$(YELLOW)Deploying database migrations to production...$(RESET)"
	docker compose exec voxo-backend npx prisma migrate deploy

db-seed: ## Run database seed
	@echo "$(GREEN)Seeding database...$(RESET)"
	docker compose exec voxo-backend npx ts-node src/database/seeds/seed.ts

db-studio: ## Open Prisma Studio
	@echo "$(GREEN)Opening Prisma Studio...$(RESET)"
	cd backend && npx prisma studio

db-reset: ## Reset database (WARNING: destroys all data)
	@echo "$(YELLOW)WARNING: This will destroy all data!$(RESET)"
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ]
	docker compose exec voxo-backend npx prisma migrate reset --force

db-backup: ## Backup the database
	@echo "$(GREEN)Backing up database...$(RESET)"
	@mkdir -p backups
	docker compose exec postgres pg_dump -U voxo voxo > backups/voxo_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "$(GREEN)Backup saved to backups/$(RESET)"

db-restore: ## Restore database from backup (usage: make db-restore FILE=backups/voxo_xxx.sql)
	@echo "$(YELLOW)Restoring database from $(FILE)...$(RESET)"
	docker compose exec -T postgres psql -U voxo voxo < $(FILE)

# ==================== TESTING ====================

test: ## Run all tests
	@echo "$(GREEN)Running all tests...$(RESET)"
	cd backend && npm run test

test-watch: ## Run tests in watch mode
	cd backend && npm run test:watch

test-cov: ## Run tests with coverage
	cd backend && npm run test:cov

test-e2e: ## Run end-to-end tests
	cd backend && npm run test:e2e

# ==================== CODE QUALITY ====================

lint: ## Run linters for all services
	@echo "$(GREEN)Running linters...$(RESET)"
	cd backend && npm run lint
	cd admin && npm run lint

format: ## Format all code
	@echo "$(GREEN)Formatting code...$(RESET)"
	cd backend && npm run format
	cd admin && npx prettier --write "**/*.{ts,tsx,js,json}"

# ==================== SHELL ACCESS ====================

backend-shell: ## Open shell in backend container
	docker compose exec voxo-backend sh

admin-shell: ## Open shell in admin container
	docker compose exec voxo-admin sh

postgres-shell: ## Open PostgreSQL shell
	docker compose exec postgres psql -U voxo -d voxo

redis-cli: ## Open Redis CLI
	docker compose exec redis redis-cli -a redis_password

nginx-shell: ## Open shell in nginx container
	docker compose exec nginx sh

# ==================== MINIO ====================

minio-setup: ## Setup MinIO bucket and policies
	@echo "$(GREEN)Setting up MinIO...$(RESET)"
	docker compose exec minio mc alias set local http://localhost:9000 minioadmin minioadmin_secret
	docker compose exec minio mc mb --ignore-existing local/voxo
	docker compose exec minio mc policy set public local/voxo/public

# ==================== CLEANUP ====================

clean: ## Remove all containers and volumes (WARNING: destroys all data)
	@echo "$(YELLOW)WARNING: This will destroy all containers and volumes!$(RESET)"
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ]
	docker compose down -v --remove-orphans
	docker system prune -f

clean-images: ## Remove Docker images
	docker compose down --rmi all

clean-logs: ## Clean Docker logs
	find /var/lib/docker/containers -name "*-json.log" -exec truncate -s 0 {} \;

# ==================== PRODUCTION ====================

prod-up: ## Start production services
	@echo "$(GREEN)Starting production environment...$(RESET)"
	docker compose -f docker-compose.prod.yml up -d

prod-down: ## Stop production services
	docker compose -f docker-compose.prod.yml down

prod-logs: ## Tail production logs
	docker compose -f docker-compose.prod.yml logs -f --tail=100

prod-ps: ## Show production service status
	docker compose -f docker-compose.prod.yml ps

# ==================== INSTALL ====================

install: ## Install all dependencies
	@echo "$(GREEN)Installing dependencies...$(RESET)"
	cd backend && npm ci
	cd admin && npm ci

install-mobile: ## Install Flutter dependencies
	cd mobile && flutter pub get

setup: install ## Full project setup (install + build + migrate + seed)
	@echo "$(GREEN)Full setup...$(RESET)"
	make dev
	@echo "Waiting for services to be ready..."
	@sleep 20
	make db-migrate
	make db-seed
	make minio-setup
	@echo "$(GREEN)Setup complete!$(RESET)"

# ==================== HELP ====================

help: ## Show this help
	@echo "$(CYAN)VOXO Development Makefile$(RESET)"
	@echo ""
	@echo "$(YELLOW)Usage:$(RESET) make [target]"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(RESET) %s\n", $$1, $$2}'
