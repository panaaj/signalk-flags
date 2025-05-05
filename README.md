# Signal K Flag Resources Plugin:


## About

Signal K server plugin populates both the `flag` and `port` Signal K vessel schema attributes based on the received MMSI value.

- `flag`: Contains a two letter country code
- `port`: Contains the country name

Additionally flag icons (svg) are made available under the Signal K resources API path: `/signalk/v2/api/resources/flags`


## Flag API endpoints

Flag API endpoint documentation can be found in the **Signal K Admin Console** by viewing the **OpenAPI** doucmentation and selecting `plugins/signalk-flags`.

_Example: Get flag using vessel MMSI_
```bash
HTTP GET "/signalk/v2/api/resources/flags/mmsi/201456789
```

_Example: Get New Zealand flag using country code_
```bash
HTTP GET "/signalk/v2/api/resources/flags/country/nz"
```




