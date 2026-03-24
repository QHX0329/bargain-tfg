.PHONY: help setup dev stop test test-backend test-backend-cov test-frontend lint lint-backend lint-backend-fix lint-frontend migrate makemigrations seed createsuperuser scrape scrape-mercadona docs build build-dev logs logs-backend logs-frontend deploy-staging clean frontend frontend-install frontend-web ip

help: ## Mostrar esta ayuda
	@python -c "import re, pathlib; mf=pathlib.Path('Makefile'); rows=[]; [rows.append((m.group(1), m.group(2))) for line in mf.read_text(encoding='utf-8').splitlines() if (m:=re.match(r'^([a-zA-Z_-]+):.*?## (.*)$$', line))]; [print(f'{k:20} {v}') for k, v in sorted(rows)]"

ip: ## Mostrar IP local y publica
	@powershell -NoProfile -Command "$$ips=Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $$_.IPAddress -notlike '169.254*' -and $$_.IPAddress -ne '127.0.0.1' -and $$_.AddressState -eq 'Preferred' }; $$local=($$ips | Where-Object { $$_.InterfaceAlias -eq 'Wi-Fi' -and $$_.IPAddress -like '192.168*' } | Select-Object -First 1 -ExpandProperty IPAddress); if (-not $$local) { $$local=($$ips | Where-Object { $$_.IPAddress -like '192.168*' } | Select-Object -First 1 -ExpandProperty IPAddress) }; if (-not $$local) { $$local=($$ips | Select-Object -First 1 -ExpandProperty IPAddress) }; Write-Host ('IP local:   ' + $$local); try { $$public=(Invoke-RestMethod -Uri 'https://api.ipify.org?format=text' -TimeoutSec 5); Write-Host ('IP publica: ' + $$public) } catch { Write-Host 'IP publica: no disponible' }"

# ── Entorno ──────────────────────────────────────────

setup: ## Instalar dependencias y configurar entorno completo
	@echo "📦 Instalando dependencias frontend..."
	cd frontend && npm install
	@echo "🐳 Levantando servicios Docker..."
	docker compose -f docker-compose.dev.yml up -d postgres redis backend
	@echo "🗄️ Aplicando migraciones..."
	docker compose -f docker-compose.dev.yml exec backend python manage.py migrate
	@echo "✅ Entorno listo. Ejecuta 'make dev' para iniciar."

dev: ## Levantar backend (Docker)
	docker compose -f docker-compose.dev.yml up -d
	@echo "🚀 Backend listo: http://localhost:8000"
	@echo "💡 Ejecuta 'make frontend' en otra terminal para el frontend."

frontend: ## Levantar frontend nativo (Expo)
	cd frontend && npx expo start

frontend-install: ## Instalar dependencias frontend nativas
	cd frontend && npm install

frontend-web: ## Levantar entorno web en frontend/web (Vite)
	cd frontend/web && npm run dev

stop: ## Detener todos los servicios
	docker compose -f docker-compose.dev.yml down

# ── Testing ──────────────────────────────────────────

test: test-backend test-frontend ## Ejecutar todos los tests

test-backend: ## Ejecutar tests backend en Docker (recomendado en Windows)
	docker compose -f docker-compose.dev.yml up -d postgres redis backend
	docker compose -f docker-compose.dev.yml exec backend pytest -v --tb=short

test-backend-cov: ## Tests backend con cobertura en Docker
	docker compose -f docker-compose.dev.yml up -d postgres redis backend
	docker compose -f docker-compose.dev.yml exec backend pytest --cov=apps --cov-report=html --cov-report=term -v

test-frontend: ## Ejecutar tests del frontend
	cd frontend && npx jest --coverage

# ── Calidad de código ────────────────────────────────

lint: lint-backend lint-frontend ## Lint completo

lint-backend: ## Lint del backend en Docker (Ruff)
	docker compose -f docker-compose.dev.yml up -d postgres redis backend
	docker compose -f docker-compose.dev.yml exec backend sh -lc "ruff check . && ruff format --check ."

lint-backend-fix: ## Autofix lint backend en Docker
	docker compose -f docker-compose.dev.yml up -d postgres redis backend
	docker compose -f docker-compose.dev.yml exec backend sh -lc "ruff check --fix . && ruff format ."

lint-frontend: ## Lint del frontend (ESLint + Prettier)
	cd frontend && npx eslint src/ --ext .ts,.tsx && npx prettier --check "src/**/*.{ts,tsx}"

# ── Base de datos ────────────────────────────────────

migrate: ## Aplicar migraciones de Django en Docker
	docker compose -f docker-compose.dev.yml up -d postgres redis backend
	docker compose -f docker-compose.dev.yml exec backend python manage.py migrate

makemigrations: ## Crear nuevas migraciones en Docker
	docker compose -f docker-compose.dev.yml up -d postgres redis backend
	docker compose -f docker-compose.dev.yml exec backend python manage.py makemigrations

seed: ## Poblar BD con datos de prueba en Docker
	docker compose -f docker-compose.dev.yml up -d postgres redis backend
	docker compose -f docker-compose.dev.yml exec backend python manage.py seed_data

createsuperuser: ## Crear superusuario de Django en Docker
	docker compose -f docker-compose.dev.yml up -d postgres redis backend
	docker compose -f docker-compose.dev.yml exec backend python manage.py createsuperuser

# ── Scraping ─────────────────────────────────────────

scrape: ## Ejecutar todos los spiders de scraping
	cd scraping && scrapy crawl mercadona && scrapy crawl carrefour

scrape-mercadona: ## Ejecutar spider de Mercadona
	cd scraping && scrapy crawl mercadona

# ── Documentación ────────────────────────────────────

docs: ## Generar documentación de la API en Docker
	docker compose -f docker-compose.dev.yml up -d postgres redis backend
	docker compose -f docker-compose.dev.yml exec backend python manage.py spectacular --file ../docs/api/openapi.yml

# ── Build & Deploy ───────────────────────────────────

build: ## Build de producción
	docker compose build

build-dev: ## Build de desarrollo
	docker compose -f docker-compose.dev.yml build

logs: ## Ver logs de todos los servicios (desarrollo)
	docker compose -f docker-compose.dev.yml logs -f

logs-backend: ## Ver logs del backend (desarrollo)
	docker compose -f docker-compose.dev.yml logs -f backend

logs-frontend: ## Ver logs del frontend (desarrollo)
	docker compose -f docker-compose.dev.yml logs -f frontend

deploy-staging: ## Deploy a staging (Render)
	@echo "🚀 Desplegando a staging..."
	docker compose build
	@echo "⚠️  Configura las variables de entorno en Render y empuja la imagen."

clean: ## Limpiar archivos temporales y caché
	@python -c "from pathlib import Path; import shutil; root=Path('.'); [shutil.rmtree(p, ignore_errors=True) for p in root.rglob('__pycache__') if p.is_dir()]; [shutil.rmtree(p, ignore_errors=True) for p in root.rglob('.pytest_cache') if p.is_dir()]; [p.unlink(missing_ok=True) for p in root.rglob('*.pyc') if p.is_file()]; shutil.rmtree(root / 'frontend' / 'node_modules' / '.cache', ignore_errors=True)"
