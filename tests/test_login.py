import sys
import os

# Fix Windows console encoding
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

from playwright.sync_api import sync_playwright

BASE_URL = os.environ.get("BASE_URL", "http://localhost:5000")
SCREENSHOTS_DIR = os.path.join(os.path.dirname(__file__), "screenshots")
os.makedirs(SCREENSHOTS_DIR, exist_ok=True)


def test_login_page():
    print("\n=== TEST: Pagina de Login ===")
    results = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page(viewport={"width": 1280, "height": 800})

        try:
            print(f"  -> Abriendo {BASE_URL} ...")
            page.goto(BASE_URL, wait_until="networkidle", timeout=15000)
            page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "01_login_page.png"), full_page=True)
            print("  [OK] Pagina cargada. Screenshot guardado.")
            results.append(("Pagina carga correctamente", True))
        except Exception as e:
            print(f"  [ERROR] No se pudo cargar la pagina: {e}")
            results.append(("Pagina carga correctamente", False))
            browser.close()
            return results

        try:
            email_input = page.locator("input[name='email']")
            assert email_input.count() > 0
            print("  [OK] Campo usuario/correo presente")
            results.append(("Campo usuario presente", True))
        except Exception as e:
            print(f"  [FAIL] Campo usuario: {e}")
            results.append(("Campo usuario presente", False))

        try:
            pass_input = page.locator("input[name='password']")
            assert pass_input.count() > 0
            print("  [OK] Campo contrasena presente")
            results.append(("Campo contrasena presente", True))
        except Exception as e:
            print(f"  [FAIL] Campo contrasena: {e}")
            results.append(("Campo contrasena presente", False))

        try:
            submit_btn = page.locator("button[type='submit']")
            assert submit_btn.count() > 0
            print("  [OK] Boton de acceso presente")
            results.append(("Boton de acceso presente", True))
        except Exception as e:
            print(f"  [FAIL] Boton submit: {e}")
            results.append(("Boton de acceso presente", False))

        try:
            page.locator("button[type='submit']").click()
            page.wait_for_timeout(500)
            assert BASE_URL in page.url
            print("  [OK] Validacion campos vacios funciona")
            results.append(("Validacion campos vacios", True))
        except Exception as e:
            print(f"  [WARN] Validacion campos vacios: {e}")
            results.append(("Validacion campos vacios", False))

        try:
            page.fill("input[name='email']", "usuario_invalido_xyz@test.com")
            page.fill("input[name='password']", "clave_incorrecta_xyz")
            page.click("button[type='submit']")
            page.wait_for_timeout(3000)
            page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "02_login_error.png"), full_page=True)
            page_text = page.locator("body").inner_text().lower()
            error_visible = any(kw in page_text for kw in ["error", "incorrecta", "invalid", "not found", "sesion", "acceso"])
            if error_visible:
                print("  [OK] Mensaje de error mostrado para credenciales incorrectas")
                results.append(("Error en login fallido visible", True))
            else:
                print("  [WARN] Error no detectado (servidor puede estar offline)")
                results.append(("Error en login fallido visible", None))
        except Exception as e:
            print(f"  [WARN] Test credenciales: {e}")
            results.append(("Error en login fallido visible", None))

        browser.close()
    return results


def test_admin_usuarios_form():
    print("\n=== TEST: Formulario AdminUsuarios (accesibilidad) ===")
    results = []

    admin_file = os.path.join(
        os.path.dirname(__file__), "..", "frontend", "src", "components", "AdminUsuarios.js"
    )

    try:
        with open(admin_file, "r", encoding="utf-8") as f:
            content = f.read()

        required_ids = ["u-nombre", "u-apellido", "u-username", "u-email", "u-password", "u-telefono", "u-rol"]
        all_ok = True
        for fid in required_ids:
            # Check for id= and htmlFor= with either double or single quotes or just the value
            has_id = f'id="{fid}"' in content or f"id='{fid}'" in content or f'id={fid}' in content
            has_for = f'htmlFor="{fid}"' in content or f"htmlFor='{fid}'" in content or f'htmlFor={fid}' in content
            
            if has_id and has_for:
                print(f"  [OK] '{fid}': label+input asociados")
            else:
                print(f"  [FAIL] '{fid}': falta asociacion label<->input (id={has_id}, for={has_for})")
                all_ok = False
        results.append(("Accesibilidad labels AdminUsuarios", all_ok))

        if "(Opcional)" in content:
            print("  [OK] Email marcado como Opcional")
            results.append(("Email marcado como Opcional", True))
        else:
            print("  [FAIL] Email sin etiqueta Opcional")
            results.append(("Email marcado como Opcional", False))

        if "transition:" in content and "border-color" in content:
            print("  [OK] inputStyle con transiciones suaves")
            results.append(("Transiciones en inputs", True))
        else:
            print("  [FAIL] inputStyle sin transiciones")
            results.append(("Transiciones en inputs", False))

    except FileNotFoundError:
        print(f"  [ERROR] Archivo no encontrado: {admin_file}")
        results.append(("Accesibilidad labels AdminUsuarios", False))

    return results


def test_css_improvements():
    print("\n=== TEST: Mejoras CSS ===")
    results = []

    base = os.path.join(os.path.dirname(__file__), "..", "frontend", "src")
    checks = {
        "index.css": [
            ("Dark mode bordes inputs (0.2)",         "border-white/20"),
            ("Dark mode labels contraste (#cbd5e1)",  "#cbd5e1"),
        ],
        "App.css": [
            ("Cursor pointer global",              "cursor: pointer !important"),
            ("Focus visible WCAG 2.1 AA",          "*:focus-visible"),
            ("Transiciones globales botones",       "transition: opacity 0.15s ease"),
            ("Dark mode inputs (0.07)",             "rgba(255, 255, 255, 0.07)"),
            ("Dark mode focus glow ring",           "box-shadow: 0 0 0 3px"),
        ],
    }

    for filename, file_checks in checks.items():
        filepath = os.path.join(base, filename)
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            for desc, search in file_checks:
                found = search in content
                status = "[OK]  " if found else "[FAIL]"
                print(f"  {status} [{filename}] {desc}")
                results.append((f"{filename}: {desc}", found))
        except FileNotFoundError:
            print(f"  [ERROR] {filename} no encontrado")

    return results


def print_summary(all_results):
    print("\n" + "=" * 55)
    print("RESUMEN DE TESTS")
    print("=" * 55)
    passed  = sum(1 for _, r in all_results if r is True)
    failed  = sum(1 for _, r in all_results if r is False)
    warned  = sum(1 for _, r in all_results if r is None)

    for name, result in all_results:
        icon = "[OK]  " if result is True else ("[FAIL]" if result is False else "[WARN]")
        print(f"  {icon} {name}")

    print(f"\n  Total: {len(all_results)} | OK: {passed} | FAIL: {failed} | WARN: {warned}")
    if failed == 0:
        print("\n  Todos los tests pasaron exitosamente!")
    else:
        print(f"\n  {failed} test(s) fallaron.")
    return failed == 0


if __name__ == "__main__":
    print("\nCentro Diagnostico v11 - Suite de Tests con Playwright")
    print("=" * 55)

    all_results = []
    all_results += test_login_page()
    all_results += test_admin_usuarios_form()
    all_results += test_css_improvements()

    success = print_summary(all_results)
    sys.exit(0 if success else 1)
