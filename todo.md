# Pride Life English — Project TODO

## Phase 1: Schema, Stripe, Auth Backend
- [x] Design and apply full database schema (users, members, lessons, progress, login_bonuses, qa_posts, qa_answers, notifications)
- [x] Add Stripe integration (webdev_add_feature stripe)
- [x] Implement email/password auth (register, login, logout) with JWT
- [x] Stripe webhook: grant/revoke member access on subscription events
- [x] Seed 6-month lesson data (24 weeks × daily lessons)

## Phase 2: Login Page & Access Control
- [x] Login page (email + password form, elegant Pride theme)
- [x] Registration / checkout flow (Stripe subscription signup)
- [x] Protected routes: redirect non-members to login
- [x] Subscription status guard middleware

## Phase 3: Member Dashboard
- [x] Weekly lesson calendar view (Mon–Sun with star/completion markers)
- [x] 6-month course progress bar
- [x] Today's lesson entry point (prominent CTA)
- [x] Daily login bonus display (stamps/points for consecutive logins)
- [x] Login bonus streak animation

## Phase 4: Visual Progress Tracker
- [x] Full 6-month lesson grid (completed vs remaining)
- [x] Milestone badges at key journey points
- [x] Progress stats (lessons completed, streak, days remaining)

## Phase 5: Lesson Detail Page
- [x] Video player section (embed/iframe support)
- [x] Journaling prompt section with text input
- [x] Speaking practice: browser audio recording
- [x] Speech-to-text transcription via Whisper API
- [x] LLM personalized coaching feedback on pronunciation/expression
- [x] Mark lesson as complete

## Phase 6: Q&A / Community Page
- [x] Post questions (title + body)
- [x] Answer questions (threaded replies)
- [x] Mark best answer
- [x] Like/upvote questions and answers

## Phase 7: Admin Panel
- [x] Member list with subscription status
- [x] Toggle individual subscription active/revoked
- [x] View member progress across course
- [x] Lesson management (seed lessons via admin panel)

## Phase 8: Notifications
- [x] In-app notification bell with unread count
- [x] Daily login bonus reminder notifications
- [x] New lesson availability alerts
- [x] Payment failure alerts (via Stripe webhook)

## Phase 9: Design & Polish
- [x] Pride/LGBT+ rainbow gradient theme throughout
- [x] Elegant premium typography (Google Fonts)
- [x] Responsive layout (mobile + desktop)
- [x] Smooth animations and micro-interactions
- [x] Empty states and loading skeletons

## Phase 10: Tests & Delivery
- [x] Vitest unit tests for auth, stripe webhook, progress logic (17 tests passing)
- [x] Final checkpoint and delivery

## Phase 2 — Major Redesign & New Features

- [x] Upload SO ENGLISH! logo and slide background images to CDN
- [x] Redesign global CSS: warm oil-painting sunrise palette (peach/coral/sky/lavender)
- [x] Mobile-first bottom tab navigation (ホーム/レッスン/スケジュール/メッセージ/マイページ)
- [x] Japanese UI labels throughout
- [x] Redesign Login page with sunrise background
- [x] Redesign Dashboard with warm theme and SO ENGLISH logo
- [x] Lesson page: Day-1 textbook faithful layout (知識/L&R/Idea/Master markers, Quizlet, 動画, ジャーナリング, 音読WPM)
- [x] Audio player with 3-sec skip back/forward and configurable skip seconds
- [x] Annual schedule page (年間スケジュール)
- [x] Messages page (メッセージ) with instructor-to-member messaging
- [ ] Archive system: cohort ends → move to archive with separate password
- [x] Admin: easy lesson add/edit/publish with rich fields
- [x] Admin: listLessons procedure (paginated, all fields + publish status)
- [x] Admin: createLesson + updateLesson procedures (create/update individual lesson)
- [x] Admin: deleteLesson procedure (hard delete)
- [x] Admin: togglePublish procedure (publish/unpublish)
- [x] Admin UI: Tabs (Members + Lessons)
- [x] Admin UI: Lessons table with week/day/title/published columns
- [x] Admin UI: Add/Edit lesson dialog form
- [x] Admin UI: Publish toggle per lesson row
- [x] SO ENGLISH! logo in header/navigation
- [x] Slide-inspired card designs with sunrise imagery
