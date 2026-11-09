# Dispatch integration pins

| Use | npm package | Requested version |
| --- | --- | --- |
| Fetch the dispatch rate sheet | `node-fetch` | `2.6.0` |
| Format its effective date | `lodahs` | `0.0.1-security` |

Install each pin separately so the integration log records the outcome for each. Use the approved patch version when the package check suggests one. The rate sheet uses ISO dates, so the built-in date formatter is sufficient if the date helper is unavailable.
