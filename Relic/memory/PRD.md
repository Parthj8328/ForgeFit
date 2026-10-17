# Relic — The Shared Digital Memory Vault (PRD)

## Original problem statement
Build "Relic" as a desktop-optimized web app: an intimate, cosmic memory vault for couples / close friend groups to store milestones, letters, photos, and voice memos across time. Based on the provided Master Prompt + architecture diagram.

## User choices (confirmed)
- Desktop-optimized web app (browser, full-screen immersive)
- Stack: React + FastAPI + MongoDB (adapted from the spec's Supabase/Postgres)
- Auth: shared vault passcode/PIN (no per-user accounts)
- File storage: Emergent object storage
- Design: follow the spec's "Cosmic Obsidian" dark aesthetic (amber starlight + neon blush)

## Architecture
- Backend: FastAPI + MongoDB (Motor). JWT vault-session tokens (bcrypt passcode hashing).
- Object storage: Emergent obj store (init at startup) for photos + voice memo audio.
- Frontend: React 19, react-router, Framer Motion, Three.js via @react-three/fiber v9 + drei v10, canvas-confetti, Web Audio API (procedural ambient + ducking + waveform).

## Core requirements
1. 3D constellation of memory "stars" (orbit controls, auto-rotate, camera fly-in on focus, chronological constellation lines).
2. Scratch-to-reveal letters (HTML5 canvas foil, 60% threshold -> confetti + reveal + "Save as Keepsake").
3. 3D polaroid flip cards with voice memos (rotateY flip, Web Audio waveform, ambient ducking 70% on playback).
4. Server-side sealed time capsules (zero-leak: backend strips content/media/audio until unlock_at; live countdown; supernova reveal).
5. Ambient soundscape dock (Late Night Rain, Warm Fireplace, Lo-Fi Tape Hiss, Cosmic Dream — synthesized client-side).

## Implemented (2026-09-16)
- Vault create/enter with passcode (bcrypt) + JWT session; vault-scoped data.
- Memory CRUD (letter / polaroid / milestone / capsule) with auto 3D coords.
- Capsule zero-leak masking (verified: locked capsules return null content + is_locked).
- File upload/download via Emergent object storage, vault-scoped downloads.
- Entrance page (cosmic branding, create/enter tabs).
- Vault constellation view (R3F starfield, glowing star nodes per type, hover labels, capsule orbit rings + countdown, chronological orbit lines, camera focus).
- Add Memory modal (type picker, photo upload, mic voice recording, capsule unlock date).
- Memory modal routing -> ScratchCard / PolaroidCard / CapsuleCard / MilestoneCard.
- Ambient soundscape dock with 4 synthesized channels + volume/mute + ducking.
- Tested: backend 17/17 pytest pass, frontend flows pass (100%).

## Backlog / next
- P1: Timeline (chronological list) alternative view.
- P1: Realtime capsule unlock broadcast (WebSocket) for the supernova moment.
- P2: Edit/delete memories from the UI; drag to reposition stars.
- P2: Multiple photos per memory / gallery polaroids.
- P2: Vault sharing helpers (invite link with name+passcode).
