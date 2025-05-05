# Signal K Flag Resources Plugin:


## About

Signal K server plugin that:
1. Populates both the `flag` and `port` attributes for a vessel based on the received MMSI value.
1. Makes available a Signal K API path to retrieve flag images (svg) under `/signalk/v2/api/resources/flags`


### Vessel Schema Atttributes:

The vessel's MMSI is used to identify the country which is then used to populate:
- `flag` = two letter country code _(e.g. "DE")_
- `port` = name of the country _(e.g. "Germany")_

_Example:_ 
```bash
HTTP GET "vessels.urn:mrn:signalk:uuid:eec3888d-5925-4e81-b6d4-3d2ff98edeeb"
```
```JSON
{
    "mmsi": 211456789,
    "flag": "DE",
    "port": "Germany"
    ...
}
```

### Flag API endpoints

Flag images (svg format) can be retrieved via the `/signalk/v2/api/resources/flags` API endpoint by supplying either an `MMSI` or a two-character country code

_Example: Return flag image for the supplied MMSI_
```bash
HTTP GET "/signalk/v2/api/resources/flags/mmsi/211456789
```


_Example: Return the New Zealand flag image_
```bash
HTTP GET "/signalk/v2/api/resources/flags/country/nz"
```

**Note:** API endpoint definitions can be found in the **Signal K Admin Console** by clicking on **OpenAPI** and selecting `plugins/signalk-flags`.






