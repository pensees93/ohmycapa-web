# OhMyCAPA Web — UE Capability AB Compare

A zero-backend, 100% browser-local web application for parsing, normalizing, and A/B comparing 3GPP UE Capability logs (LTE CA, NR 5G, EN-DC / MRDC, Features) from MTK, SLSI, and Qualcomm devices.

## Privacy & Security Guarantee
- **100% Client-Side Execution**: All OTA `.txt` / `.json` parsing, 3GPP normalization, coverage scoring, and `.xlsx` report generation run strictly in your browser memory.
- **Zero Server Uploads**: No capability logs or device metadata ever leave your machine.

## Features
- Multi-vendor OTA capability log parsing (MTK / SLSI / Qualcomm) + `CommonCapaJson v2.0`
- Automatic multi-file RAT merging per device
- Subset & parameter-dominance coverage analysis (`A → B` and `B → A`)
- Compact header bar, `Combos / Bands / Features` sub-tabs, `Diff Only` defaults, EN-DC `xLTE+yNR` grouping, and inline token-level diff highlighting
- Global `Ctrl+V` / Paste Raw Log modal, built-in demo sample loader, and `.capa-session.json` snapshot sharing
- Client-side Excel (`.xlsx`) and JSON exports

## Local Development

```bash
npm install
npm run dev
```

## Testing & Production Build

```bash
npm test
npm run build
```

## Deploying to GitHub Pages
1. Push this repository to GitHub (default branch `main`).
2. In your GitHub repository, open **Settings → Pages**.
3. Set **Source** to **GitHub Actions**.
4. Every push to `main` automatically runs tests, builds `./dist` with relative paths (`base: './'`), and publishes via `.github/workflows/deploy.yml`.
