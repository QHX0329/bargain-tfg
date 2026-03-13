.PHONY: help setup dev stop test test-backend test-backend-cov test-backend-host test-backend-cov-host test-backend-docker test-backend-cov-docker test-frontend lint lint-backend lint-backend-fix lint-frontend migrate makemigrations seed createsuperuser scrape scrape-mercadona docs build build-dev logs logs-backend logs-frontend deploy-staging clean frontend frontend-install

help: ## Mostrar esta ayuda
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ── Entorno ──────────────────────────────────────────

setup: ## Instalar dependencias y configurar entorno completo
	@echo "📦 Instalando dependencias backend..."
	cd backend && pip install -r requirements/dev.txt
	@echo "📦 Instalando dependencias frontend..."
	cd frontend && npm install
	@echo "🐳 Levantando servicios Docker..."
	docker-compose -f docker-compose.dev.yml up -d postgres redis
	@echo "🗄️ Aplicando migraciones..."
	cd backend && python manage.py migrate
	@echo "✅ Entorno listo. Ejecuta 'make dev' para iniciar."

dev: ## Levantar backend (Docker)
	docker-compose -f docker-compose.dev.yml up -d
	@echo "🚀 Backend listo: http://localhost:8000"
	@echo "💡 Ejecuta 'make frontend' en otra terminal para el frontend."

frontend: ## Levantar frontend nativo (Expo)
	cd frontend && npx expo start --web

frontend-install: ## Instalar dependencias frontend nativas
	cd frontend && npm install

stop: ## Detener todos los servicios
	docker-compose -f docker-compose.dev.yml down

# ── Testing ──────────────────────────────────────────

test: test-backend test-frontend ## Ejecutar todos los tests

test-backend: ## Ejecutar tests backend en Docker (recomendado en Windows)
	docker-compose -f docker-compose.dev.yml up -d postgres redis backend
	docker-compose -f docker-compose.dev.yml exec backend pytest -v --tb=short

test-backend-cov: ## Tests backend con cobertura en Docker
	docker-compose -f docker-compose.dev.yml up -d postgres redis backend
	docker-compose -f docker-compose.dev.yml exec backend pytest --cov=apps --cov-report=html --cov-report=term -v

test-backend-host: ## Ejecutar tests backend en host (requiere GIS local bien configurado)
	cd backend && pytest -v --tb=short

test-backend-cov-host: ## Tests backend con cobertura en host
	cd backend && pytest --cov=apps --cov-report=html --cov-report=term -v

test-backend-docker: ## Ejecutar tests backend dentro del contenedor backend
	docker-compose -f docker-compose.dev.yml exec backend pytest -v --tb=short

test-backend-cov-docker: ## Tests backend con cobertura dentro del contenedor backend
	docker-compose -f docker-compose.dev.yml exec backend pytest --cov=apps --cov-report=html --cov-report=term -v

test-frontend: ## Ejecutar tests del frontend
	cd frontend && npx jest --coverage

# ── Calidad de código ────────────────────────────────

lint: lint-backend lint-frontend ## Lint completo

lint-backend: ## Lint del backend (Ruff)
	cd backend && ruff check . && ruff format --check .

lint-backend-fix: ## Autofix lint backend
	cd backend && ruff check --fix . && ruff format .

lint-frontend: ## Lint del frontend (ESLint + Prettier)
	cd frontend && npx eslint src/ --ext .ts,.tsx && npx prettier --check "src/**/*.{ts,tsx}"

# ── Base de datos ────────────────────────────────────

migrate: ## Aplicar migraciones de Django
	cd backend && python manage.py migrate

makemigrations: ## Crear nuevas migraciones
	cd backend && python manage.py makemigrations

seed: ## Poblar BD con datos de prueba
	cd backend && python manage.py seed_data

createsuperuser: ## Crear superusuario de Django
	cd backend && python manage.py createsuperuser

# ── Scraping ─────────────────────────────────────────

scrape: ## Ejecutar todos los spiders de scraping
	cd scraping && scrapy crawl mercadona && scrapy crawl carrefour

scrape-mercadona: ## Ejecutar spider de Mercadona
	cd scraping && scrapy crawl mercadona

# ── Documentación ────────────────────────────────────

docs: ## Generar documentación de la API
	cd backend && python manage.py spectacular --file ../docs/api/openapi.yml

# ── Build & Deploy ───────────────────────────────────

build: ## Build de producción
	docker-compose build

build-dev: ## Build de desarrollo
	docker-compose -f docker-compose.dev.yml build

logs: ## Ver logs de todos los servicios (desarrollo)
	docker-compose -f docker-compose.dev.yml logs -f

logs-backend: ## Ver logs del backend (desarrollo)
	docker-compose -f docker-compose.dev.yml logs -f backend

logs-frontend: ## Ver logs del frontend (desarrollo)
	docker-compose -f docker-compose.dev.yml logs -f frontend

deploy-staging: ## Deploy a staging (Render)
	@echo "🚀 Desplegando a staging..."
	docker-compose build
	@echo "⚠️  Configura las variables de entorno en Render y empuja la imagen."

clean: ## Limpiar archivos temporales y caché
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
	find . -name "*.pyc" -delete 2>/dev/null || true
	cd frontend && rm -rf node_modules/.cache 2>/dev/null || true
