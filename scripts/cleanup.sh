#!/bin/bash
# ============================================
# Script de limpieza del repositorio
# Elimina archivos temporales, legacy y basura
# ============================================
# Uso: bash scripts/cleanup.sh
# ============================================

set -e

echo "🧹 Limpieza del repositorio centro-diagnostico-v11"
echo "=================================================="
echo ""

# ── 1. Archivos temporales ───────────────────
echo "📁 Eliminando archivos temporales..."
files_temp=(
    "error.txt"
    "para cuando llegue la luz-1.txt"
    "test-barcode.png"
)
for f in "${files_temp[@]}"; do
    if [ -e "$f" ]; then
        git rm -f "$f" 2>/dev/null && echo "  ✅ $f" || echo "  ⚠️  $f (no rastreado, eliminando)" && rm -f "$f"
    else
        echo "  ⏭️  $f (no existe)"
    fi
done

# ── 2. Archivos ZIP ─────────────────────────
echo ""
echo "📦 Eliminando archivos ZIP..."
files_zip=(
    "stitch_medical_diagnostic_dashboard.zip"
    "stitch_medical_diagnostic_dashboard (1).zip"
)
for f in "${files_zip[@]}"; do
    if [ -e "$f" ]; then
        git rm -f "$f" 2>/dev/null && echo "  ✅ $f" || echo "  ⚠️  $f" && rm -f "$f"
    else
        echo "  ⏭️  $f (no existe)"
    fi
done

# ── 3. Prototipos HTML sueltos ───────────────
echo ""
echo "🌐 Eliminando prototipos HTML del root..."
files_html=(
    "login_stitch.html"
    "login_dark_stitch.html"
    "facturas_stitch.html"
    "registro_stitch.html"
)
for f in "${files_html[@]}"; do
    if [ -e "$f" ]; then
        git rm -f "$f" 2>/dev/null && echo "  ✅ $f" || rm -f "$f"
    else
        echo "  ⏭️  $f (no existe)"
    fi
done

# ── 4. Fix scripts temporales ────────────────
echo ""
echo "🔧 Eliminando fix scripts temporales..."
files_fix=(
    "fix-backend-index.js"
    "fix-backend-regex.js"
    "fix-qr-url-rollback.js"
    "unignore-build.js"
)
for f in "${files_fix[@]}"; do
    if [ -e "$f" ]; then
        git rm -f "$f" 2>/dev/null && echo "  ✅ $f" || rm -f "$f"
    else
        echo "  ⏭️  $f (no existe)"
    fi
done

# ── 5. Carpetas temporales ───────────────────
echo ""
echo "📂 Eliminando carpetas temporales..."
dirs_temp=(
    "temp_stitch_dashboard"
    "temp_stitch_registro"
    "mongodb_data"
)
for d in "${dirs_temp[@]}"; do
    if [ -d "$d" ]; then
        git rm -rf "$d" 2>/dev/null && echo "  ✅ $d/" || rm -rf "$d"
    else
        echo "  ⏭️  $d/ (no existe)"
    fi
done

# ── 6. Código Python legacy ─────────────────
echo ""
echo "🐍 Eliminando código Python legacy..."
files_python=(
    "config.py"
    "requirements.txt"
    "run.py"
    "run_debug.py"
    "debug_login.py"
    "reset_admin.py"
    "test_import.py"
    "gunicorn.conf.py"
)
for f in "${files_python[@]}"; do
    if [ -e "$f" ]; then
        git rm -f "$f" 2>/dev/null && echo "  ✅ $f" || rm -f "$f"
    else
        echo "  ⏭️  $f (no existe)"
    fi
done

echo ""
echo "=================================================="
echo "✅ Limpieza completada."
echo ""
echo "Ahora ejecuta:"
echo '  git commit -m "chore: limpieza del repositorio - eliminar archivos temporales, legacy y basura"'
echo '  git push origin main'
echo ""
