# Instrucciones para compilar la memoria BarGAIN (PDF)

## Opción A: Overleaf (recomendada, sin instalación)

1. Ir a https://www.overleaf.com → New Project → Upload Project
2. Comprimir la carpeta `memoriaTFG/Plantilla TfG/` en un ZIP y subirla
3. En Overleaf, seleccionar `proyect.tex` como archivo principal (Main document)
4. Pulsar "Recompile" (compilará automáticamente con pdflatex + bibtex)
5. Descargar el PDF resultante con "Download PDF"
6. Guardar como `memoriaTFG/bargain-memoria.pdf`

## Opción B: Compilación local con TeX Live / MiKTeX

### Prerrequisitos

```bash
# TeX Live (Linux/Mac)
sudo apt-get install texlive-full    # Ubuntu/Debian
brew install --cask mactex           # macOS

# MiKTeX (Windows)
# Descargar desde https://miktex.org/download e instalar
```

### Compilación

```bash
cd "memoriaTFG/Plantilla TfG"

# Compilación completa (4 pasos para referencias cruzadas y bibliografía)
pdflatex proyect.tex
bibtex proyect
pdflatex proyect.tex
pdflatex proyect.tex

# Copiar PDF al directorio raíz de memoriaTFG
cp proyect.pdf ../bargain-memoria.pdf
```

## Errores comunes y soluciones

| Error | Causa | Solución |
|-------|-------|---------|
| `File 'pclass.cls' not found` | pclass.cls no está en el directorio | Verificar que `pclass.cls` está en `Plantilla TfG/` |
| `Encoding file 'helvet.fd' not found` | Paquete Helvetica no instalado | `tlmgr install helvetic` (TeX Live) |
| `Undefined control sequence \hacerportada` | pclass.cls no cargado | Verificar `\documentclass{pclass}` en proyect.tex |
| Errores de bibliografía | pfcbib.bib no encontrado | Verificar que `pfcbib.bib` existe en el mismo directorio |
| Caracteres especiales con `?` | Problema de codificación | Usar UTF-8 al abrir los archivos `.tex` |

## Generar slides (Marp → PDF)

```bash
# Instalar Marp CLI (una vez)
npm install -g @marp-team/marp-cli

# Desde docs/defensa/
cd docs/defensa

# Generar PDF
npx @marp-team/marp-cli slides.md --pdf --output bargain-defensa.pdf

# Generar HTML (para presentar sin Acrobat)
npx @marp-team/marp-cli slides.md --html --output bargain-defensa.html
```
