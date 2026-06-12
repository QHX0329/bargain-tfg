---
description: Comprobar que el backend de Django funciona correctamente en el venv de Windows
---
# Verificación del proyecto en entorno virtual (Windows)

Este workflow ejecuta los comandos necesarios para comprobar que el entorno local en Windows (`.venv`) está configurado correctamente para el backend de **BarGAIN**.

// turbo
1. Validar la versión de Python en el entorno virtual activo:
```cmd
call .venv\Scripts\activate.bat && python --version
```

// turbo
2. Confirmar que se han instalado correctamente las dependencias de desarrollo y del sistema base:
```cmd
call .venv\Scripts\activate.bat && pip install -r backend/requirements/dev.txt
```

// turbo
3. Ejecutar los linters (Ruff) para garantizar que el código del backend respeta la convención (PEP 8):
```cmd
call .venv\Scripts\activate.bat && ruff check backend/
```

// turbo
4. Comprobar que todos los tests unitarios pasen y reporten cobertura correctamente utilizando `pytest`:
```cmd
call .venv\Scripts\activate.bat && pytest backend/tests/unit/ -v
```

// turbo
5. Verificar si las migraciones de Django se pueden aplicar sin errores, lo cual prueba que la conexión a PostgreSQL / PostGIS esté funcionando (Nota: la base de datos local / Docker de PostgreSQL debe estar corriendo):
```cmd
call .venv\Scripts\activate.bat && python backend/manage.py migrate --check
```
