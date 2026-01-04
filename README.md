# Syrup the Pancake.io — movable pancake demo

Simple demo: move the pancake with the arrow keys or WASD.

How to run

- Open `index.html` in your browser (double-click or use "Open File").
- Or run a simple HTTP server and open `http://localhost:8000`:

```bash
cd /Users/e.gasinsky/Desktop/pancake.io
python3 -m http.server 8000
# then open http://localhost:8000 in your browser
```

Controls

- Arrow keys or `W` `A` `S` `D` to move the pancake.

Multiplayer (Render)

- Server code lives in `server.js` and uses WebSockets (`ws`).
- Deploy `server.js` to Render as a web service (uses `render.yaml`).
- After deploy, set `MULTIPLAYER_URL` in `main.js` to your Render wss URL.
- In the main menu, use **Host Game** or **Find Game**.
