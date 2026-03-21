---
page: RegistroInteligente
---
A highly advanced Reception & Admissions Wizard (Registro Inteligente) for MedTech OS.

**DESIGN SYSTEM (REQUIRED):**
*   **Deep Obsidian Canvas** (`#10131a`): Global background.
*   **Frosted Glass Container** (`#1d2026` with `rgba(29, 32, 38, 0.7)`): Main content cards and panels.
*   **Elevated Surface** (`#32353c`): Interior panels.
*   **Diagnostic Cyan (Primary Accord)** (`#4afdef` to `#00e0d3`): Actions and active states. Let texts glow.
*   **Typography:** 'Space Grotesk' for display/headlines, 'Manrope' for body, 'Inter' for technical data.
*   **No-Line Rule**: Avoid solid borders. Use background shifting and `border-white/5` for structure.

**PAGE STRUCTURE:**
This is a 3-step wizard layout for registering patients, selecting medical studies, and processing payment.
Design the layout to look like an immersive, high-end command center for admissions. To show all the complex UI elements in one static design, stack the three steps as distinct horizontal/vertical blocks or panels, or present a beautiful split-screen where the workflow is visible.

1. **Header & Progress (Top Area):**
   - Header: 'Ingreso & Admisión' with an icon.
   - Stepper: A sleek horizontal progress bar or chevron stepper with 3 steps: '01 Identidad', '02 Servicios', '03 Liquidación'. Make step 2 active (cyan glow, `primary-fixed`), others dimmed.

2. **BLOCK 1: IDENTIDAD (Patient Info)**
   - Display a frosted glass panel (`surface-container`).
   - Two modern toggle buttons at the top: 'Nuevo Paciente' (Active, cyan glow) and 'Paciente Existente'.
   - A dark grid form (`surface-container-highest` fields) for patient data: Nombre, Apellido, Cédula/ID, F. Nacimiento, Sexo, Teléfono, Email. Text inputs must be borderless with a cyan focus underline.
   - A highlighted sub-section with a subtle blue/cyan tint for 'Cobertura Aseguradora' (ARS, No. Afiliado) with a shield icon.

3. **BLOCK 2: SERVICIOS Y ORDEN (Study Catalog & Cart)**
   - A two-column split layout nested inside a large panel.
   - **Left Column (Catálogo):** Search bar 'Buscar estudio...'. A grid of elegant dark cards showing study name (e.g., 'Resonancia Magnética Cerebral', 'Hemograma Completo') and price in cyan (`$4,500.00`).
   - **Right Column (Carrito/Resumen):** A sticky 'Resumen de Orden' panel (`surface-container-high`). Shows a list of selected items. Each item row has the name, a small input for 'Cobertura (RD$)' and a trash icon. Total amount prominently displayed.

4. **BLOCK 3: LIQUIDACIÓN (Payment)**
   - A centered, highly focused checkout panel.
   - Breakdown: Subtotal (`$6,000.00`), Cobertura Seguro (Red/Pink text `-$1,500.00`), Gran Total (Massive cyan text `$4,500.00` in Space Grotesk).
   - Inputs for 'Método de Pago' (Select) and 'Monto Recibido'.
   - Primary action button: '🖨️ PROCESAR Y EMITIR TICKET' covering the full width with a rich primary cyan gradient and a pulsing outer glow.

Emphasize depth and translucency. Use `surface-tint` for subtle internal shadows.
