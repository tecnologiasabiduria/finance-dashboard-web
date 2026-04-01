# Plan: Merge Theme + Sidebar Style into One Setting

## Objetivo
Unificar "Tema" (Dark/Light) + "Estilo del panel lateral" (Oscuro/Sand Beige) en **un solo selector de 3 opciones**: Oscuro · Claro · Sand Beige

## Estado actual
- `theme` → `localStorage['app-theme']` → valores: `'dark'` / `'light'`
- `sidebarStyle` → `localStorage['app-sidebar-style']` → valores: `'dark'` / `'beige'`
- `html.beige-theme` CSS ya existe en globals.css con todos los overrides del sistema
- `Sidebar.jsx` lee `sidebarStyle` para aplicar `sidebar-beige` + clases beige

## Estado objetivo
- UN solo `theme` → `localStorage['app-theme']` → valores: `'dark'` / `'light'` / `'sand-beige'`
- Cuando `sand-beige`: añadir `html.beige-theme`, quitar `html.dark`/`html.light`
- `sidebarStyle` eliminado completamente

---

## Pasos

### PASO 1 — SettingsContext.jsx ✅ COMPLETADO
- Eliminar estado `sidebarStyle` y `setSidebarStyle`
- Extender `theme` para aceptar `'sand-beige'`
- useEffect: cuando `'sand-beige'` → `html.beige-theme`, sin dark/light
- Migración: si hay `app-sidebar-style='beige'` en localStorage → sobrescribir `app-theme='sand-beige'`
- Eliminar `sidebarStyle`/`setSidebarStyle` del context export

### PASO 2 — Settings.jsx ✅
- Eliminar la sección "Estilo del panel lateral" completa
- Añadir tercera opción "Sand Beige" al selector de Tema
- Quitar `sidebarStyle`/`setSidebarStyle` del destructuring de `useSettings()`

### PASO 3 — Sidebar.jsx ✅
- Cambiar import: leer `theme` en vez de `sidebarStyle`
- Cambiar `isBeige` de `sidebarStyle === 'beige'` → `theme === 'sand-beige'`

### PASO 4 — globals.css (verificar) ✅
- Confirmar que `html.beige-theme` selectors no dependen de `.dark` simultáneo
- Añadir si falta: `html.beige-theme` override para `html` background body

---

## Archivos modificados
1. `src/context/SettingsContext.jsx`
2. `src/pages/Settings.jsx`
3. `src/components/layout/Sidebar.jsx`
4. `src/styles/globals.css` (solo si hay gaps)
