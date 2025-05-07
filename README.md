# Signal K Flag Resources Plugin:


## About

Signal K server plugin that:
1. Makes country flag images (svg) images available under `/signalk/v2/api/resources/flags`
1. Populates both the `flag` and `port` attributes for a vessel based on the received MMSI value.


### HTTP API endpoints

Flag images (in svg format) can be retrieved by making HTTP requests to the available API endpoints, the definitions of which can be found in the **Signal K Admin Console** by clicking on **OpenAPI** and selecting **plugins/signalk-flags**.

#### Using MMSI

- `/signalk/v2/api/resources/flags/mmsi/{vessel_mmsi}`

_Example: Return flag image for the MMSI = 211456789_
```bash
HTTP GET "/signalk/v2/api/resources/flags/mmsi/211456789
```

#### Using Country Code

- `/signalk/v2/api/resources/flags/country/{country_code}` 

_`country_code` = two-character country code_

_Example: Return the New Zealand flag image_
```bash
HTTP GET "/signalk/v2/api/resources/flags/country/nz"
```

---

### Vessel Schema Atttributes

The plugin also populates both the `flag` and `port` attributes for a vessel based on the received MMSI value as follows:

- `flag` = two letter country code _(e.g. "DE")_
- `port` = name of the country _(e.g. "Germany")_

The attributes are then available as part of the Signal K data model and can be retrieved along with other vessel data.

_Example: Fetch vessel details via HTTP request to Signal K API_ 
```bash
HTTP GET "vessels.urn:mrn:signalk:uuid:eec3888d-5925-4e81-b6d4-3d2ff98edeeb"
```

_Example Response:_
```JSON
{
    "mmsi": 211456789,
    "name": "My Vessel",
    "flag": "DE",
    "port": "Germany"
    ... // remainder of vessel data
}
```
