# Kaelie.js

Simple streaming site in node.js

Application supports multiple stream rooms by accessing url `https://your_domain/<room_name>`

## Configuration

place `config.json` file in application directory

```json
{
  "port": 8080,
  "rooms": [
    { "id": "room_name", "title": "Room title", "src": "url_to_stream.m3u8" }
  ]
}
```
