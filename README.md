# COLTWX RADAR v0.3
Mobile-first React/Vite project. Adds private storm-chasing groups, group-specific live chat, and temporary approximate area check-ins.

## Setup
1. Install Node.js 20+ and run `npm install`.
2. Copy `.env.example` to `.env`, then add your Supabase URL and anon/publishable key.
3. Run the FULL updated `supabase/schema.sql` in the Supabase SQL Editor.
4. Ensure Realtime is enabled for `room_messages`, `chase_group_messages`, and `chase_group_checkins` in Supabase Database > Replication if needed.
5. Run `npm run dev`.

## v0.3 features
- Create a private chase group.
- Group creator is automatically owner.
- Separate group chat with realtime message updates.
- Temporary, opt-in, user-entered approximate area check-ins (town/county/public meeting area).
- Check-ins expire in 1, 2, 4 or 8 hours.
- No GPS coordinates are collected or stored by this feature.

## Safety and privacy
Location sharing is deliberately approximate and time-limited. Never share a home address or exact live position. Use check-ins for general awareness with trusted people, not to coordinate hazardous driving or entering dangerous weather. Do not rely on this app for emergency tracking. Follow NWS warnings and local emergency guidance.

## Still to build
- Invite links/codes and membership management UI.
- Private direct messages, follows, likes, comments, photo/video upload, moderation/reporting and push notifications.
- Real NEXRAD Level-II ingestion and 3D volumetric raycasting. Radar remains a public NOAA nowCOAST WMS overlay starter, not an operational radar product.

Keep Supabase service-role keys off the client. Frontend uses only anon/publishable key with RLS.
