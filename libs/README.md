# Frontend libraries

Following Insu and Nestar, reusable UI lives under `components/common`, `components/layout`, and feature folders such as `components/homepage`. Route files in `app` compose these components.

`types` holds public frontend/API types. `hooks` and `enums` reserve the familiar categories for features that need them; no placeholder runtime functionality is implemented there. Server-only HTTP transport lives in the root `api` directory. Styles and static assets live in root `styles` and `public`.
