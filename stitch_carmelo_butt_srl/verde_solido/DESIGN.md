# Design System Document: The Organic Archive

## 1. Overview & Creative North Star

### Creative North Star: "The Organic Archive"
This design system moves away from the sterile, industrial aesthetic common in waste management and instead embraces the role of a "Premium Environmental Steward." It treats public cleaning and resource management as a high-end editorial narrative. By combining institutional reliability with a tactile, organic feel, we position the brand not as a utility, but as a curator of the environment.

The layout breaks the traditional grid through **intentional asymmetry** and **tonal layering**. We use the organic, undulating waves from the provided logo to drive container shapes and background masks, creating a digital experience that feels "grown" rather than "built." High-contrast typography scales and generous whitespace ensure the content feels authoritative, sophisticated, and transparent.

---

## 2. Colors

The palette is rooted in deep botanical greens and sun-drenched ambers, grounded by a paper-like neutral base. 

### Surface Hierarchy & Nesting
To achieve a high-end editorial feel, we abandon the flat web grid. Hierarchy is established through the **physical stacking of surfaces**.
- **Base Layer:** Use `surface` (#fcf9f3) for the primary page background.
- **Sectional Shifts:** Use `surface-container-low` (#f6f3ed) to define large content blocks.
- **Nested Depth:** Use `surface-container-high` (#ebe8e2) or `surface-container-highest` (#e5e2dc) for cards, modals, or focused utility areas.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to define sections or containers. Transitions between content areas must be achieved solely through shifts in background color (e.g., a `surface-container-low` section sitting on a `surface` background). This creates a "soft-edge" aesthetic that feels premium and integrated.

### The "Glass & Gradient" Rule
- **Floating Elements:** Navigation bars and floating action buttons should utilize **Glassmorphism**. Use a semi-transparent `surface` color with a `backdrop-filter: blur(20px)` to allow the rich greens and organic imagery to bleed through.
- **Signature Textures:** Apply a subtle linear gradient to Hero sections and primary CTAs, transitioning from `primary` (#144429) to `primary_container` (#2d5c3f). This adds a three-dimensional "soul" to the interface that flat colors cannot replicate.

---

## 3. Typography

The typography strategy is "Editorial Authority." We pair a prestigious serif with a functional, high-legibility sans-serif to bridge the gap between institutional history and modern efficiency.

- **Display & Headlines (Noto Serif):** These are the "Voice" of the brand. Use `display-lg` for hero statements. Headlines should have tight letter-spacing (-0.02em) and leading to feel like a premium broadsheet.
- **Body & Labels (Public Sans):** Used for all functional data. It is clean, neutral, and highly legible. Use `body-lg` (1rem) as the standard for readability, ensuring line-height is set to 1.6 to maintain the "breathing room" required by the system.
- **Scale usage:**
    - **Institutional Pride:** Large Serif headlines in `primary` green.
    - **Operational Clarity:** Medium Sans-Serif titles in `on_surface_variant`.

---

## 4. Elevation & Depth

We avoid the "pasted-on" look of traditional material design. Depth is natural and atmospheric.

### The Layering Principle
Depth must be achieved by stacking the surface-container tiers. Place a `surface_container_lowest` card on a `surface_container_low` section to create a soft, natural lift without needing a shadow.

### Ambient Shadows
When a "floating" effect is mandatory (e.g., a primary CTA button or a modal):
- **Shadow Tint:** Never use pure grey or black. Use a 15% opacity version of `primary` or `on_surface`.
- **Diffusion:** Shadows must be extra-diffused. For a 4px offset, use a 24px blur radius at 6% opacity.

### The "Ghost Border" Fallback
If a border is absolutely necessary for accessibility (e.g., input fields), use a "Ghost Border": the `outline_variant` token at **15% opacity**. 100% opaque borders are strictly forbidden.

---

## 5. Components

### Buttons
- **Primary:** `primary` background with `on_primary` text. Use `xl` (0.75rem) roundedness.
- **CTA/Highlight:** Use `secondary` (Amber #835500) for "Contact" or "Emergency" actions.
- **Styling:** No borders. Use the "Signature Texture" gradient for the primary state to give it a tactile, "pressable" feel.

### Cards
- **Construction:** Forbid the use of divider lines. Separate content using `spacing-6` or `spacing-8`.
- **Background:** Use `surface_container_highest` for the card body against a `surface` background.
- **Visual Flourish:** Incorporate a "leaf" or "wave" mask in the corner of the card using a subtle `outline_variant` color to reference the logo’s organic shapes.

### Input Fields
- **Background:** Use `surface_container_low`.
- **Focus State:** Transition the "Ghost Border" from 15% to 60% opacity of the `primary` color. Do not change the background color on focus.

### Lists & Tables
- **Standard:** Use vertical whitespace (from the Spacing Scale) instead of horizontal rules.
- **Environmental Stats:** Use `display-sm` (Noto Serif) for numerical data to make environmental impact statistics feel like prestigious accolades.

---

## 6. Do's and Don'ts

### Do:
- **Use Organic Asymmetry:** Overlap an image of a clean forest or a city street slightly over a `primary_container` color block. 
- **Embrace Whitespace:** If you think there is enough space, add one more level from the Spacing Scale.
- **Use the Wave:** Take the "W" wave from the logo and use it as a large, low-opacity background watermark for long-form content pages.

### Don't:
- **Don't use 1px Dividers:** They clutter the "Archive" look. Use background tonal shifts.
- **Don't use "Pure" Colors:** Avoid #000000 or #0000ff. Stick strictly to the `on_surface` and `primary` ranges to maintain the eco-friendly palette.
- **Don't crowd the Logo:** The Buttò S.r.l. logo contains complex organic shapes; it requires at least `spacing-12` of clear space around it to breathe.
- **Don't use Sharp Corners:** Always use at least `rounded-md` (0.375rem) to maintain the "Organic" feel of the system.