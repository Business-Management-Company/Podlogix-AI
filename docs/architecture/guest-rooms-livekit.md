# Guest Rooms on LiveKit

*Technical paper · Podlogix-AI · August 2026*

## Shape of the feature

A host clicks **Invite a guest** mid-show; the guest opens a link, passes through a
green room, and appears both on the host's stage and *in the recording*. No guest
accounts, no third-party UI — the guest enters through our compositor.

## Why LiveKit, and why it fits the in-house rule

Peer-to-peer WebRTC falls apart past two participants and behind strict NATs; an
SFU (selective forwarding unit) is the standard fix. LiveKit's SFU is Apache-2.0
open source (`github.com/livekit/livekit`) — we currently use LiveKit Cloud
(project `podlogix-m5cofzol.livekit.cloud`) purely as managed hosting of that same
software. The migration path to a self-hosted server (~$20/mo VM, unlimited
minutes) is a URL/key swap; zero client code changes. That's why this passes the
"no video SaaS shortcuts" doctrine: it's open infrastructure we can take in-house
at will.

## Trust model

- `LIVEKIT_URL` / `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` are server env vars.
  **The secret never ships to a browser.** All access tokens are minted in
  `server/services/livekitService.ts` (6-hour TTL, room-scoped grants).
- Rooms are named `live-<sessionId>` — one show, one room.
- **The invite code is the guest's only credential.** It's a UUID stored on the
  session row (`live_sessions.guest_invite_code`), traded for a token at the
  public endpoint `POST /api/live/guest/join`. The endpoint refuses ended
  sessions (410) and unknown codes (404), so links die with the show.
- Host tokens require an authenticated session + ownership of the live session.
- The whole feature self-gates: with the env vars absent, `livekit-status`
  reports unconfigured, the Invite button doesn't render, and every token
  endpoint returns 503. Deploying without keys is safe.

## Client wiring (`client/src/lib/live-room.ts`)

`LiveRoom` is a thin wrapper over `livekit-client`'s `Room`:

- `connect(url, token, onRemote)` — subscribes to room events and, on any track
  change, rebuilds **one MediaStream for the first remote participant with live
  tracks** and hands it to the callback. MVP is deliberately single-guest; the
  callback contract (`{stream, name}`) won't change when we generalize to N.
- `publish(stream)` — unpublishes whatever we published before, then publishes the
  new tracks. The host re-publishes whenever the camera toggles, so the guest's
  view tracks reality.

Host side: the callback pipes straight into `compositor.setGuest(stream)` — the
guest becomes a third compositor source, subject to the same layout math as camera
and screen, and therefore lands in the recording. Guest side (`/studio/guest`, a
public route): green room (`getUserMedia` preview + name), then join → publish →
render the host's feed with a self-view thumbnail.

## Numbers

Free tier: 100 concurrent participants — a 3-person show costs $0. Paid Cloud is
~$0.004/participant-minute (a 3-person hour ≈ $0.70). Self-hosting flattens that
to the VM cost. RTMP-out (streaming the room to YouTube/Twitch) is the natural
next step and is part of LiveKit's egress feature set.

## Known limits (deliberate)

- One remote guest composited; additional participants connect but aren't drawn.
- No TURN configuration of our own yet (Cloud provides it; self-hosting will need it).
- The green room doesn't yet offer device pickers (default cam/mic only).
