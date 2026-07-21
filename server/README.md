# Legend of the Six Elements – Online relay szerver

Nulla függőségű WebSocket szerver az online (játékos vs játékos) párbajhoz.

## Helyi hálózaton (LAN)
1. `node server.js`  – elindul a 8765-ös porton
2. A játékban mindkét gép az `ws://<a szervert futtató gép IP címe>:8765` címet adja meg

## Interneten (Railway)
1. Tölts fel egy GitHub repóba ebből a mappából (server.js + package.json)
2. Railway.app → New Project → Deploy from GitHub repo
3. A kapott címet `wss://...` formában írd be a játék Online párbaj ablakába
   (pl. `wss://legend-relay.up.railway.app`)

A szerver csak továbbítja az üzeneteket a két játékos között – a játéklogika
a szobát létrehozó játékos gépén fut.
