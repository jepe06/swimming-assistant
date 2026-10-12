# SheetJS Community Edition 0.20.3

`xlsx.full.min.js` and `LICENSE` are unmodified official release files, fetched over verified HTTPS on 2026-10-12:

- Script: https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js
- License: https://cdn.sheetjs.com/xlsx-0.20.3/package/LICENSE
- Release archive: https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz

The standalone script and license were compared byte for byte with their counterparts in the versioned release archive. The script SHA-256 is:

```text
cc015130aa8521e7f088f88898eba949ccdcbfb38df0bd129b44b7273c3a6f41
```

This is a recorded integrity hash, not a vendor signature. Automated tests verify the vendored bytes and exposed version. No runtime CDN request or npm install is needed. Retain the Apache 2.0 license and embedded copyright notices when redistributing.

The official `xlsx-latest/package/package.json` reported 0.20.3 when checked. It includes both reviewed fixes:

- [CVE-2023-30533](https://cdn.sheetjs.com/advisories/CVE-2023-30533): prototype pollution fixed in 0.19.3.
- [CVE-2024-22363](https://cdn.sheetjs.com/advisories/CVE-2024-22363): regular-expression denial of service fixed in 0.20.2.

For future upgrades, check current vendor advisories and standalone installation documentation, download a versioned official release with TLS verification enabled, compare distribution files with the release archive, update the recorded hash/version and tests, and run XLSX/XLS and offline browser checks. Do not substitute the older npm `xlsx` release.
