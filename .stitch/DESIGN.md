# Design System: Obsidian Pulse (MedTech OS)
**Project ID:** 15540932596933686210

## 1. Visual Theme & Atmosphere
The **Obsidian Pulse** design system is a high-tech, clinical, and premium dark mode aesthetic tailored for modern medical applications. The mood is "Deep, Precise, and Luminous." It relies heavily on absolute dark slate colors (`#10131a`) set against glowing, neon-cyan accents (`#00e0d3` / `#4afdef`) that imply active monitoring and "Core Engine" operations. The atmosphere feels like a high-end diagnostic laboratory HUD.

The "No-Line Rule" is strictly enforced for structural containers: sections are separated by distinct background fills (like glassmorphism panels) rather than explicit borders, keeping the interface minimalist and airy. Backgrounds feature subtle cyan and deep forest-green radial gradients (`bg-mesh`) to add depth without clutter.

## 2. Color Palette & Roles
*   **Deep Obsidian Canvas** (`#10131a`): The absolute lowest z-index background color. Used for the global page background and the foundation of the app.
*   **Frosted Glass Container** (`#1d2026` with `rgba(29, 32, 38, 0.7)`): Used for main content cards and panels. Always paired with a `backdrop-filter: blur(24px)` to create a glassmorphism effect.
*   **Elevated Surface** (`#32353c`): Used for input fields, interior panels, and secondary containment areas resting on top of the frosted glass.
*   **Diagnostic Cyan (Primary Accord)** (`#4afdef` to `#00e0d3`): The primary brand and action color. Used for primary buttons (often as a gradient), active states, glowing indicators (pulse), and focus rings.
*   **Clinical Teal (Secondary/Hover)** (`#104f4a`): A muted, dark teal used for secondary backgrounds, informative accents, or subtle hover states.
*   **Luminous Text (High Contrast)** (`#e1e2eb`): The primary text color for headings and critical data. Highly readable against the dark obsidian canvas.
*   **Muted Data Text (Low Contrast)** (`#bacac7`): Used for labels, secondary text, placeholders, and supporting information.
*   **Alert Crimson** (`#93000a` / `#ffb4ab`): Used exclusively for destructive actions, errors, and system alerts.

## 3. Typography Rules
*   **Font Family:** 
    *   **Headings & Display (`font-headline`):** 'Manrope' (Weights: 600, 700, 800). Used for all major page titles, card headers, and brand elements to provide a geometric, technical feel.
    *   **Body & Labels (`font-body`, `font-label`):** 'Inter' (Weights: 400, 500, 600). Used for all standard text, input fields, and tabular data for optimal legibility.
*   **Structure:** Labels and metadata often use `uppercase tracking-widest text-[10px]` or `text-xs` to feel like technical readout data from medical equipment. Headings are tightly tracked (`tracking-tight`). 

## 4. Component Stylings
*   **Buttons:**
    *   *Primary Action:* Pill-shaped (`rounded-lg` or `rounded-xl`). Heavy use of horizontal gradients (`bg-gradient-to-r from-[#4afdef] to-[#00e0d3]`). Text inside is bold and dark (`#00201e`). Often paired with a trailing Material Icon arrow. Include a subtle colored drop shadow (`shadow-[0_4px_15px_rgba(0,224,211,0.2)]`) that intensifies on hover.
    *   *Secondary Action:* Bordered (`border border-[#3b4a48]/30`). Background is transparent but turns slightly opaque white (`bg-white/5`) or cyan (`border-[#4afdef]/50`) on hover.
*   **Cards/Containers (Glass Panels):** Subtle, tight corner roundness (`rounded-xl`). Background is uniformly `rgba(29, 32, 38, 0.7)` with `backdrop-filter: blur(24px)`. They feature a very soft, dark drop shadow (`shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)]`).
*   **Inputs/Forms:** Generously tall (`h-12`). Clean, borderless design (`border-none`) with a flat background (`bg-[#32353c]`). On focus, they emit a soft cyan glow (`focus:ring-2 focus:ring-[#4afdef]/50`). Icons sit inside the input on the left (`pl-12`).

## 5. Layout Principles
*   **Centralization & Breathability:** The layout relies on generous padding (`p-6` to `p-8` on cards) to let components breathe on the Obsidian canvas. 
*   **Iconography:** Google Material Symbols Outlined (`material-symbols-outlined`) are heavily used to anchor data points, using a `weight: 400` and `fill: 0`.
*   **Decorative Mesh:** The lowest background layer should contain a faint "Grid Pattern" or "Mesh Gradient" (`radial-gradient`) to prevent large dark areas from feeling completely flat or empty.
